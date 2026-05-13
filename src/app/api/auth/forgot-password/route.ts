import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ success: false, message: "Email requerido" }, { status: 400 });

    const user = await prisma.appUser.findFirst({ where: { email: email.toLowerCase() } });

    // Always return success to avoid email enumeration
    if (!user) return NextResponse.json({ success: true });

    // Invalidate old tokens
    await prisma.passwordResetToken.updateMany({
      where: { user_id: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { token, user_id: user.id, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await resend.emails.send({
      from: "SIAT eTextil <noreply@idakoos.com>",
      to: email,
      subject: "Recuperación de contraseña — SIAT eTextil",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <h2 style="color:#2563eb;margin-bottom:1rem">Recuperar contraseña</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Hacé clic en el botón para continuar:</p>
          <a href="${resetUrl}" style="display:inline-block;margin:1.5rem 0;padding:0.75rem 1.5rem;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:700">
            Restablecer contraseña
          </a>
          <p style="color:#888;font-size:0.85rem">Este enlace expira en 1 hora. Si no solicitaste esto, ignorá este correo.</p>
          <p style="color:#bbb;font-size:0.78rem;margin-top:2rem">SIAT — Sistema Integral de Administración Textil</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
