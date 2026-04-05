import { prisma } from "@/lib/prisma";
import ProviderForm from "../ProviderForm";
import { notFound } from "next/navigation";

type Params = Promise<{ id: string }>;


export const dynamic = 'force-dynamic';
export default async function EditProviderPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const idStr = resolvedParams.id;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) return notFound();

  const provider = await prisma.provider.findUnique({
    where: { id },
  });

  if (!provider) return notFound();

  return (
    <div>
      <ProviderForm provider={provider} />
    </div>
  );
}
