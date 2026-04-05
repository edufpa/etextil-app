"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProvider(formData: FormData) {
  try {
    const businessName = formData.get("businessName") as string;
    if (!businessName) return { error: "Nombre o Razón social es obligatorio" };

    await prisma.provider.create({
      data: {
        businessName,
        contactName: formData.get("contactName") as string,
        phone: formData.get("phone") as string,
        email: formData.get("email") as string,
        address: formData.get("address") as string,
        notes: formData.get("notes") as string,
        status: true,
      },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (e) {
    return { error: "Error al crear el proveedor" };
  }
}

export async function updateProvider(id: number, formData: FormData) {
  try {
    const businessName = formData.get("businessName") as string;
    if (!businessName) return { error: "Nombre o Razón social es obligatorio" };

    await prisma.provider.update({
      where: { id },
      data: {
        businessName,
        contactName: formData.get("contactName") as string,
        phone: formData.get("phone") as string,
        email: formData.get("email") as string,
        address: formData.get("address") as string,
        notes: formData.get("notes") as string,
        status: formData.get("status") === "true",
      },
    });

    revalidatePath("/admin/providers");
    return { success: true };
  } catch (e) {
    return { error: "Error al actualizar el proveedor" };
  }
}

export async function deleteProvider(id: number) {
  try {
    await prisma.provider.update({
      where: { id },
      data: { status: false },
    });
    revalidatePath("/admin/providers");
    return { success: true };
  } catch (e) {
    return { error: "Error al eliminar el proveedor" };
  }
}
