import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession();
  if (!session) return new Response("No autorizado", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("No encontrado", { status: 404 });

  const f = await prisma.pedidoFile.findUnique({
    where: { id },
    select: { name: true, mimeType: true, data: true, createdAt: true, pedido: { select: { company_id: true } } },
  });
  const companyId = session.companyId ? Number(session.companyId) : null;
  if (!f || (companyId !== null && f.pedido.company_id !== companyId)) return new Response("No encontrado", { status: 404 });

  const download = new URL(req.url).searchParams.get("download") === "1";
  const encoded = encodeURIComponent(f.name);
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mimeType,
      "Content-Length": String(f.data.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${f.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
