"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSize(data: { name: string }) {
  try {
    await prisma.size.create({ data });
    revalidatePath("/admin/sizes");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "La talla ya existe" };
    return { error: "Error al crear talla" };
  }
}

export async function updateSize(id: number, data: { name: string }) {
  try {
    await prisma.size.update({ where: { id }, data });
    revalidatePath("/admin/sizes");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "La talla ya existe" };
    return { error: "Error al actualizar talla" };
  }
}

export async function deleteSize(id: number) {
  try {
    await prisma.size.delete({ where: { id } });
    revalidatePath("/admin/sizes");
    return { success: true };
  } catch (error) {
    return { error: "Error al eliminar la talla. Asegúrese de que no esté en uso." };
  }
}
