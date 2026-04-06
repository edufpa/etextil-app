import { prisma } from "@/lib/prisma";
import OrderForm from "../OrderForm";

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const clients = await prisma.client.findMany({
    where: { status: true },
    orderBy: { name: 'asc' }
  });

  // Buscar servicios por defecto para precargarlos (Corte, Confección, Estampado)
  const allServices = await prisma.service.findMany({
    where: { status: true }
  });

  const defaultNames = ["Corte", "Confección", "Estampado"];
  const defaultServices = allServices.filter(s => defaultNames.some(dn => s.name.toLowerCase().includes(dn.toLowerCase())));

  return (
    <div>
      <OrderForm clients={clients} allServices={allServices} defaultServices={defaultServices} />
    </div>
  );
}
