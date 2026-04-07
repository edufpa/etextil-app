"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSessionCompanyId } from "@/lib/company";
import { logActivity } from "@/lib/logger";

export async function createMold(data: {
  code: string;
  name: string;
  description?: string;
  notes?: string;
}) {
  try {
    const companyId = await getSessionCompanyId();
    const mold = await prisma.mold.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        notes: data.notes?.trim() || null,
        company_id: companyId,
      },
    });
    await logActivity("CREATE_MOLD", `Molde creado: ${mold.code} — ${mold.name}`);
    revalidatePath("/admin/molds");
    return { success: true, id: mold.id };
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Ya existe un molde con ese código." };
    return { error: e.message || "Error al crear el molde." };
  }
}

export async function updateMold(
  id: number,
  data: { code: string; name: string; description?: string; notes?: string }
) {
  try {
    const mold = await prisma.mold.update({
      where: { id },
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });
    await logActivity("UPDATE_MOLD", `Molde actualizado: ${mold.code} — ${mold.name}`);
    revalidatePath("/admin/molds");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "Ya existe un molde con ese código." };
    return { error: e.message || "Error al actualizar el molde." };
  }
}

export async function deleteMold(id: number) {
  try {
    const mold = await prisma.mold.findUnique({ where: { id }, select: { code: true, name: true } });
    await prisma.mold.delete({ where: { id } });
    await logActivity("DELETE_MOLD", `Molde eliminado: ${mold?.code} — ${mold?.name}`);
    revalidatePath("/admin/molds");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Error al eliminar el molde." };
  }
}

export async function toggleMoldStatus(id: number, status: boolean) {
  try {
    await prisma.mold.update({ where: { id }, data: { status } });
    revalidatePath("/admin/molds");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Error." };
  }
}
