"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/password";
import { getServerSession } from "@/lib/server-session";
import { cookies } from "next/headers";

async function requireGlobalAdmin() {
  const session = await getServerSession();
  if (!session?.userId || session?.role !== "GLOBAL_ADMIN") {
    throw new Error("Acceso denegado.");
  }
}

export async function createCompany(formData: FormData) {
  await requireGlobalAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Nombre de empresa requerido." };
  try {
    await (prisma as any).company.create({ data: { name, status: true } });
    revalidatePath("/admin/global");
    return { success: true };
  } catch {
    return { error: "No se pudo crear la empresa (puede ya existir)." };
  }
}

export async function createCompanyUser(formData: FormData) {
  await requireGlobalAdmin();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const companyId = Number(formData.get("company_id"));
  if (!username || !password || !companyId) return { error: "Completa usuario, contraseña y empresa." };
  try {
    await (prisma as any).appUser.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: "COMPANY_ADMIN",
        company_id: companyId,
        status: true,
      },
    });
    revalidatePath("/admin/global");
    return { success: true };
  } catch {
    return { error: "No se pudo crear el usuario (usuario duplicado)." };
  }
}

export async function deleteAppUser(userId: number) {
  await requireGlobalAdmin();
  try {
    await (prisma as any).appUser.delete({ where: { id: userId } });
    revalidatePath("/admin/global");
    return { success: true };
  } catch {
    return { error: "No se pudo eliminar el usuario." };
  }
}

export async function updateUserPassword(formData: FormData) {
  await requireGlobalAdmin();
  const userId = Number(formData.get("user_id"));
  const newPassword = String(formData.get("new_password") || "").trim();
  if (!userId || !newPassword) return { error: "Datos incompletos." };
  if (newPassword.length < 4) return { error: "La contraseña debe tener al menos 4 caracteres." };
  try {
    await (prisma as any).appUser.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });
    revalidatePath("/admin/global");
    return { success: true };
  } catch {
    return { error: "No se pudo actualizar la contraseña." };
  }
}

// Called from the login page to switch into a company context
export async function loginAsCompany(companyId: number) {
  // No global admin check — used after login only
  void cookies(); // ensure dynamic
  return { companyId };
}
