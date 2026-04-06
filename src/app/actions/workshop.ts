"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ---- WORK ASSIGNMENTS (enviar al taller) ----

export async function createWorkAssignment(data: {
  orderService_id: number;
  provider_id: number;
  size: string | null;
  sentQty: number;
  sentDate: Date;
  notes?: string;
}) {
  try {
    const orderService = await (prisma as any).orderService.findUnique({
      where: { id: data.orderService_id },
      include: {
        service: { select: { trackBySize: true } },
        order: { select: { id: true } },
        assignments: { include: { receptions: { select: { receivedQty: true } } } },
        sizeSplit: true,
      },
    });

    if (!orderService) return { error: "Servicio no encontrado." };
    if (data.sentQty <= 0) return { error: "La cantidad debe ser mayor a 0." };
    if (!data.provider_id) return { error: "Debes seleccionar un taller/proveedor." };

    const bySizeEnabled = orderService.service?.trackBySize === true;
    if (bySizeEnabled && !data.size) {
      return { error: "Este servicio requiere talla para registrar el envío." };
    }

    const assignedBySize = new Map<string, number>();
    let totalAssigned = 0;
    for (const a of orderService.assignments ?? []) {
      totalAssigned += a.sentQty;
      if (a.size) {
        assignedBySize.set(a.size, (assignedBySize.get(a.size) ?? 0) + a.sentQty);
      }
    }

    const remainingGlobal = orderService.requiredQuantity - totalAssigned;
    if (data.sentQty > remainingGlobal) {
      return {
        error: `Solo quedan ${remainingGlobal} unidades por asignar para este servicio.`,
      };
    }

    if (bySizeEnabled && data.size) {
      const requiredBySize = (orderService.sizeSplit ?? []).find((x: any) => x.size === data.size)?.quantity ?? 0;
      if (requiredBySize <= 0) {
        return { error: `La talla ${data.size} no está configurada en este servicio.` };
      }

      const alreadyAssignedSize = assignedBySize.get(data.size) ?? 0;
      const remainingSize = requiredBySize - alreadyAssignedSize;
      if (data.sentQty > remainingSize) {
        return {
          error: `Solo quedan ${remainingSize} unidades por asignar en talla ${data.size}.`,
        };
      }
    }

    await (prisma as any).workAssignment.create({
      data: {
        orderService_id: data.orderService_id,
        provider_id: data.provider_id,
        size: data.size,
        sentQty: data.sentQty,
        sentDate: data.sentDate,
        notes: data.notes,
      },
    });

    revalidatePath(`/admin/orders/${orderService.order.id}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || "Error al registrar la asignación." };
  }
}

export async function deleteWorkAssignment(id: number, orderId: number) {
  try {
    await (prisma as any).workAssignment.delete({ where: { id } });
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch {
    return { error: "Error al eliminar la asignación." };
  }
}

// ---- WORK RECEPTIONS (recibir del taller) ----

export async function createWorkReception(data: {
  assignment_id: number;
  orderId: number;
  receivedQty: number;
  receivedDate: Date;
  notes?: string;
}) {
  try {
    if (data.receivedQty <= 0) return { error: "La cantidad debe ser mayor a 0." };

    const assignment = await (prisma as any).workAssignment.findUnique({
      where: { id: data.assignment_id },
      include: { receptions: { select: { receivedQty: true } } },
    });

    if (!assignment) return { error: "Asignación no encontrada." };

    const alreadyReceived = assignment.receptions.reduce(
      (sum: number, r: any) => sum + r.receivedQty,
      0
    );
    const remaining = assignment.sentQty - alreadyReceived;

    if (data.receivedQty > remaining) {
      return {
        error: `Solo quedan ${remaining} prendas pendientes de recepcionar en esta asignación.`,
      };
    }

    await (prisma as any).workReception.create({
      data: {
        assignment_id: data.assignment_id,
        receivedQty: data.receivedQty,
        receivedDate: data.receivedDate,
        notes: data.notes,
      },
    });

    revalidatePath(`/admin/orders/${data.orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || "Error al registrar la recepción." };
  }
}

export async function deleteWorkReception(id: number, orderId: number) {
  try {
    await (prisma as any).workReception.delete({ where: { id } });
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch {
    return { error: "Error al eliminar la recepción." };
  }
}

// ---- REPORTE POR PROVEEDOR ----

export async function getProviderWorkReport(providerId: number) {
  const assignments = await (prisma as any).workAssignment.findMany({
    where: { provider_id: providerId },
    include: {
      orderService: {
        include: {
          service: { select: { name: true, trackBySize: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              garment: true,
              color: true,
              date: true,
              client: { select: { name: true } },
            },
          },
        },
      },
      receptions: { orderBy: { receivedDate: "desc" } },
    },
    orderBy: { sentDate: "desc" },
  });

  return assignments.map((a: any) => {
    const totalReceived = a.receptions.reduce((sum: number, r: any) => sum + r.receivedQty, 0);
    return {
      id: a.id,
      sentQty: a.sentQty,
      sentDate: a.sentDate,
      size: a.size,
      notes: a.notes,
      totalReceived,
      pending: a.sentQty - totalReceived,
      receptions: a.receptions,
      orderService: a.orderService,
    };
  });
}
