import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.userId) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) return NextResponse.json({ success: false, message: "Datos incompletos" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });

    const user = await prisma.appUser.findUnique({ where: { id: Number(session.userId) } });
    if (!user) return NextResponse.json({ success: false, message: "Usuario no encontrado" }, { status: 404 });

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ success: false, message: "La contraseña actual es incorrecta" }, { status: 400 });
    }

    await prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
