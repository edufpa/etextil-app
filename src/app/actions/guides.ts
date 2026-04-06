"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createGuide(data: {
  sunatNumber: string;
  date: Date;
  notes?: string;
  details: { order_id: number; size: string; deliveredQuantity: number }[];
}) {
  try {
    if (data.details.length === 0) {
      return { error: "La guía debe contener al menos un ítem con cantidad > 0." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Crear la Guía
      const guide = await tx.guide.create({
        data: {
          sunatNumber: data.sunatNumber,
          date: data.date,
          notes: data.notes,
        },
      });

      // Agrupar detalles por pedido para validar y actualizar estado
      const byOrder = new Map<number, number>();

      // 2. Por cada ítem (order+size), validar saldo y crear GuideDetail
      for (const item of data.details) {
        // Obtener entregas previas de esta talla en este pedido
        const previousForSize = await tx.guideDetail.aggregate({
          where: { order_id: item.order_id, size: item.size },
          _sum: { deliveredQuantity: true },
        });
        const alreadyDeliveredForSize = previousForSize._sum.deliveredQuantity || 0;

        // Obtener la cantidad pedida de esta talla
        const orderSize = await tx.orderSize.findFirst({
          where: { order_id: item.order_id, size: item.size },
        });

        if (!orderSize) throw new Error(`No se encontró la talla "${item.size}" en el pedido.`);

        const pendingForSize = orderSize.quantity - alreadyDeliveredForSize;
        if (item.deliveredQuantity > pendingForSize) {
          throw new Error(`Talla ${item.size}: saldo disponible es ${pendingForSize}, no se puede entregar ${item.deliveredQuantity}.`);
        }

        await tx.guideDetail.create({
          data: {
            guide_id: guide.id,
            order_id: item.order_id,
            size: item.size,
            deliveredQuantity: item.deliveredQuantity,
          },
        });

        byOrder.set(item.order_id, (byOrder.get(item.order_id) || 0) + item.deliveredQuantity);
      }

      // 3. Actualizar estado de cada pedido afectado
      for (const [orderId] of byOrder) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { guides: true },
        });
        if (!order || order.status === "CERRADO" || order.status === "CANCELADO") continue;

        const totalDelivered = order.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0)
          + (byOrder.get(orderId) || 0);

        let newStatus = order.status;
        if (totalDelivered >= order.totalQuantity) {
          newStatus = "ENTREGADO";
        } else if (totalDelivered > 0) {
          newStatus = "PARCIALMENTE ENTREGADO";
        }

        if (newStatus !== order.status) {
          await tx.order.update({ where: { id: orderId }, data: { status: newStatus } });
        }
      }
    });

    revalidatePath("/admin/guides");
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating guide:", error);
    return { error: error.message || "Error al crear la guía." };
  }
}
