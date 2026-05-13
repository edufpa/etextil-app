"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSessionCompanyId } from "@/lib/company";
import { logActivity } from "@/lib/logger";

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
    });
  });

  await logActivity(`Pedido ${pedido.pedidoNumber} creado`, companyId);
  revalidatePath("/admin/pedidos");
  return pedido;
}

export async function generarOPs(pedidoId: number) {
  const companyId = await getSessionCompanyId();

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { items: { include: { sizes: true } }, client: true },
  });
  if (!pedido) throw new Error("Pedido no encontrado");

  const ops = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const item of pedido.items) {
      const totalQuantity = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
      if (totalQuantity === 0) continue;

      const orderNumber = await generateNextOrderNumber(tx, companyId);

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
          company_id: companyId,
          pedido_id: pedidoId,
          sizes: {
            create: item.sizes.map((s) => ({ size: s.size, quantity: s.quantity })),
          },
        },
      });
      created.push(op);
    }

    await tx.pedido.update({
      where: { id: pedidoId },
      data: { status: "EN PROCESO" },
    });

    return created;
  });

  await logActivity(`${ops.length} OPs generadas desde Pedido ${pedido.pedidoNumber}`, companyId);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin/orders");
  return ops;
}

export async function deletePedido(pedidoId: number) {
  const companyId = await getSessionCompanyId();
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { pedidoNumber: true, ops: { select: { id: true } } } });
  if (!pedido) throw new Error("Pedido no encontrado");
  if (pedido.ops.length > 0) throw new Error("No se puede eliminar un pedido con OPs generadas");

  await prisma.pedido.delete({ where: { id: pedidoId } });
  await logActivity(`Pedido ${pedido.pedidoNumber} eliminado`, companyId);
  revalidatePath("/admin/pedidos");
}
