import { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

const DONE = ["ENTREGADO", "CERRADO", "CANCELADO"];

/**
 * Mantiene el estado del pedido según sus OPs: EN PROCESO mientras alguna siga abierta,
 * COMPLETADO cuando todas están entregadas/cerradas/canceladas (y al menos una no fue cancelada).
 * No toca pedidos en BORRADOR/CONFIRMADO (aún sin OPs).
 */
export async function syncPedidoStatus(db: Db, pedidoId: number | null | undefined) {
  if (!pedidoId) return;
  const p = await db.pedido.findUnique({
    where: { id: pedidoId },
    select: { status: true, ops: { select: { status: true } } },
  });
  if (!p || p.ops.length === 0 || !["EN PROCESO", "COMPLETADO"].includes(p.status)) return;
  const allDone = p.ops.every((o) => DONE.includes(o.status)) && p.ops.some((o) => o.status !== "CANCELADO");
  const next = allDone ? "COMPLETADO" : "EN PROCESO";
  if (next !== p.status) await db.pedido.update({ where: { id: pedidoId }, data: { status: next } });
}
