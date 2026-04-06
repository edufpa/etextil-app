import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OrderEditForm from "./OrderEditForm";

type Params = Promise<{ id: string }>;

export const dynamic = 'force-dynamic';
export default async function EditOrderPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const orderId = parseInt(resolvedParams.id, 10);
  if (isNaN(orderId)) return notFound();

  const [order, allServices, allSizes, allColors] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sizes: { orderBy: { size: "asc" } },
        services: { include: { service: true } },
      },
    }),
    prisma.service.findMany({ where: { status: true }, orderBy: { name: "asc" } }),
    prisma.size.findMany({ where: { status: true }, orderBy: { name: "asc" } }),
    prisma.color.findMany({ where: { status: true }, orderBy: { name: "asc" } }),
  ]);

  if (!order) return notFound();

  return (
    <div>
      <OrderEditForm
        order={order}
        allServices={allServices}
        allSizes={allSizes}
        allColors={allColors}
      />
    </div>
  );
}
