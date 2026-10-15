"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";
import { getSessionCompanyId } from "@/lib/company";
import { friendlyError, UserError } from "@/lib/errors";
import { assertDeliveryAccess, createDeliveriesTx, loadPreviousStage, TX_OPTS } from "@/lib/workshop-guard";
import { computeAvailability } from "@/lib/service-orders";

/** Creates one ProviderDelivery per size in a single transaction (validates company, total and per-size caps). */
export async function createProviderDeliveryBatch(data: {
  orderService_id: number;
  provider_id: number;
  date: Date;
  notes?: string;
  sizes: { size: string; quantity: number }[];
}) {
  try {
    const companyId = await getSessionCompanyId();
    const res = await prisma.$transaction((tx) => createDeliveriesTx(tx, companyId, data), TX_OPTS);
    revalidatePath(`/admin/orders/${res.os.order.id}`);
    revalidatePath(`/admin/providers/ops`);
    revalidatePath(`/admin/taller`);
    await logActivity(
      "REGISTER_OP",
      `Salida a taller ${res.provider.businessName} — OP ${res.os.order.orderNumber} · ${res.os.service.name}: ${res.valid.map((s) => `${s.size || "s/t"} ${s.quantity}u`).join(", ")}`
    );
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: friendlyError(error, "Error al registrar la salida al taller.") };
  }
}

export async function updateProviderDelivery(id: number, orderId: number, data: {
  quantity: number;
  date: Date;
  notes?: string;
}) {
  try {
    const companyId = await getSessionCompanyId();
    const d = await prisma.$transaction(async (tx) => {
      const d = await assertDeliveryAccess(tx, id, companyId);
      if (!Number.isInteger(data.quantity) || data.quantity <= 0) throw new UserError("La cantidad debe ser un entero mayor a 0.");
      const alreadyIn = d.incomings.reduce((s, i) => s + i.quantity, 0);
      if (data.quantity < alreadyIn) {
        throw new UserError(`Ya se ingresaron ${alreadyIn} u. No se puede reducir a ${data.quantity}.`);
      }
      const os = d.orderService;
      // Disponible sin contar esta salida: tope por OP/etapa y, si hay secuencia, lo recibido de la etapa anterior.
      const prev = await loadPreviousStage(tx, os.order.id, os);
      const others = { ...os, deliveries: os.deliveries.filter((x) => x.id !== id) };
      const avail = computeAvailability(others, os.order.sizes, prev);
      if (data.quantity > avail.total) {
        throw new UserError(`${os.service.name}: máximo permitido para esta salida es ${avail.total} u${prev ? ` (según lo recibido de ${prev.service.name})` : ""}.`);
      }
      if (d.size) {
        const left = avail.bySize[d.size];
        if (left !== undefined && data.quantity > left) {
          throw new UserError(`${os.service.name}, talla ${d.size}: máximo permitido para esta salida es ${left} u.`);
        }
      }
      await tx.providerDelivery.update({ where: { id }, data: { quantity: data.quantity, date: data.date, notes: data.notes } });
      return d;
    }, TX_OPTS);
    revalidatePath(`/admin/orders/${d.orderService.order.id}`);
    revalidatePath(`/admin/providers/ops`);
    revalidatePath(`/admin/taller`);
    await logActivity("UPDATE_OP", `Salida #${id} (OP ${d.orderService.order.orderNumber}) actualizada: ${d.quantity} → ${data.quantity} u`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "Error al actualizar la salida al taller.") };
  }
}

export async function deleteProviderDelivery(id: number, orderId: number) {
  try {
    const companyId = await getSessionCompanyId();
    const d = await prisma.$transaction(async (tx) => {
      const d = await assertDeliveryAccess(tx, id, companyId);
      if (d.incomings.length > 0) {
        throw new UserError("No se puede eliminar: esta salida ya tiene ingresos. Elimina primero los ingresos.");
      }
      await tx.providerDelivery.delete({ where: { id } });
      // Si la OS se quedó sin líneas, queda anulada (no se borra: conserva su número).
      if (d.serviceOrder_id) {
        const left = await tx.providerDelivery.count({ where: { serviceOrder_id: d.serviceOrder_id } });
        if (left === 0) {
          await tx.serviceOrder.update({ where: { id: d.serviceOrder_id }, data: { voidedAt: new Date(), voidNote: "Se eliminaron todas sus líneas." } });
        }
      }
      return d;
    });
    revalidatePath(`/admin/orders/${d.orderService.order.id}`);
    revalidatePath(`/admin/providers/ops`);
    revalidatePath(`/admin/taller`);
    await logActivity("DELETE_OP", `Salida #${id} eliminada (OP ${d.orderService.order.orderNumber} · ${d.orderService.service.name}${d.size ? ` · ${d.size}` : ""}: ${d.quantity} u)`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: friendlyError(error, "Error al eliminar la salida.") };
  }
}
