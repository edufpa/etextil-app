"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSessionCompanyId } from "@/lib/company";
import { logActivity } from "@/lib/logger";
import { attachDefaultServicesToOrder } from "@/lib/default-op-services";
import { friendlyError, UserError } from "@/lib/errors";
import { withRetry } from "@/lib/retry";

async function generateNextPedidoNumber(tx: Prisma.TransactionClient, companyId: number | null) {
  const where = companyId ? { company_id: companyId } : { company_id: null };
  const pedidos = await tx.pedido.findMany({ select: { pedidoNumber: true }, where });
  const maxCorrelative = pedidos.reduce((max, p) => {
    const match = /^PED-?0*(\d+)$/i.exec(p.pedidoNumber || "");
    const value = match ? Number(match[1]) : 0;
    return value > max ? value : max;
  }, 0);
  return `PED-${String(maxCorrelative + 1).padStart(3, "0")}`;
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

export type PedidoItemInput = {
  garment: string;
  color: string;
  sku?: string;
  precioUnitario?: number;
  moneda?: string;
  notes?: string;
  sizes: { size: string; quantity: number; precioUnitario?: number }[];
};

export async function createPedido(data: {
  client_id: number;
  date: Date;
  notes?: string;
  items: PedidoItemInput[];
}) {
  const companyId = await getSessionCompanyId();

  const pedido = await prisma.$transaction(async (tx) => {
    const pedidoNumber = await generateNextPedidoNumber(tx, companyId);

    return tx.pedido.create({
      data: {
        pedidoNumber,
        client_id: data.client_id,
        date: data.date,
        notes: data.notes,
        status: "BORRADOR",
        company_id: companyId,
        items: {
          create: data.items.map((item) => ({
            garment: item.garment,
            color: item.color,
            sku: item.sku ?? null,
            precioUnitario: item.precioUnitario ?? null,
            moneda: item.moneda ?? "PEN",
            notes: item.notes,
            sizes: {
              create: item.sizes.map((s) => ({
                size: s.size,
                quantity: s.quantity,
                precioUnitario: s.precioUnitario ?? null,
              })),
            },
          })),
        },
      },
      select: { id: true, pedidoNumber: true, items: { select: { id: true }, orderBy: { id: "asc" } } },
    });
  });

  await logActivity("CREATE_PEDIDO", `Pedido ${pedido.pedidoNumber} creado`);
  revalidatePath("/admin/pedidos");
  return pedido;
}

export type PedidoResult<T = object> = ({ success: true } & T) | { success: false; error: string };

/**
 * Genera una OP por ítem del pedido. Solo una vez por pedido: un candado transaccional y un cambio
 * de estado atómico impiden duplicar OPs si se pulsa dos veces o dos usuarios lo hacen a la vez.
 */
export async function generarOPs(pedidoId: number): Promise<PedidoResult<{ count: number }>> {
  try {
    const companyId = await getSessionCompanyId();

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { items: { include: { sizes: true } }, client: true },
    });
    if (!pedido || (companyId !== null && pedido.company_id !== companyId)) throw new UserError("Pedido no encontrado.");

    const ops = await withRetry(() => prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7002::int, 1::int)`;
      const claimed = await tx.pedido.updateMany({
        where: { id: pedidoId, ops: { none: {} } },
        data: { status: "EN PROCESO" },
      });
      if (claimed.count === 0) throw new UserError("Este pedido ya tiene OPs generadas.");

      const created = [];
      for (const item of pedido.items) {
        const totalQuantity = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
        if (totalQuantity === 0) continue;

        const orderNumber = await generateNextOrderNumber(tx, pedido.company_id);

        const op = await tx.order.create({
          data: {
            orderNumber,
            client_id: pedido.client_id,
            date: pedido.date,
            garment: item.garment,
            color: item.color,
            totalQuantity,
            notes: item.notes,
            status: "PENDIENTE",
            company_id: pedido.company_id,
            pedido_id: pedidoId,
            sizes: {
              create: item.sizes.map((s) => ({ size: s.size, quantity: s.quantity })),
            },
          },
        });
        await attachDefaultServicesToOrder(tx, op.id, totalQuantity, { createMissing: true });
        created.push(op);
      }
      if (created.length === 0) throw new UserError("El pedido no tiene cantidades para generar OPs.");
      return created;
    }));

    await logActivity("GENERAR_OPS", `${ops.length} OPs generadas desde Pedido ${pedido.pedidoNumber}`);
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${pedidoId}`);
    revalidatePath("/admin/orders");
    return { success: true, count: ops.length };
  } catch (e) {
    console.error(e);
    return { success: false, error: friendlyError(e, "No se pudieron generar las OPs.") };
  }
}

export async function deletePedido(pedidoId: number): Promise<PedidoResult> {
  try {
    const companyId = await getSessionCompanyId();
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { pedidoNumber: true, company_id: true, ops: { select: { id: true } } } });
    if (!pedido || (companyId !== null && pedido.company_id !== companyId)) throw new UserError("Pedido no encontrado.");
    if (pedido.ops.length > 0) throw new UserError("No se puede eliminar un pedido con OPs generadas.");

    await prisma.pedido.delete({ where: { id: pedidoId } });
    await logActivity("DELETE_PEDIDO", `Pedido ${pedido.pedidoNumber} eliminado`);
    revalidatePath("/admin/pedidos");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: friendlyError(e, "No se pudo eliminar el pedido.") };
  }
}
