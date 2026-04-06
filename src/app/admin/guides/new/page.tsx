import { prisma } from "@/lib/prisma";
import GuideForm from "../GuideForm";

export const dynamic = 'force-dynamic';

export default async function NewGuidePage() {
  // Solo traer pedidos que puedan recibir entregas (no cerrados ni cancelados)
  const availableOrders = await prisma.order.findMany({
    where: { 
      status: { notIn: ["CERRADO", "CANCELADO"] } 
    },
    include: {
      guides: true
    },
    orderBy: { orderNumber: 'asc' }
  });

  // Filtrar solo los que realmente tengan saldo pendiente
  const pendingOrders = availableOrders.filter(o => {
    const delivered = o.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0);
    return delivered < o.totalQuantity;
  }).map(o => {
    const delivered = o.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      garment: o.garment,
      color: o.color,
      pending: o.totalQuantity - delivered,
      totalQuantity: o.totalQuantity
    };
  });

  return (
    <div>
      <GuideForm pendingOrders={pendingOrders} />
    </div>
  );
}
