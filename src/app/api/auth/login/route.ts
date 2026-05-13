import { NextResponse } from "next/server";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

async function ensureGlobalAdmin() {
  const email = "site.eduardo@gmail.com";
  const username = "site.eduardo";
  const password = "M@rtillo100";

  const existing = await prisma.appUser.findFirst({
    where: { OR: [{ email }, { username: "eduardo" }, { username }] },
  });

  if (!existing) {
    await prisma.appUser.create({
      data: {
        username,
        email,
        passwordHash: hashPassword(password),
        role: "GLOBAL_ADMIN",
        status: true,
      },
    });
  } else if (!existing.email && existing.role === "GLOBAL_ADMIN") {
    // Migrate old global admin: set email
    await prisma.appUser.update({
      where: { id: existing.id },
      data: { email, username },
    });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    await ensureGlobalAdmin();

    // Find by email (primary) or username fallback
    const user = await prisma.appUser.findFirst({
      where: { OR: [{ email: email?.toLowerCase() }, { username: email }] },
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
      email: user.email || "",
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
