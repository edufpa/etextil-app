import { prisma } from "@/lib/prisma";
import ProviderForm from "../ProviderForm";
import { notFound } from "next/navigation";

type Params = Promise<{ id: string }>;

export const dynamic = 'force-dynamic';
export default async function EditProviderPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) return notFound();

  const [provider, allServices] = await Promise.all([
    prisma.provider.findUnique({
      where: { id },
      include: { services: { select: { service_id: true } } },
    }),
    prisma.service.findMany({ where: { status: true }, orderBy: { name: "asc" } }),
  ]);

  if (!provider) return notFound();

  const selectedServiceIds = provider.services.map((ps) => ps.service_id);

  return (
    <div>
      <ProviderForm
        provider={provider}
        allServices={allServices}
        selectedServiceIds={selectedServiceIds}
      />
    </div>
  );
}
