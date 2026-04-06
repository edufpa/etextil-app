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
      services: {
        include: {
          service: true,
          provider: true,
          deliveries: { orderBy: { date: "desc" } },
        },
      },
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

export async function updateOrder(
  orderId: number,
  data: {
    date: Date;
    garment: string;
    color: string;
    totalQuantity: number;
    notes?: string;
    sizes: { size: string; quantity: number }[];
    services: { service_id: number; requiredQuantity: number; notes?: string; provider_id?: number | null }[];
  }
) {
  try {
    // Validar que la suma de tallas coincide con el total
    const sumSizes = data.sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (sumSizes !== data.totalQuantity) {
      return { error: `La suma de las tallas (${sumSizes}) no coincide con la cantidad total (${data.totalQuantity}).` };
    }

    await prisma.$transaction(async (tx) => {
      // Obtener cuánto ya se ha entregado
      const existingGuides = await tx.guideDetail.findMany({
        where: { order_id: orderId },
      });
      const totalDelivered = existingGuides.reduce((acc, g) => acc + g.deliveredQuantity, 0);

      if (data.totalQuantity < totalDelivered) {
        throw new Error(
          `No se puede reducir el total a ${data.totalQuantity}. Ya se han despachado ${totalDelivered} unidades.`
        );
      }

      // Actualizar datos generales del pedido
      await tx.order.update({
        where: { id: orderId },
        data: {
          date: data.date,
          garment: data.garment,
          color: data.color,
          totalQuantity: data.totalQuantity,
          notes: data.notes,
        },
      });

      // Reemplazar tallas (delete + insert)
      await tx.orderSize.deleteMany({ where: { order_id: orderId } });
      if (data.sizes.length > 0) {
        await tx.orderSize.createMany({
          data: data.sizes.map((s) => ({
            order_id: orderId,
            size: s.size,
            quantity: s.quantity,
          })),
        });
      }

      // Reemplazar servicios (delete + insert)
      await tx.orderService.deleteMany({ where: { order_id: orderId } });
      if (data.services.length > 0) {
        await tx.orderService.createMany({
          data: data.services.map((s) => ({
            order_id: orderId,
            service_id: s.service_id,
            requiredQuantity: s.requiredQuantity,
            notes: s.notes,
            provider_id: s.provider_id ?? null,
          })),
        });
      }
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating order:", error);
    return { error: error.message || "Error al actualizar el pedido." };
  }
}

