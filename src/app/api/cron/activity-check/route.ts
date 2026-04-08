import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Returns the previous business day (Mon–Fri) relative to a given date */
function getPreviousBusinessDay(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export async function GET(req: NextRequest) {
  // Vercel passes this header automatically for cron jobs when CRON_SECRET is set
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Previous business day in UTC (Vercel runs at 14:00 UTC = 09:00 Lima UTC-5)
  const prevDay = getPreviousBusinessDay(new Date());
  const dayStart = new Date(prevDay);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(prevDay);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const [incomings, orders] = await Promise.all([
    prisma.providerIncoming.count({
      where: { date: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    }),
  ]);

  const dayLabel = prevDay.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  });

  // Activity found — no alert needed
  if (incomings > 0 || orders > 0) {
    console.log(`[cron] Activity found for ${dayLabel}: ${incomings} incomings, ${orders} orders.`);
    return NextResponse.json({
      ok: true,
      alert: false,
      day: dayLabel,
      incomings,
      orders,
    });
  }

  // No activity — send alert email
  const toRaw = process.env.ALERT_EMAIL_TO;
  if (!toRaw) {
    console.error("[cron] ALERT_EMAIL_TO not configured.");
    return NextResponse.json({ error: "ALERT_EMAIL_TO not set" }, { status: 500 });
  }
  // Support comma-separated list of recipients
  const to = toRaw.split(",").map((e) => e.trim()).filter(Boolean);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://etextil-app.vercel.app";

  await resend.emails.send({
    from: process.env.ALERT_EMAIL_FROM ?? "Etextil <onboarding@resend.dev>",
    to,
    subject: `⚠️ Sin actividad el ${dayLabel} — Etextil`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:28px 36px;">
            <span style="color:#ffffff;font-size:1.1rem;font-weight:700;letter-spacing:-0.02em;">📦 ETEXTIL</span>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="background:#fef2f2;border-left:4px solid #ef4444;padding:18px 36px;">
            <p style="margin:0;font-size:0.8rem;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.05em;">Alerta de Inactividad</p>
            <p style="margin:6px 0 0;font-size:1.25rem;font-weight:700;color:#1a1a2e;">Sin actividad registrada</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 36px;">
            <p style="margin:0 0 16px;color:#374151;font-size:0.95rem;line-height:1.6;">
              No se registró ninguna actividad durante el día hábil anterior:
            </p>

            <!-- Day chip -->
            <div style="background:#f3f4f6;border-radius:8px;padding:14px 20px;margin-bottom:24px;text-align:center;">
              <span style="font-size:1rem;font-weight:700;color:#1d4ed8;text-transform:capitalize;">${dayLabel}</span>
            </div>

            <!-- Stats -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td width="50%" style="padding:0 8px 0 0;">
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:800;color:#6b7280;">0</div>
                    <div style="font-size:0.75rem;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">Ingresos de taller</div>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 0 8px;">
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:800;color:#6b7280;">0</div>
                    <div style="font-size:0.75rem;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-top:2px;">Pedidos creados</div>
                  </div>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#6b7280;font-size:0.875rem;line-height:1.6;">
              Verificá si el sistema está siendo utilizado correctamente o si hubo algún inconveniente con la carga de datos.
            </p>

            <!-- CTA -->
            <a href="${appUrl}/admin"
               style="display:block;text-align:center;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:700;font-size:0.95rem;">
              Ir al Dashboard de Producción →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:0.75rem;color:#9ca3af;">
              Etextil · Sistema de Gestión de Producción<br>
              Este correo se envía automáticamente cada día hábil a las 9:00 AM.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });

  console.log(`[cron] Alert sent for ${dayLabel} to ${to.join(", ")}`);
  return NextResponse.json({ ok: true, alert: true, day: dayLabel });
}
