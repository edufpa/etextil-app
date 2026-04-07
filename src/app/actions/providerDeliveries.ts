"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";

export async function createProviderDelivery(data: {
  orderService_id: number;
  provider_id: number;
  size?: string | null;
  date: Date;
  quantity: number;
  notes?: string;
}) {
  try {
    const orderService = await prisma.orderService.findUnique({
      where: { id: data.orderService_id },
      include: {
        service: { select: { trackBySize: true } },
        deliveries: { select: { quantity: true, size: true } },
        order: { select: { id: true } },
      },
    });

    if (!orderService) return { error: "Servicio del pedido no encontrado." };
    if (data.quantity <= 0) return { error: "La cantidad debe ser mayor a 0." };

    const alreadyDelivered = orderService.deliveries.reduce((s, d) => s + d.quantity, 0);
    const remaining = orderService.requiredQuantity - alreadyDelivered;

    if (data.quantity > remaining) {
      return { error: `Saldo disponible: ${remaining}. No se puede registrar ${data.quantity}.` };
    }

    await prisma.providerDelivery.create({ data });

    revalidatePath(`/admin/orders/${orderService.order.id}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || "Error al registrar la entrega." };
  }
}

/** Creates one ProviderDelivery per size in a single transaction. */
export async function createProviderDeliveryBatch(data: {
  orderService_id: number;
  provider_id: number;
  date: Date;
  notes?: string;
  sizes: { size: string; quantity: number }[];
}) {
  try {
    const orderService = await prisma.orderService.findUnique({
      where: { id: data.orderService_id },
      include: {
        deliveries: { select: { quantity: true } },
        order: { select: { id: true } },
      },
    });

    if (!orderService) return { error: "Servicio del pedido no encontrado." };

    const validSizes = data.sizes.filter((s) => s.quantity > 0);
    if (validSizes.length === 0) return { error: "Ingresa al menos una cantidad mayor a 0." };

    const totalBatch = validSizes.reduce((s, sz) => s + sz.quantity, 0);
    const alreadyDelivered = orderService.deliveries.reduce((s, d) => s + d.quantity, 0);
    const remaining = orderService.requiredQuantity - alreadyDelivered;

    if (totalBatch > remaining) {
      return { error: `Total del lote (${totalBatch}) supera el saldo disponible (${remaining}).` };
    }

    await prisma.$transaction(
      validSizes.map((sz) =>
        prisma.providerDelivery.create({
          data: {
            orderService_id: data.orderService_id,
            provider_id: data.provider_id,
            size: sz.size,
            date: data.date,
            quantity: sz.quantity,
            notes: data.notes,
          },
        })
      )
    );

    revalidatePath(`/admin/orders/${orderService.order.id}`);
    await logActivity("REGISTER_OP", `OP creada para pedido #${orderService.order.id}: ${validSizes.map(s => `${s.size} ${s.quantity}u`).join(", ")}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || "Error al registrar el lote." };
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
