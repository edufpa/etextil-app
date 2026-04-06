"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(formData: FormData) {
  try {
    const name = formData.get("name") as string;

    if (!name) return { error: "El nombre es obligatorio" };

    await prisma.client.create({
      data: { name },
    });

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Error al crear cliente" };
  }
}

export async function updateClient(id: number, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const statusStr = formData.get("status") as string;
    
    if (!name) return { error: "El nombre es obligatorio" };

    await prisma.client.update({
      where: { id },
      data: {
        name,
        status: statusStr === "true",
      },
    });

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Error al actualizar cliente" };
  }
}

export async function disableClient(id: number) {
  try {
    await prisma.client.update({
      where: { id },
      data: { status: false },
    });

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Error al desactivar cliente" };
  }
}
