import { canAccessCompany } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import ClientForm from "../ClientForm";
import { notFound } from "next/navigation";

type Params = Promise<{ id: string }>;

export const dynamic = 'force-dynamic';
export default async function EditClientPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const idStr = resolvedParams.id;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) return notFound();

  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client || !(await canAccessCompany(client.company_id))) return notFound();

  return (
    <div>
      <ClientForm client={client} />
    </div>
  );
}
