"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSessionCompanyId } from "@/lib/company";

function parseServiceIds(formData: FormData): number[] {
  return formData.getAll("service_ids[]").map(Number).filter((n) => !isNaN(n) && n > 0);
}

export async function createProvider(formData: FormData) {
  try {
    const businessName = formData.get("businessName") as string;
    if (!businessName) return { error: "Nombre o Razón social es obligatorio" };
    const companyId = await getSessionCompanyId();
    const serviceIds = parseServiceIds(formData);

    const provider = await prisma.provider.create({
      data: {
        businessName,
        contactName: formData.get("contactName") as string,
        phone: formData.get("phone") as string,
        email: formData.get("email") as string,
        address: formData.get("address") as string,
        notes: formData.get("notes") as string,
        status: true,
        ...(companyId ? { company_id: companyId } : {}),
      },
    });

    if (serviceIds.length > 0) {
      await prisma.providerService.createMany({
        data: serviceIds.map((service_id) => ({ provider_id: provider.id, service_id })),
        skipDuplicates: true,
      });
    }

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
    const serviceIds = parseServiceIds(formData);

    await prisma.$transaction(async (tx) => {
      await tx.provider.update({
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

      // Replace all service associations
      await tx.providerService.deleteMany({ where: { provider_id: id } });
      if (serviceIds.length > 0) {
        await tx.providerService.createMany({
          data: serviceIds.map((service_id) => ({ provider_id: id, service_id })),
          skipDuplicates: true,
        });
      }
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
