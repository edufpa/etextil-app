"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSessionCompanyId } from "@/lib/company";
import { logActivity } from "@/lib/logger";
import { attachDefaultServicesToOrder } from "@/lib/default-op-services";
import { friendlyError, UserError } from "@/lib/errors";

/** Throws UserError if the OP doesn't exist or belongs to another company. */
async function assertOrderAccess(orderId: number) {
  const companyId = await getSessionCompanyId();
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { company_id: true } });
  if (!o || (companyId !== null && o.company_id !== companyId)) throw new UserError("OP no encontrada.");
}

/** Throws if the order service doesn't belong to the given OP (and company). */
async function assertOrderServiceAccess(orderServiceId: number, orderId: number) {
  await assertOrderAccess(orderId);
  const os = await prisma.orderService.findUnique({ where: { id: orderServiceId }, select: { order_id: true } });
  if (!os || os.order_id !== orderId) throw new UserError("Servicio no encontrado en esta OP.");
}

function deriveOrderStatus(currentStatus: string, totalDelivered: number, totalQuantity: number, sentToWorkshop = 0) {
  if (currentStatus === "CERRADO") return "ENTREGADO";
  if (currentStatus === "CANCELADO" || currentStatus === "ENTREGADO") return currentStatus;
  if (totalDelivered >= totalQuantity) return "ENTREGADO";
  if (totalDelivered > 0) return "PARCIALMENTE ENTREGADO";
  if (sentToWorkshop > 0) return "EN PROCESO";
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

          if (data.services.length === 0) {
            await attachDefaultServicesToOrder(tx, order.id, data.totalQuantity, { createMissing: true });
          } else {
            for (const [stageIdx, s] of data.services.entries()) {
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
                  sequence: stageIdx + 1,
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
    await assertOrderAccess(orderId);
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
    return { error: friendlyError(e, "Error al eliminar la OP.") };
  }
}

export async function getOrderSummary(orderId: number) {
  const sessionCompanyId = await getSessionCompanyId();
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
        },
      },
      guides: { include: { guide: true } },
    },
  });

  if (!order) return null;
  if (sessionCompanyId !== null && order.company_id !== sessionCompanyId) return null;

  const totalDelivered = order.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0);
  const sentToWorkshop = order.services.reduce((acc, svc) =>
    acc + svc.deliveries.reduce((a, d) => a + d.quantity, 0), 0);
  const pending = order.totalQuantity - totalDelivered;
  const status = deriveOrderStatus(order.status, totalDelivered, order.totalQuantity, sentToWorkshop);

  return { ...order, status, totalDelivered, pending };
}

export async function closeOrderManually(orderId: number) {
  try {
    await assertOrderAccess(orderId);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "ENTREGADO" },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: friendlyError(error, "Error al actualizar la OP.") };
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
    await assertOrderAccess(orderId);
    const sumSizes = data.sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (sumSizes !== data.totalQuantity) {
      return { error: `La suma de las tallas (${sumSizes}) no coincide con la cantidad total (${data.totalQuantity}).` };
    }

    await prisma.$transaction(async (tx) => {
      const existingGuides = await tx.guideDetail.findMany({ where: { order_id: orderId } });
      const totalDelivered = existingGuides.reduce((acc, g) => acc + g.deliveredQuantity, 0);

      if (data.totalQuantity < totalDelivered) {
        throw new UserError(
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

      // Update services IN PLACE: never delete services that have movements (salidas/ingresos).
      const existingServices = await tx.orderService.findMany({
        where: { order_id: orderId },
        include: {
          service: { select: { name: true } },
          deliveries: { select: { quantity: true, size: true } },
          sizeSplit: true,
        },
      });
      const incomingIds = new Set(data.services.map((s) => s.service_id));

      for (const ex of existingServices) {
        if (!incomingIds.has(ex.service_id)) {
          if (ex.deliveries.length > 0) {
            throw new UserError(
              `No se puede quitar el servicio "${ex.service.name}": ya tiene salidas al taller registradas. Elimina primero sus salidas e ingresos.`
            );
          }
          await tx.orderService.delete({ where: { id: ex.id } });
        }
      }

      const newSizeMap = new Map(data.sizes.map((s) => [s.size, s.quantity]));
      let nextSequence = Math.max(0, ...existingServices.map((e) => e.sequence)) + 1;

      for (const s of data.services) {
        const reqQty =
          s.sizeSplit && s.sizeSplit.length > 0
            ? s.sizeSplit.reduce((a, sz) => a + sz.quantity, 0)
            : s.requiredQuantity;
        const ex = existingServices.find((e) => e.service_id === s.service_id);

        if (ex) {
          const sent = ex.deliveries.reduce((a, d) => a + d.quantity, 0);
          if (reqQty < sent) {
            throw new UserError(`"${ex.service.name}": la cantidad requerida (${reqQty}) no puede ser menor a lo ya enviado al taller (${sent}).`);
          }
          // Per-size: delivered per size must still fit the new sizes
          const sentBySize = new Map<string, number>();
          for (const d of ex.deliveries) if (d.size) sentBySize.set(d.size, (sentBySize.get(d.size) ?? 0) + d.quantity);
          const reqBySize = s.sizeSplit && s.sizeSplit.length > 0 ? new Map(s.sizeSplit.map((x) => [x.size, x.quantity])) : newSizeMap;
          for (const [size, q] of sentBySize) {
            const r = reqBySize.get(size) ?? 0;
            if (q > r) {
              throw new UserError(`"${ex.service.name}", talla ${size}: ya se enviaron ${q} u al taller; la nueva cantidad (${r}) no puede ser menor.`);
            }
          }
          await tx.orderService.update({
            where: { id: ex.id },
            data: {
              requiredQuantity: reqQty,
              notes: s.notes,
              // Preserve the assigned provider unless a new one is explicitly sent
              provider_id: s.provider_id !== undefined && s.provider_id !== null ? s.provider_id : ex.provider_id,
            },
          });
          if (s.sizeSplit && s.sizeSplit.length > 0) {
            await tx.orderServiceSize.deleteMany({ where: { orderService_id: ex.id } });
            await tx.orderServiceSize.createMany({
              data: s.sizeSplit.filter((sz) => sz.quantity > 0).map((sz) => ({ orderService_id: ex.id, size: sz.size, quantity: sz.quantity })),
            });
          }
        } else {
          const orderSvc = await tx.orderService.create({
            data: {
              order_id: orderId,
              service_id: s.service_id,
              requiredQuantity: reqQty,
              notes: s.notes,
              provider_id: s.provider_id ?? null,
              sequence: nextSequence++,
            },
          });
          if (s.sizeSplit && s.sizeSplit.length > 0) {
            await tx.orderServiceSize.createMany({
              data: s.sizeSplit.filter((sz) => sz.quantity > 0).map((sz) => ({ orderService_id: orderSvc.id, size: sz.size, quantity: sz.quantity })),
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
    return { error: friendlyError(error, "Error al actualizar la OP.") };
  }
}

export async function adjustOrderServiceQty(
  orderServiceId: number,
  orderId: number,
  newQty: number
) {
  try {
    await assertOrderServiceAccess(orderServiceId, orderId);
    const svc = await prisma.orderService.findUnique({
      where: { id: orderServiceId },
      include: { service: { select: { name: true } }, deliveries: { select: { quantity: true } } },
    });
    if (!svc) return { error: "Servicio no encontrado." };

    const totalSent = svc.deliveries.reduce((a, d) => a + d.quantity, 0);
    if (newQty < totalSent) {
      return { error: `No puede ser menor que lo ya enviado al taller (${totalSent} u).` };
    }
    if (newQty < 1) return { error: "Debe ser al menos 1." };

    await prisma.orderService.update({
      where: { id: orderServiceId },
      data: { requiredQuantity: newQty },
    });

    await logActivity(
      "ADJUST_SERVICE_QTY",
      `Reajuste servicio "${svc.service.name}" — Pedido #${orderId}: ${svc.requiredQuantity} → ${newQty} u.`
    );
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (e: any) {
    return { error: friendlyError(e, "Error al reajustar.") };
  }
}

export async function ensureDefaultOrderServices(orderId: number) {
  try {
    await assertOrderAccess(orderId);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { totalQuantity: true, status: true },
    });
    if (!order) return { error: "OP no encontrada." };
    if (["ENTREGADO", "CERRADO", "CANCELADO"].includes(order.status)) {
      return { error: "No se pueden modificar servicios de una OP cerrada." };
    }

    await prisma.$transaction(async (tx) => {
      await attachDefaultServicesToOrder(tx, orderId, order.totalQuantity, { createMissing: true });
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/providers/ops");
    return { success: true };
  } catch (e: any) {
    return { error: friendlyError(e, "Error al asignar servicios.") };
  }
}

export async function addOrderService(
  orderId: number,
  serviceId: number,
  requiredQuantity: number
) {
  try {
    await assertOrderAccess(orderId);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { totalQuantity: true, status: true },
    });
    if (!order) return { error: "OP no encontrada." };
    if (["ENTREGADO", "CERRADO", "CANCELADO"].includes(order.status)) {
      return { error: "No se pueden agregar servicios a una OP cerrada." };
    }

    const existing = await prisma.orderService.findFirst({
      where: { order_id: orderId, service_id: serviceId },
    });
    if (existing) return { error: "Este servicio ya está asignado a la OP." };

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.status) return { error: "Servicio no encontrado." };

    const qty = requiredQuantity > 0 ? requiredQuantity : order.totalQuantity;
    if (qty < 1) return { error: "La cantidad debe ser al menos 1." };

    const last = await prisma.orderService.aggregate({ where: { order_id: orderId }, _max: { sequence: true } });
    await prisma.orderService.create({
      data: { order_id: orderId, service_id: serviceId, requiredQuantity: qty, sequence: (last._max.sequence ?? 0) + 1 },
    });

    await logActivity("ADD_ORDER_SERVICE", `Servicio "${service.name}" agregado a OP #${orderId} (${qty} u.)`);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/providers/ops");
    return { success: true };
  } catch (e: any) {
    return { error: friendlyError(e, "Error al agregar servicio.") };
  }
}

export async function removeOrderService(orderServiceId: number, orderId: number) {
  try {
    await assertOrderServiceAccess(orderServiceId, orderId);
    const svc = await prisma.orderService.findUnique({
      where: { id: orderServiceId },
      include: {
        service: { select: { name: true } },
        deliveries: { select: { id: true } },
      },
    });
    if (!svc) return { error: "Servicio no encontrado." };

    if (svc.deliveries.length > 0) {
      return { error: "No se puede quitar: ya tiene envíos al taller registrados." };
    }

    await prisma.orderService.delete({ where: { id: orderServiceId } });
    await logActivity("REMOVE_ORDER_SERVICE", `Servicio "${svc.service.name}" quitado de OP #${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/providers/ops");
    return { success: true };
  } catch (e: any) {
    return { error: friendlyError(e, "Error al quitar servicio.") };
  }
}
