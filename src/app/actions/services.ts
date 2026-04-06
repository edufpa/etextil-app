"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createService(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const trackBySize = formData.get("trackBySize") === "true";

    if (!name || !type) return { error: "Nombre y tipo son obligatorios" };

    await prisma.service.create({
      data: { name, description, type, trackBySize, status: true },
    });

    revalidatePath("/admin/services");
    return { success: true };
  } catch (e) {
    return { error: "Error al crear el servicio" };
  }
}

export async function updateService(id: number, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const status = formData.get("status") === "true";
    const trackBySize = formData.get("trackBySize") === "true";

    if (!name || !type) return { error: "Nombre y tipo son obligatorios" };

    await prisma.service.update({
      where: { id },
      data: { name, description, type, trackBySize, status },
    });

    revalidatePath("/admin/services");
    return { success: true };
  } catch (e) {
    return { error: "Error al actualizar el servicio" };
  }
}

export async function deleteService(id: number) {
  try {
    // Logical delete
    await prisma.service.update({
      where: { id },
      data: { status: false },
    });
    revalidatePath("/admin/services");
    return { success: true };
  } catch (e) {
    return { error: "Error al eliminar el servicio" };
  }
}
