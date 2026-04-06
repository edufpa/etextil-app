import { NextResponse } from "next/server";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

async function ensureGlobalAdmin() {
  const username = process.env.GLOBAL_ADMIN_USER || "eduardo";
  const password = process.env.GLOBAL_ADMIN_PASSWORD || "martillo";
  const existing = await (prisma as any).appUser.findUnique({ where: { username } });
  if (!existing) {
    await (prisma as any).appUser.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: "GLOBAL_ADMIN",
        status: true,
      },
    });
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    await ensureGlobalAdmin();
    const user = await (prisma as any).appUser.findUnique({
      where: { username },
      include: { company: true },
    });

    if (!user || !user.status || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ success: false, message: "Credenciales inválidas" }, { status: 401 });
    }

    if (user.role !== "GLOBAL_ADMIN" && !user.company_id) {
      return NextResponse.json({ success: false, message: "Usuario sin empresa asignada." }, { status: 401 });
    }

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({
      userId: String(user.id),
      username: user.username,
      role: user.role,
      companyId: user.company_id || null,
      companyName: user.company?.name || null,
      expires,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", session, { expires, httpOnly: true });

    return NextResponse.json({
      success: true,
      redirect: user.role === "GLOBAL_ADMIN" ? "/admin/global" : "/admin",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
