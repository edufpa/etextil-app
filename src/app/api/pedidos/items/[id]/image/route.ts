import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession();
  if (!session) return new Response("No autorizado", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("No encontrado", { status: 404 });

  const img = await prisma.pedidoItemImage.findUnique({
    where: { pedidoItem_id: id },
    select: { mimeType: true, data: true, updatedAt: true, pedidoItem: { select: { pedido: { select: { company_id: true } } } } },
  });
  const companyId = session.companyId ? Number(session.companyId) : null;
  if (!img || (companyId !== null && img.pedidoItem.pedido.company_id !== companyId)) return new Response("No encontrado", { status: 404 });

  const etag = `"${id}-${img.updatedAt.getTime()}"`;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mimeType,
      "Content-Length": String(img.data.length),
      // La URL lleva ?v=<updatedAt>, así que se puede cachear largo en el navegador
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
