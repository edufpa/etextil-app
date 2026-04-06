"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createOrder(data: {
  client_id: number;
  orderNumber: string;
  date: Date;
  garment: string;
  color: string;
  totalQuantity: number;
  notes?: string;
  sizes: { size: string; quantity: number }[];
  services: { service_id: number; requiredQuantity: number; notes?: string }[];
}) {
  try {
    // Validar sumatoria de tallas
    const sumSizes = data.sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (sumSizes !== data.totalQuantity) {
      return { error: "La suma de las tallas no coincide con la cantidad total." };
    }

    // Usar transacción para asegurar atomicidad
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          client_id: data.client_id,
          orderNumber: data.orderNumber,
          date: data.date,
          garment: data.garment,
          color: data.color,
          totalQuantity: data.totalQuantity,
          notes: data.notes,
          status: "PENDIENTE",
        },
      });

      if (data.sizes.length > 0) {
        await tx.orderSize.createMany({
          data: data.sizes.map((s) => ({
            order_id: order.id,
            size: s.size,
            quantity: s.quantity,
          })),
        });
      }

      if (data.services.length > 0) {
        await tx.orderService.createMany({
          data: data.services.map((s) => ({
            order_id: order.id,
            service_id: s.service_id,
            requiredQuantity: s.requiredQuantity,
            notes: s.notes,
          })),
        });
      }
    });

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("Error creating order:", error);
    return { error: "Error al crear el pedido. Verifica el número de pedido único." };
  }
}

export async function getOrderSummary(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      sizes: true,
      services: { include: { service: true } },
      guides: { include: { guide: true } },
    },
  });

  if (!order) return null;

  const totalDelivered = order.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0);
  const pending = order.totalQuantity - totalDelivered;

  return {
    ...order,
    totalDelivered,
    pending,
  };
}

export async function closeOrderManually(orderId: number) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CERRADO" },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Error al cerrar el pedido" };
  }
}
