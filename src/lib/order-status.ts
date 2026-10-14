/**
 * Estado visible de una OP, derivado de sus cantidades (una sola definición para listas, detalle y dashboard).
 * CANCELADO / CERRADO son manuales; el resto se calcula con lo despachado y lo enviado a taller.
 */
export type OrderDisplayStatus = "PENDIENTE" | "EN PROCESO" | "PARCIALMENTE ENTREGADO" | "ENTREGADO" | "CANCELADO";

export function deriveOrderDisplayStatus(o: {
  status: string;
  totalQuantity: number;
  guides: { deliveredQuantity: number }[];
  services: { deliveries: { quantity: number }[] }[];
}): OrderDisplayStatus {
  if (o.status === "CANCELADO") return "CANCELADO";
  if (o.status === "ENTREGADO" || o.status === "CERRADO") return "ENTREGADO";
  const delivered = o.guides.reduce((a, g) => a + g.deliveredQuantity, 0);
  if (delivered >= o.totalQuantity) return "ENTREGADO";
  if (delivered > 0) return "PARCIALMENTE ENTREGADO";
  const sent = o.services.reduce((a, s) => a + s.deliveries.reduce((x, d) => x + d.quantity, 0), 0);
  return sent > 0 ? "EN PROCESO" : "PENDIENTE";
}

/**
 * Prendas que están en talleres ahora mismo: enviado menos recibido, sumado por etapa.
 * (Una prenda solo está en una etapa a la vez, así que nunca supera el total de la OP.)
 */
export function piecesInWorkshop(o: { services: { deliveries: { quantity: number; incomings?: { quantity: number }[] }[] }[] }): number {
  let n = 0;
  for (const s of o.services) {
    for (const d of s.deliveries) n += d.quantity - (d.incomings ?? []).reduce((a, i) => a + i.quantity, 0);
  }
  return Math.max(0, n);
}
