"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProviderIncoming(data: {
  providerDelivery_id: number;
  orderId: number;
  quantity: number;
  date: Date;
  notes?: string;
}) {
  try {
    if (data.quantity <= 0) return { error: "La cantidad debe ser mayor a 0." };

    const delivery = await prisma.providerDelivery.findUnique({
      where: { id: data.providerDelivery_id },
      include: { incomings: { select: { quantity: true } } },
    });

    if (!delivery) return { error: "OP no encontrada." };

    const alreadyIncoming = delivery.incomings.reduce((s, i) => s + i.quantity, 0);
    const remaining = delivery.quantity - alreadyIncoming;

    if (data.quantity > remaining) {
      return { error: `Máximo a recepcionar: ${remaining}` };
    }

    await prisma.providerIncoming.create({
      data: {
        providerDelivery_id: data.providerDelivery_id,
        quantity: data.quantity,
        date: data.date,
        notes: data.notes,
      },
    });

    revalidatePath(`/admin/orders/${data.orderId}`);
    revalidatePath(`/admin/providers`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Error al registrar el ingreso." };
  }
}

export async function deleteProviderIncoming(id: number, orderId: number) {
  try {
    await prisma.providerIncoming.delete({ where: { id } });
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch {
    return { error: "Error al eliminar el ingreso." };
  }
}
