"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";
import { getSessionCompanyId } from "@/lib/company";
import { friendlyError, UserError } from "@/lib/errors";
import { TX_OPTS } from "@/lib/workshop-guard";

export type ReceiveItem = { orderServiceId: number; size: string; quantity: number };

/**
 * Registra en una sola transacción todos los ingresos de un proveedor.
 * Cada item (servicio de OP + talla) se reparte entre las salidas pendientes de esa talla, de la más antigua a la más nueva.
 */
export async function receiveFromProviderBatch(data: { providerId: number; date: string; notes?: string; items: ReceiveItem[] }) {
  try {
    const companyId = await getSessionCompanyId();
    const items = data.items.filter((i) => i.quantity !== 0);
    if (items.length === 0) return { error: "No hay cantidades para registrar." };
    for (const i of items) {
      if (!Number.isInteger(i.quantity) || i.quantity < 0) return { error: "Las cantidades deben ser números enteros positivos." };
    }
    const date = new Date(`${data.date}T12:00:00`);
    if (isNaN(date.getTime())) return { error: "Fecha inválida." };

    const result = await prisma.$transaction(async (tx) => {
      const provider = await tx.provider.findUnique({ where: { id: data.providerId }, select: { id: true, businessName: true, company_id: true } });
      if (!provider || (companyId !== null && provider.company_id !== companyId)) throw new UserError("Proveedor no encontrado.");

      const osIds = [...new Set(items.map((i) => i.orderServiceId))];
      const deliveries = await tx.providerDelivery.findMany({
        where: { provider_id: provider.id, orderService_id: { in: osIds } },
        include: {
          incomings: { select: { quantity: true } },
          orderService: { select: { service: { select: { name: true } }, order: { select: { id: true, orderNumber: true, company_id: true } } } },
        },
        orderBy: [{ date: "asc" }, { id: "asc" }],
      });

      let total = 0;
      const lines: string[] = [];
      const orderIds = new Set<number>();
      for (const it of items) {
        const ds = deliveries.filter((d) => d.orderService_id === it.orderServiceId && (d.size ?? "") === it.size);
        if (ds.length === 0) throw new UserError("Hay una fila que ya no tiene salidas pendientes. Recarga la página.");
        const first = ds[0].orderService;
        if (companyId !== null && first.order.company_id !== companyId) throw new UserError("No tienes acceso a esta OP.");
        const label = `${first.order.orderNumber} · ${first.service.name}${it.size ? ` · talla ${it.size}` : ""}`;
        const pending = ds.reduce((a, d) => a + d.quantity - d.incomings.reduce((s, i) => s + i.quantity, 0), 0);
        if (it.quantity > pending) throw new UserError(`${label}: se quiere recibir ${it.quantity} pero solo hay ${Math.max(0, pending)} pendiente.`);

        let left = it.quantity;
        for (const d of ds) {
          if (left <= 0) break;
          const p = d.quantity - d.incomings.reduce((s, i) => s + i.quantity, 0);
          if (p <= 0) continue;
          const q = Math.min(p, left);
          await tx.providerIncoming.create({ data: { providerDelivery_id: d.id, quantity: q, date, notes: data.notes || null } });
          left -= q;
        }
        total += it.quantity;
        orderIds.add(first.order.id);
        lines.push(`${label}: ${it.quantity}u`);
      }
      return { provider, total, lines, orderIds: [...orderIds] };
    }, TX_OPTS);

    for (const id of result.orderIds) revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/taller");
    revalidatePath("/admin/providers/ops");
    await logActivity("REGISTER_INGRESO", `Ingreso masivo de ${result.provider.businessName}: ${result.total} u — ${result.lines.join("; ")}`.slice(0, 2000));
    return { success: true, total: result.total, count: result.lines.length };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "Error al registrar los ingresos.") };
  }
}
