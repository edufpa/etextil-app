"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProviderDelivery(data: {
  orderService_id: number;
  provider_id: number;
  date: Date;
  quantity: number;
  notes?: string;
}) {
  try {
    // Validar que el orderService existe e incluir entregas previas
    const orderService = await prisma.orderService.findUnique({
      where: { id: data.orderService_id },
      include: {
        deliveries: { select: { quantity: true } },
        order: { select: { id: true } },
      },
    });

    if (!orderService) return { error: "Servicio del pedido no encontrado." };

    const alreadyDelivered = orderService.deliveries.reduce((s, d) => s + d.quantity, 0);
    const remaining = orderService.requiredQuantity - alreadyDelivered;

    if (data.quantity > remaining) {
      return { error: `Saldo disponible: ${remaining}. No se puede registrar ${data.quantity}.` };
    }
    if (data.quantity <= 0) return { error: "La cantidad debe ser mayor a 0." };

    await prisma.providerDelivery.create({ data });

    revalidatePath(`/admin/orders/${orderService.order.id}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || "Error al registrar la entrega." };
  }
}

export async function deleteProviderDelivery(id: number, orderId: number) {
  try {
    await prisma.providerDelivery.delete({ where: { id } });
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    return { error: "Error al eliminar la entrega." };
  }
}

export async function getDashboardMatrix(days: number = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const [deliveries, guides] = await Promise.all([
    prisma.providerDelivery.findMany({
      where: { date: { gte: since } },
      include: {
        orderService: { include: { service: { select: { name: true } } } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.guideDetail.findMany({
      where: { guide: { date: { gte: since }, status: "ACTIVA" } },
      include: { guide: { select: { date: true } } },
      orderBy: { guide: { date: "asc" } },
    }),
  ]);

  return { deliveries, guides };
}
