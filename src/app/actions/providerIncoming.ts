"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";
import { getSessionCompanyId } from "@/lib/company";
import { friendlyError } from "@/lib/errors";
import { assertIncomingAccess, createIncomingTx, TX_OPTS } from "@/lib/workshop-guard";

export async function createProviderIncoming(data: {
  providerDelivery_id: number;
  orderId: number;
  quantity: number;
  date: Date;
  notes?: string;
}) {
  try {
    const companyId = await getSessionCompanyId();
    const delivery = await prisma.$transaction(
      (tx) => createIncomingTx(tx, companyId, { providerDelivery_id: data.providerDelivery_id, quantity: data.quantity, date: data.date, notes: data.notes }),
      TX_OPTS
    );
    const orderId = delivery.orderService.order.id;
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/providers`);
    revalidatePath(`/admin/providers/ops`);
    revalidatePath(`/admin/taller`);
    await logActivity(
      "REGISTER_INGRESO",
      `Ingreso OP ${delivery.orderService.order.orderNumber} · ${delivery.orderService.service.name}${delivery.size ? ` · ${delivery.size}` : ""}: ${data.quantity} u.`
    );
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "Error al registrar el ingreso.") };
  }
}

export async function deleteProviderIncoming(id: number, orderId: number) {
  try {
    const companyId = await getSessionCompanyId();
    const inc = await prisma.$transaction(async (tx) => {
      const i = await assertIncomingAccess(tx, id, companyId);
      await tx.providerIncoming.delete({ where: { id } });
      return i;
    });
    const oid = inc.providerDelivery.orderService.order.id;
    revalidatePath(`/admin/orders/${oid}`);
    revalidatePath(`/admin/providers/ops`);
    revalidatePath(`/admin/taller`);
    await logActivity("DELETE_INGRESO", `Ingreso #${id} eliminado (${inc.quantity} u, OP #${oid})`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "Error al eliminar el ingreso.") };
  }
}
