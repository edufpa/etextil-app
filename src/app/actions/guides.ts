"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createGuide(data: {
  sunatNumber: string;
  date: Date;
  notes?: string;
  details: { order_id: number; deliveredQuantity: number; notes?: string }[];
}) {
  try {
    if (data.details.length === 0) {
      return { error: "La guía debe contener al menos un pedido." };
    }

    // Usar transacción para crear la guía y sus detalles
    await prisma.$transaction(async (tx) => {
      // 1. Crear la Guía
      const guide = await tx.guide.create({
        data: {
          sunatNumber: data.sunatNumber,
          date: data.date,
          notes: data.notes,
        },
      });

      // 2. Insertar los detalles iterativamente
      for (const item of data.details) {
        // Validar no sobre-entregar
        const order = await tx.order.findUnique({
          where: { id: item.order_id },
          include: { guides: true },
        });

        if (!order) throw new Error(`Pedido ID ${item.order_id} no encontrado`);

        const alreadyDelivered = order.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0);
        const pending = order.totalQuantity - alreadyDelivered;

        if (item.deliveredQuantity > pending) {
          throw new Error(`No se puede entregar de más. Pedido #${order.orderNumber} saldo: ${pending}`);
        }

        // Crear detalle
        await tx.guideDetail.create({
          data: {
            guide_id: guide.id,
            order_id: item.order_id,
            deliveredQuantity: item.deliveredQuantity,
            notes: item.notes,
          },
        });

        // 3. Autómata para re-calcular y actualizar el estado de la Orden
        const newTotalDelivered = alreadyDelivered + item.deliveredQuantity;
        let newStatus = order.status;

        // Solo actualizar si no estaba cerrado o cancelado
        if (order.status !== "CERRADO" && order.status !== "CANCELADO") {
          if (newTotalDelivered >= order.totalQuantity) {
            newStatus = "ENTREGADO";
          } else if (newTotalDelivered > 0) {
            newStatus = "PARCIALMENTE ENTREGADO";
          }
        }

        if (newStatus !== order.status) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: newStatus },
          });
        }
      }
    });

    revalidatePath("/admin/guides");
    revalidatePath("/admin/orders"); // Impacta los estados de órdenes
    return { success: true };
  } catch (error: any) {
    console.error("Error creating guide:", error);
    return { error: error.message || "Error al crear la guía." };
  }
}
