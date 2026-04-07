"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSessionCompanyId } from "@/lib/company";
import { logActivity } from "@/lib/logger";
import { put, del } from "@vercel/blob";

export async function createGarment(formData: FormData) {
  try {
    const companyId = await getSessionCompanyId();
    const name = (formData.get("name") as string)?.trim();
    const code = (formData.get("code") as string)?.trim() || null;
    const material = (formData.get("material") as string)?.trim() || null;
    const mold_id = formData.get("mold_id") ? Number(formData.get("mold_id")) : null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const photo = formData.get("photo") as File | null;

    if (!name) return { error: "El nombre es requerido." };

    let photoUrl: string | null = null;
    if (photo && photo.size > 0) {
      const blob = await put(`garments/${Date.now()}-${photo.name}`, photo, {
        access: "public",
      });
      photoUrl = blob.url;
    }

    const garment = await prisma.garment.create({
      data: { name, code, material, mold_id, notes, photoUrl, company_id: companyId },
    });
    await logActivity("CREATE_GARMENT", `Prenda creada: ${garment.name}${code ? ` (${code})` : ""}`);
    revalidatePath("/admin/garments");
    return { success: true, id: garment.id };
  } catch (e: any) {
    return { error: e.message || "Error al crear la prenda." };
  }
}

export async function updateGarment(id: number, formData: FormData) {
  try {
    const existing = await prisma.garment.findUnique({ where: { id } });
    if (!existing) return { error: "Prenda no encontrada." };

    const name = (formData.get("name") as string)?.trim();
    const code = (formData.get("code") as string)?.trim() || null;
    const material = (formData.get("material") as string)?.trim() || null;
    const mold_id = formData.get("mold_id") ? Number(formData.get("mold_id")) : null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const photo = formData.get("photo") as File | null;

    if (!name) return { error: "El nombre es requerido." };

    let photoUrl = existing.photoUrl;
    if (photo && photo.size > 0) {
      // Delete old photo if exists
      if (existing.photoUrl) {
        try { await del(existing.photoUrl); } catch {}
      }
      const blob = await put(`garments/${Date.now()}-${photo.name}`, photo, {
        access: "public",
      });
      photoUrl = blob.url;
    }

    await prisma.garment.update({
      where: { id },
      data: { name, code, material, mold_id, notes, photoUrl },
    });
    await logActivity("UPDATE_GARMENT", `Prenda actualizada: ${name}`);
    revalidatePath("/admin/garments");
    revalidatePath(`/admin/garments/${id}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Error al actualizar la prenda." };
  }
}

export async function deleteGarment(id: number) {
  try {
    const garment = await prisma.garment.findUnique({ where: { id } });
    if (!garment) return { error: "Prenda no encontrada." };
    if (garment.photoUrl) {
      try { await del(garment.photoUrl); } catch {}
    }
    await prisma.garment.delete({ where: { id } });
    await logActivity("DELETE_GARMENT", `Prenda eliminada: ${garment.name}`);
    revalidatePath("/admin/garments");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Error al eliminar la prenda." };
  }
}

export async function toggleGarmentStatus(id: number, status: boolean) {
  try {
    await prisma.garment.update({ where: { id }, data: { status } });
    revalidatePath("/admin/garments");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Error." };
  }
}
