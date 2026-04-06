import { prisma } from "@/lib/prisma";
import ProviderForm from "../ProviderForm";

export const dynamic = 'force-dynamic';

export default async function NewProviderPage() {
  const allServices = await prisma.service.findMany({
    where: { status: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <ProviderForm allServices={allServices} selectedServiceIds={[]} />
    </div>
  );
}
