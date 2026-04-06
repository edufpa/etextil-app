"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createColor(data: { name: string }) {
  try {
    await prisma.color.create({ data });
    revalidatePath("/admin/colors");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "El color ya existe" };
    return { error: "Error al crear color" };
  }
}

export async function updateColor(id: number, data: { name: string }) {
  try {
    await prisma.color.update({ where: { id }, data });
    revalidatePath("/admin/colors");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "El color ya existe" };
    return { error: "Error al actualizar color" };
  }
}

export async function deleteColor(id: number) {
  try {
    await prisma.color.delete({ where: { id } });
    revalidatePath("/admin/colors");
    return { success: true };
  } catch (error) {
    return { error: "Error al eliminar el color. Asegúrese de que no esté en uso." };
  }
}
