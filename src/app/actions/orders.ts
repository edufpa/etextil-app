"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSessionCompanyId } from "@/lib/company";
import { logActivity } from "@/lib/logger";

function deriveOrderStatus(currentStatus: string, totalDelivered: number, totalQuantity: number) {
  if (currentStatus === "CERRADO" || currentStatus === "CANCELADO") return currentStatus;
  if (totalDelivered >= totalQuantity) return "ENTREGADO";
  if (totalDelivered > 0) return "PARCIALMENTE ENTREGADO";
  return "PENDIENTE";
}

async function generateNextOrderNumber(tx: Prisma.TransactionClient, companyId: number | null) {
  const where = companyId ? { company_id: companyId } : { company_id: null };
  const orders = await tx.order.findMany({ select: { orderNumber: true }, where });
  const maxCorrelative = orders.reduce((max, o) => {
    const match = /^NP0*(\d+)$/i.exec(o.orderNumber || "");
    const value = match ? Number(match[1]) : 0;
    return value > max ? value : max;
  }, 0);
  return `NP${maxCorrelative + 1}`;
}

export async function createOrder(data: {
  client_id: number;
  date: Date;
  garment: string;
  color: string;
  totalQuantity: number;
  notes?: string;
  sizes: { size: string; quantity: number }[];
  services: {
    service_id: number;
    requiredQuantity: number;
    notes?: string;
    sizeSplit?: { size: string; quantity: number }[];
  }[];
}) {
  try {
    const sumSizes = data.sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (sumSizes !== data.totalQuantity) {
      return { error: "La suma de las tallas no coincide con la cantidad total." };
    }

    const companyId = await getSessionCompanyId();
    let created = false;
    let attempts = 0;
    while (!created && attempts < 5) {
      attempts += 1;
      try {
        await prisma.$transaction(async (tx) => {
          const orderNumber = await generateNextOrderNumber(tx, companyId);
          const order = await tx.order.create({
            data: {
              client_id: data.client_id,
              orderNumber,
              date: data.date,
              garment: data.garment,
              color: data.color,
              totalQuantity: data.totalQuantity,
              notes: data.notes,
              status: "PENDIENTE",
              ...(companyId ? { company_id: companyId } : {}),
            },
          });

          if (data.sizes.length > 0) {
            await tx.orderSize.createMany({
              data: data.sizes.map((s) => ({ order_id: order.id, size: s.size, quantity: s.quantity })),
            });
          }

          if (data.services.length > 0) {
            for (const s of data.services) {
              // For trackBySize services, calculate requiredQuantity from sizeSplit sum
              const reqQty =
                s.sizeSplit && s.sizeSplit.length > 0
                  ? s.sizeSplit.reduce((a, sz) => a + sz.quantity, 0)
                  : s.requiredQuantity;

              const orderSvc = await tx.orderService.create({
                data: {
                  order_id: order.id,
                  service_id: s.service_id,
                  requiredQuantity: reqQty,
                  notes: s.notes,
                },
              });

              if (s.sizeSplit && s.sizeSplit.length > 0) {
                await tx.orderServiceSize.createMany({
                  data: s.sizeSplit
                    .filter((sz) => sz.quantity > 0)
                    .map((sz) => ({
                      orderService_id: orderSvc.id,
                      size: sz.size,
                      quantity: sz.quantity,
                    })),
                });
              }
            }
          }
        });
        created = true;
      } catch (error: any) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
      }
    }

    revalidatePath("/admin/orders");
    await logActivity("CREATE_ORDER", `Pedido creado: ${data.garment} ${data.color}, ${data.totalQuantity} u.`);
    return { success: true };
  } catch (error) {
    console.error("Error creating order:", error);
    return { error: "Error al crear el pedido. Verifica el número de pedido único." };
  }
}

export async function deleteOrder(orderId: number) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, garment: true, totalQuantity: true },
    });
    if (!order) return { error: "Pedido no encontrado." };

    await prisma.order.delete({ where: { id: orderId } });

    await logActivity("DELETE_ORDER", `Pedido eliminado: ${order.orderNumber} — ${order.garment}, ${order.totalQuantity} u.`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Error al eliminar el pedido." };
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
          deliveries: {
            orderBy: { date: "desc" },
            include: { incomings: { orderBy: { date: "desc" } } },
          },
          sizeSplit: { orderBy: { size: "asc" } },
          assignments: {
            include: {
              provider: true,
              receptions: { orderBy: { receivedDate: "desc" } },
            },
            orderBy: { sentDate: "desc" },
          },
        },
      },
      guides: { include: { guide: true } },
    },
  });

  if (!order) return null;

  const totalDelivered = order.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0);
  const pending = order.totalQuantity - totalDelivered;
  const status = deriveOrderStatus(order.status, totalDelivered, order.totalQuantity);

  return { ...order, status, totalDelivered, pending };
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
    services: {
      service_id: number;
      requiredQuantity: number;
      notes?: string;
      provider_id?: number | null;
      sizeSplit?: { size: string; quantity: number }[];
    }[];
  }
) {
  try {
    const sumSizes = data.sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (sumSizes !== data.totalQuantity) {
      return { error: `La suma de las tallas (${sumSizes}) no coincide con la cantidad total (${data.totalQuantity}).` };
    }

    await prisma.$transaction(async (tx) => {
      const existingGuides = await tx.guideDetail.findMany({ where: { order_id: orderId } });
      const totalDelivered = existingGuides.reduce((acc, g) => acc + g.deliveredQuantity, 0);

      if (data.totalQuantity < totalDelivered) {
        throw new Error(
          `No se puede reducir el total a ${data.totalQuantity}. Ya se han despachado ${totalDelivered} unidades.`
        );
      }

      await tx.order.update({
        where: { id: orderId },
        data: { date: data.date, garment: data.garment, color: data.color, totalQuantity: data.totalQuantity, notes: data.notes },
      });

      await tx.orderSize.deleteMany({ where: { order_id: orderId } });
      if (data.sizes.length > 0) {
        await tx.orderSize.createMany({
          data: data.sizes.map((s) => ({ order_id: orderId, size: s.size, quantity: s.quantity })),
        });
      }

      // Delete old services (cascade deletes sizeSplit and assignments)
      await tx.orderService.deleteMany({ where: { order_id: orderId } });
      if (data.services.length > 0) {
        for (const s of data.services) {
          const reqQty =
            s.sizeSplit && s.sizeSplit.length > 0
              ? s.sizeSplit.reduce((a, sz) => a + sz.quantity, 0)
              : s.requiredQuantity;

          const orderSvc = await tx.orderService.create({
            data: {
              order_id: orderId,
              service_id: s.service_id,
              requiredQuantity: reqQty,
              notes: s.notes,
              provider_id: s.provider_id ?? null,
            },
          });

          if (s.sizeSplit && s.sizeSplit.length > 0) {
            await tx.orderServiceSize.createMany({
              data: s.sizeSplit
                .filter((sz) => sz.quantity > 0)
                .map((sz) => ({
                  orderService_id: orderSvc.id,
                  size: sz.size,
                  quantity: sz.quantity,
                })),
            });
          }
        }
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
