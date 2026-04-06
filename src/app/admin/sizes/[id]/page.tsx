import { prisma } from "@/lib/prisma";
import SizeForm from "../SizeForm";
import { notFound } from "next/navigation";

type Params = Promise<{ id: string }>;

export const dynamic = 'force-dynamic';
export default async function EditSizePage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) return notFound();

  const size = await prisma.size.findUnique({ where: { id } });
  if (!size) return notFound();

  return (
    <div>
      <SizeForm size={size} />
    </div>
  );
}
