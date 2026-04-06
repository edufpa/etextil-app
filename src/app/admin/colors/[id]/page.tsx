import { prisma } from "@/lib/prisma";
import ColorForm from "../ColorForm";
import { notFound } from "next/navigation";

type Params = Promise<{ id: string }>;

export const dynamic = 'force-dynamic';
export default async function EditColorPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) return notFound();

  const color = await prisma.color.findUnique({ where: { id } });
  if (!color) return notFound();

  return (
    <div>
      <ColorForm color={color} />
    </div>
  );
}
