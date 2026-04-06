import { prisma } from "@/lib/prisma";
import GuideForm from "../GuideForm";

export const dynamic = 'force-dynamic';

export default async function NewGuidePage() {
  // Traer pedidos activos con sus tallas y entregas previas por talla
  const availableOrders = await prisma.order.findMany({
    where: {
      status: { notIn: ["CERRADO", "CANCELADO"] }
    },
    include: {
      client: true,
      sizes: { orderBy: { size: "asc" } },
      guides: { select: { size: true, deliveredQuantity: true } },
    },
    orderBy: { orderNumber: 'asc' }
  });

  // Para cada pedido, calcular cuánto se ha entregado por talla
  const pendingOrders = availableOrders
    .map(o => {
      // Calcular entregado por talla
      const deliveredBySize = new Map<string, number>();
      for (const g of o.guides) {
        const prev = deliveredBySize.get(g.size) || 0;
        deliveredBySize.set(g.size, prev + g.deliveredQuantity);
      }

      const sizesWithBalance = o.sizes.map(s => ({
        size: s.size,
        quantity: s.quantity,
        delivered: deliveredBySize.get(s.size) || 0,
      }));

      // Solo incluir el pedido si alguna talla tiene saldo > 0
      const hasBalance = sizesWithBalance.some(s => s.quantity - s.delivered > 0);
      if (!hasBalance) return null;

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        garment: o.garment,
        color: o.color,
        client: { name: o.client.name },
        sizes: sizesWithBalance,
      };
    })
    .filter(Boolean) as any[];

  return (
    <div>
      <GuideForm pendingOrders={pendingOrders} />
    </div>
  );
}
