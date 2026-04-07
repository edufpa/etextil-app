import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";
import styles from "../../../services/services.module.css";
import ProviderReportClient from "./ProviderReportClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProviderReportPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const providerId = parseInt(resolvedParams.id, 10);
  if (isNaN(providerId)) return notFound();

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return notFound();

  const deliveries = await prisma.providerDelivery.findMany({
    where: { provider_id: providerId },
    include: {
      incomings: true,
      orderService: {
        include: {
          service: { select: { name: true, trackBySize: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              garment: true,
              color: true,
              date: true,
              client: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  // KPI totals
  const totalSent = deliveries.reduce((s, d) => s + d.quantity, 0);
  const totalReceived = deliveries.reduce((s, d) => s + d.incomings.reduce((a, i) => a + i.quantity, 0), 0);
  const totalPending = totalSent - totalReceived;

  // By service
  const byServiceMap = new Map<string, { serviceName: string; sent: number; received: number; pending: number }>();
  for (const d of deliveries) {
    const name = d.orderService.service.name as string;
    const cur = byServiceMap.get(name) ?? { serviceName: name, sent: 0, received: 0, pending: 0 };
    const inQty = d.incomings.reduce((a, i) => a + i.quantity, 0);
    cur.sent += d.quantity;
    cur.received += inQty;
    cur.pending += d.quantity - inQty;
    byServiceMap.set(name, cur);
  }
  const byService = [...byServiceMap.values()];

  // Group by order (for client component)
  const byOrderMap = new Map<number, { orderId: number; order: any; rows: any[] }>();
  for (const d of deliveries) {
    const orderId = d.orderService.order.id;
    if (!byOrderMap.has(orderId)) {
      byOrderMap.set(orderId, {
        orderId,
        order: {
          orderNumber: d.orderService.order.orderNumber,
          clientName: d.orderService.order.client.name,
          garment: d.orderService.order.garment,
          color: d.orderService.order.color,
        },
        rows: [],
      });
    }
    const inQty = d.incomings.reduce((a, i) => a + i.quantity, 0);
    byOrderMap.get(orderId)!.rows.push({
      id: d.id,
      size: d.size,
      date: d.date.toISOString(),
      notes: d.notes,
      sentQty: d.quantity,
      received: inQty,
      pending: d.quantity - inQty,
      orderId,
      orderNumber: d.orderService.order.orderNumber,
      serviceName: d.orderService.service.name,
      incomings: d.incomings.map((i) => ({ id: i.id, quantity: i.quantity, date: i.date.toISOString() })),
    });
  }
  const orderGroups = [...byOrderMap.values()];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/providers" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className={styles.title} style={{ marginBottom: 0 }}>
              <Truck size={22} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "var(--primary)" }} />
              Reporte: {provider.businessName}
            </h1>
            {provider.contactName && (
              <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                {provider.contactName} {provider.phone ? `· ${provider.phone}` : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "1.5rem 0" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Enviado</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.25rem" }}>{totalSent}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>OPs generadas</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Recibido</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "green", marginTop: "0.25rem" }}>{totalReceived}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Ingresos registrados</div>
        </div>
        <div style={{ background: totalPending > 0 ? "#fff3e0" : "var(--card-bg)", border: `1px solid ${totalPending > 0 ? "orange" : "var(--card-border)"}`, borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>En Taller</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: totalPending > 0 ? "orange" : "var(--text-muted)", marginTop: "0.25rem" }}>{totalPending}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Sin ingresar</div>
        </div>
      </div>

      <ProviderReportClient
        providerId={providerId}
        orderGroups={orderGroups}
        byService={byService}
      />
    </div>
  );
}
