import { prisma } from "@/lib/prisma";
import ServiceForm from "../ServiceForm";
import { notFound } from "next/navigation";

// Definir los props para Pages en Next.js 15
type Params = Promise<{ id: string }>;

export default async function EditServicePage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const idStr = resolvedParams.id;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) return notFound();

  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service) return notFound();

  return (
    <div>
      <ServiceForm service={service} />
    </div>
  );
}
