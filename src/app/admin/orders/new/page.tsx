import { prisma } from "@/lib/prisma";
import OrderForm from "../OrderForm";
import { companyFilter } from "@/lib/company";

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const filter = await companyFilter();
  const [clients, allServices, configuredSizes, configuredColors] = await Promise.all([
    prisma.client.findMany({
      where: { status: true, ...filter },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { status: true },
    }),
    prisma.size.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
    }),
    prisma.color.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const defaultNames = ["Corte", "Confección", "Estampado"];
  const defaultServices = allServices.filter(s => defaultNames.some(dn => s.name.toLowerCase().includes(dn.toLowerCase())));

  return (
    <div>
      <OrderForm
        clients={clients}
        allServices={allServices}
        defaultServices={defaultServices}
        configuredSizes={configuredSizes.map((s) => s.name)}
        configuredColors={configuredColors.map((c) => c.name)}
      />
    </div>
  );
}
