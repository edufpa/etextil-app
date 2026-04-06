"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSessionCompanyId } from "@/lib/company";

export async function createClient(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    if (!name) return { error: "El nombre es obligatorio" };
    const companyId = await getSessionCompanyId();

    await prisma.client.create({
      data: { name, ...(companyId ? { company_id: companyId } : {}) },
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
