"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";
import { getSessionCompanyId } from "@/lib/company";
import { friendlyError, UserError } from "@/lib/errors";
import { assertServiceOrderAccess, createDeliveriesTx, createIncomingTx, loadOrderServiceForDelivery, TX_OPTS } from "@/lib/workshop-guard";
import { withRetry } from "@/lib/retry";
import { formatOsNumber, parseOsNumber } from "@/lib/service-orders";

/**
 * Lock transaccional para numerar OS. Debe ser lo PRIMERO que hace la transacción: en Serializable el snapshot
 * se toma con la primera consulta, así que tomar el lock después no vería la OS que otro acaba de confirmar.
 */
async function lockOsNumbering(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001::int, 1::int)`;
}

/** Siguiente correlativo OS-0001 por empresa (también correcto cuando company_id es null). */
async function nextOsNumber(tx: Prisma.TransactionClient, companyId: number | null) {
  const rows = await tx.serviceOrder.findMany({ where: { company_id: companyId }, select: { osNumber: true } });
  const max = rows.reduce((m, r) => Math.max(m, parseOsNumber(r.osNumber)), 0);
  return formatOsNumber(max + 1);
}

function revalidateOp(orderId: number) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/providers/ops");
  revalidatePath("/admin/taller");
}

/**
 * Emite una Orden de Servicio: UN taller, UN servicio de UNA OP, con líneas por talla.
 * Valida topes, secuencia de etapas y empresa; congela la tarifa del taller (o la indicada) en cada línea.
 */
export async function createServiceOrder(data: {
  orderService_id: number;
  provider_id: number;
  date: Date;
  dueDate?: Date | null;
  notes?: string;
  /** Precio por prenda; si se omite se usa la tarifa del taller para ese servicio. */
  unitPrice?: number | null;
  sizes: { size: string; quantity: number }[];
}) {
  try {
    const companyId = await getSessionCompanyId();
    if (data.unitPrice != null && (!Number.isFinite(data.unitPrice) || data.unitPrice < 0)) {
      throw new UserError("El precio debe ser un número mayor o igual a 0.");
    }
    if (data.dueDate && data.dueDate.getTime() < data.date.getTime()) {
      throw new UserError("La fecha de entrega no puede ser anterior a la fecha de la OS.");
    }

    const res = await withRetry(() => prisma.$transaction(async (tx) => {
      await lockOsNumbering(tx);
      const os = await loadOrderServiceForDelivery(tx, data.orderService_id, companyId);

      let unitPrice = data.unitPrice ?? null;
      if (unitPrice === null) {
        const tariff = await tx.providerServicePrice.findUnique({
          where: { provider_id_service_id: { provider_id: data.provider_id, service_id: os.service_id } },
          select: { price: true },
        });
        unitPrice = tariff ? Number(tariff.price) : null;
      }

      const osNumber = await nextOsNumber(tx, os.order.company_id);
      const header = await tx.serviceOrder.create({
        data: {
          osNumber,
          company_id: os.order.company_id,
          orderService_id: data.orderService_id,
          provider_id: data.provider_id,
          date: data.date,
          dueDate: data.dueDate ?? null,
          notes: data.notes?.trim() || null,
        },
        select: { id: true, osNumber: true },
      });

      const made = await createDeliveriesTx(tx, companyId, {
        orderService_id: data.orderService_id,
        provider_id: data.provider_id,
        date: data.date,
        notes: data.notes,
        sizes: data.sizes,
        serviceOrder_id: header.id,
        unitPrice,
      });
      return { header, unitPrice, made };
    }, TX_OPTS));

    revalidateOp(res.made.os.order.id);
    await logActivity(
      "CREATE_OS",
      `${res.header.osNumber} emitida a ${res.made.provider.businessName} — OP ${res.made.os.order.orderNumber} · ${res.made.os.service.name}: ${res.made.valid.map((s) => `${s.size || "s/t"} ${s.quantity}u`).join(", ")}`
    );
    return {
      success: true as const,
      id: res.header.id,
      osNumber: res.header.osNumber,
      unitPrice: res.unitPrice,
      total: res.unitPrice != null ? res.unitPrice * res.made.totalBatch : null,
    };
  } catch (error) {
    console.error(error);
    return { success: false as const, error: friendlyError(error, "Error al emitir la orden de servicio.") };
  }
}

/** Anula una OS. Solo si no tiene ingresos; libera las cantidades enviadas (borra sus líneas y deja constancia). */
export async function voidServiceOrder(id: number, reason?: string) {
  try {
    const companyId = await getSessionCompanyId();
    const info = await prisma.$transaction(async (tx) => {
      const so = await assertServiceOrderAccess(tx, id, companyId);
      if (so.voidedAt) throw new UserError(`${so.osNumber} ya está anulada.`);
      const received = so.lines.reduce((a, l) => a + l.incomings.reduce((s, i) => s + i.quantity, 0), 0);
      if (received > 0) {
        throw new UserError(`${so.osNumber} ya tiene ingresos registrados. Elimina primero los ingresos para poder anularla.`);
      }
      const summary = so.lines.map((l) => `${l.size || "s/t"} ${l.quantity}u`).join(", ");
      await tx.providerDelivery.deleteMany({ where: { serviceOrder_id: id } });
      await tx.serviceOrder.update({
        where: { id },
        data: { voidedAt: new Date(), voidNote: [reason?.trim(), `Líneas anuladas: ${summary}`].filter(Boolean).join(" — ").slice(0, 500) },
      });
      return so;
    }, TX_OPTS);
    revalidateOp(info.orderService.order.id);
    await logActivity("VOID_OS", `${info.osNumber} anulada (OP ${info.orderService.order.orderNumber})${reason ? `: ${reason}` : ""}`);
    return { success: true as const };
  } catch (error) {
    console.error(error);
    return { success: false as const, error: friendlyError(error, "Error al anular la orden de servicio.") };
  }
}

/**
 * Registra el ingreso de TODO lo pendiente de una OS (el taller devolvió el lote completo).
 * Para recepciones parciales se sigue registrando por línea.
 */
export async function receiveServiceOrder(id: number, data: { date: Date; notes?: string }) {
  try {
    const companyId = await getSessionCompanyId();
    if (isNaN(data.date.getTime())) throw new UserError("Fecha inválida.");
    const res = await prisma.$transaction(async (tx) => {
      const so = await assertServiceOrderAccess(tx, id, companyId);
      if (so.voidedAt) throw new UserError(`${so.osNumber} está anulada.`);
      const lines = await tx.providerDelivery.findMany({
        where: { serviceOrder_id: id },
        select: { id: true, quantity: true, incomings: { select: { quantity: true } } },
        orderBy: { id: "asc" },
      });
      let total = 0;
      for (const l of lines) {
        const pending = l.quantity - l.incomings.reduce((a, i) => a + i.quantity, 0);
        if (pending <= 0) continue;
        await createIncomingTx(tx, companyId, { providerDelivery_id: l.id, quantity: pending, date: data.date, notes: data.notes });
        total += pending;
      }
      if (total === 0) throw new UserError(`${so.osNumber} no tiene cantidades pendientes de recibir.`);
      return { so, total };
    }, TX_OPTS);
    revalidateOp(res.so.orderService.order.id);
    revalidatePath("/admin/providers");
    await logActivity("REGISTER_INGRESO", `Ingreso completo ${res.so.osNumber} (OP ${res.so.orderService.order.orderNumber}): ${res.total} u.`);
    return { success: true as const, total: res.total };
  } catch (error) {
    console.error(error);
    return { success: false as const, error: friendlyError(error, "Error al registrar el ingreso de la OS.") };
  }
}
