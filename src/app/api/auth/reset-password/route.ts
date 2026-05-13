import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ success: false, message: "Datos incompletos" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) return NextResponse.json({ success: false, message: "Token inválido" }, { status: 400 });
    if (resetToken.usedAt) return NextResponse.json({ success: false, message: "Este enlace ya fue usado" }, { status: 400 });
    if (resetToken.expiresAt < new Date()) return NextResponse.json({ success: false, message: "El enlace expiró, solicitá uno nuevo" }, { status: 400 });

    await prisma.$transaction([
      prisma.appUser.update({
        where: { id: resetToken.user_id },
        data: { passwordHash: hashPassword(password) },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
