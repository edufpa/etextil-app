"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";
import { friendlyError, UserError } from "@/lib/errors";
import {
  assertPedidoAccess, assertPedidoItemAccess,
  MAX_FILE_BYTES, MAX_IMAGE_BYTES, FILE_MIME_OK, IMAGE_MIME_OK,
} from "@/lib/pedido-access";

type Res<T = {}> = ({ success: true } & T) | { error: string };

/**
 * Sube un archivo del pedido por partes (para respetar el límite de 4.5 MB por request de Vercel).
 * Primera parte: sin fileId → crea el registro. Siguientes: con fileId → concatena.
 * Campos: pedidoId, name, mimeType, totalSize, chunk (Blob), fileId?, last ("1" en la última parte).
 */
export async function uploadPedidoFileChunk(fd: FormData): Promise<Res<{ fileId: number }>> {
  try {
    const pedidoId = Number(fd.get("pedidoId"));
    const name = String(fd.get("name") || "").trim().slice(0, 200);
    const mimeType = String(fd.get("mimeType") || "");
    const totalSize = Number(fd.get("totalSize"));
    const fileIdRaw = fd.get("fileId");
    const last = fd.get("last") === "1";
    const chunk = fd.get("chunk");
    if (!(chunk instanceof Blob) || chunk.size === 0) throw new UserError("No se recibió el archivo.");
    const pedido = await assertPedidoAccess(pedidoId);
    if (!name) throw new UserError("El archivo no tiene nombre.");
    if (!FILE_MIME_OK(mimeType)) throw new UserError("Solo se permiten archivos PDF o imágenes.");
    if (!Number.isFinite(totalSize) || totalSize <= 0 || totalSize > MAX_FILE_BYTES) {
      throw new UserError("El archivo supera el máximo de 10 MB.");
    }
    const bytes = Buffer.from(await chunk.arrayBuffer());

    let fileId: number;
    if (!fileIdRaw) {
      const f = await prisma.pedidoFile.create({
        data: { pedido_id: pedidoId, name, mimeType, size: totalSize, data: bytes },
        select: { id: true },
      });
      fileId = f.id;
    } else {
      fileId = Number(fileIdRaw);
      const f = await prisma.pedidoFile.findUnique({ where: { id: fileId }, select: { pedido_id: true } });
      if (!f || f.pedido_id !== pedidoId) throw new UserError("Archivo no encontrado.");
      await prisma.$executeRaw`UPDATE "PedidoFile" SET "data" = "data" || ${bytes} WHERE "id" = ${fileId}`;
    }

    if (last) {
      const rows = await prisma.$queryRaw<{ len: number }[]>`SELECT octet_length("data")::int AS len FROM "PedidoFile" WHERE "id" = ${fileId}`;
      if (!rows[0] || rows[0].len !== totalSize) {
        await prisma.pedidoFile.delete({ where: { id: fileId } }).catch(() => {});
        throw new UserError("La subida quedó incompleta. Vuelve a intentarlo.");
      }
      await logActivity("PEDIDO_FILE_UPLOAD", `Archivo "${name}" (${Math.round(totalSize / 1024)} KB) adjuntado al pedido ${pedido.pedidoNumber}`);
      revalidatePath(`/admin/pedidos/${pedidoId}`);
    }
    return { success: true, fileId };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "No se pudo subir el archivo.") };
  }
}

export async function deletePedidoFile(fileId: number): Promise<Res> {
  try {
    const f = await prisma.pedidoFile.findUnique({ where: { id: fileId }, select: { id: true, name: true, pedido_id: true } });
    if (!f) throw new UserError("Archivo no encontrado.");
    const pedido = await assertPedidoAccess(f.pedido_id);
    await prisma.pedidoFile.delete({ where: { id: fileId } });
    await logActivity("PEDIDO_FILE_DELETE", `Archivo "${f.name}" eliminado del pedido ${pedido.pedidoNumber}`);
    revalidatePath(`/admin/pedidos/${f.pedido_id}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "No se pudo eliminar el archivo.") };
  }
}

/** Sube o reemplaza la imagen de la prenda de un ítem. Campos: itemId, image (Blob). */
export async function setPedidoItemImage(fd: FormData): Promise<Res> {
  try {
    const itemId = Number(fd.get("itemId"));
    const img = fd.get("image");
    if (!(img instanceof Blob) || img.size === 0) throw new UserError("No se recibió la imagen.");
    if (!IMAGE_MIME_OK(img.type)) throw new UserError("Formato de imagen no permitido (usa JPG, PNG o WEBP).");
    if (img.size > MAX_IMAGE_BYTES) throw new UserError("La imagen supera los 3 MB.");
    const item = await assertPedidoItemAccess(itemId);
    const data = Buffer.from(await img.arrayBuffer());
    await prisma.pedidoItemImage.upsert({
      where: { pedidoItem_id: itemId },
      create: { pedidoItem_id: itemId, mimeType: img.type, size: data.length, data },
      update: { mimeType: img.type, size: data.length, data },
    });
    await logActivity("PEDIDO_ITEM_IMAGE", `Imagen de ${item.garment} ${item.color} actualizada (pedido ${item.pedido.pedidoNumber})`);
    revalidatePath(`/admin/pedidos/${item.pedido_id}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "No se pudo guardar la imagen.") };
  }
}

export async function removePedidoItemImage(itemId: number): Promise<Res> {
  try {
    const item = await assertPedidoItemAccess(itemId);
    await prisma.pedidoItemImage.deleteMany({ where: { pedidoItem_id: itemId } });
    await logActivity("PEDIDO_ITEM_IMAGE_DELETE", `Imagen de ${item.garment} ${item.color} eliminada (pedido ${item.pedido.pedidoNumber})`);
    revalidatePath(`/admin/pedidos/${item.pedido_id}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: friendlyError(e, "No se pudo eliminar la imagen.") };
  }
}
