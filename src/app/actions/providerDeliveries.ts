"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";
import { getSessionCompanyId } from "@/lib/company";
import { friendlyError, UserError } from "@/lib/errors";
import { assertDeliveryAccess, createDeliveriesTx, requiredBySize, TX_OPTS } from "@/lib/workshop-guard";

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
      const othersTotal = os.deliveries.filter((x) => x.id !== id).reduce((a, x) => a + x.quantity, 0);
      if (othersTotal + data.quantity > os.requiredQuantity) {
        throw new UserError(`${os.service.name}: máximo permitido para esta salida es ${os.requiredQuantity - othersTotal} u.`);
      }
      if (d.size) {
        const req = requiredBySize(os).get(d.size);
        if (req !== undefined) {
          const othersSize = os.deliveries.filter((x) => x.id !== id && x.size === d.size).reduce((a, x) => a + x.quantity, 0);
          if (othersSize + data.quantity > req) {
            throw new UserError(`${os.service.name}, talla ${d.size}: máximo permitido para esta salida es ${req - othersSize} u.`);
          }
        }
      }
      await tx.providerDelivery.update({ where: { id }, data });
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
