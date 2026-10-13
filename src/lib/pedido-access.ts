import { prisma } from "./prisma";
import { getSessionCompanyId } from "./company";
import { UserError } from "./errors";

export async function assertPedidoAccess(pedidoId: number) {
  const companyId = await getSessionCompanyId();
  const p = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { id: true, pedidoNumber: true, company_id: true } });
  if (!p || (companyId !== null && p.company_id !== companyId)) throw new UserError("Pedido no encontrado.");
  return p;
}

export async function assertPedidoItemAccess(itemId: number) {
  const companyId = await getSessionCompanyId();
  const it = await prisma.pedidoItem.findUnique({
    where: { id: itemId },
    select: { id: true, garment: true, color: true, pedido_id: true, pedido: { select: { pedidoNumber: true, company_id: true } } },
  });
  if (!it || (companyId !== null && it.pedido.company_id !== companyId)) throw new UserError("Ítem no encontrado.");
  return it;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const FILE_MIME_OK = (m: string) => m === "application/pdf" || m.startsWith("image/");
export const IMAGE_MIME_OK = (m: string) => ["image/webp", "image/jpeg", "image/png", "image/gif", "image/avif"].includes(m);
