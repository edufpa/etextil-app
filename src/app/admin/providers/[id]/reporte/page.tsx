import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";
import styles from "../../../services/services.module.css";
import ProviderReportClient from "./ProviderReportClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ pending?: string; from?: string; to?: string }>;

export default async function ProviderReportPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const resolvedParams = await params;
  const sp = await searchParams;
  const providerId = parseInt(resolvedParams.id, 10);
  if (isNaN(providerId)) return notFound();

  const onlyPending = sp.pending !== "0";
  const fromDate = sp.from ? new Date(sp.from + "T00:00:00") : null;
  const toDate = sp.to ? new Date(sp.to + "T23:59:59") : null;

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return notFound();

  const deliveries = await prisma.providerDelivery.findMany({
    where: {
      provider_id: providerId,
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    },
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

  // Compute per-delivery pending
  const deliveriesWithPending = deliveries.map((d) => ({
    ...d,
    inQty: d.incomings.reduce((a, i) => a + i.quantity, 0),
    pendingQty: d.quantity - d.incomings.reduce((a, i) => a + i.quantity, 0),
  }));

  // Apply pending filter
  const filtered = onlyPending
    ? deliveriesWithPending.filter((d) => d.pendingQty > 0)
    : deliveriesWithPending;

  // KPI totals from filtered
  const totalSent = filtered.reduce((s, d) => s + d.quantity, 0);
  const totalReceived = filtered.reduce((s, d) => s + d.inQty, 0);
  const totalPending = filtered.reduce((s, d) => s + d.pendingQty, 0);

  // By service — from filtered
  const byServiceMap = new Map<string, { serviceName: string; sent: number; received: number; pending: number }>();
  for (const d of filtered) {
    const name = d.orderService.service.name as string;
    const cur = byServiceMap.get(name) ?? { serviceName: name, sent: 0, received: 0, pending: 0 };
    cur.sent += d.quantity;
    cur.received += d.inQty;
    cur.pending += d.pendingQty;
    byServiceMap.set(name, cur);
  }
  const byService = [...byServiceMap.values()].filter((s) => !onlyPending || s.pending > 0);

  // Group by order — from filtered
  const byOrderMap = new Map<number, { orderId: number; order: any; rows: any[] }>();
  for (const d of filtered) {
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
    byOrderMap.get(orderId)!.rows.push({
      id: d.id,
      size: d.size,
      date: d.date.toISOString(),
      notes: d.notes,
      sentQty: d.quantity,
      received: d.inQty,
      pending: d.pendingQty,
      orderId,
      orderNumber: d.orderService.order.orderNumber,
      serviceName: d.orderService.service.name,
      incomings: d.incomings.map((i) => ({ id: i.id, quantity: i.quantity, date: i.date.toISOString() })),
    });
  }
  const orderGroups = [...byOrderMap.values()];

  const baseUrl = `/admin/providers/${providerId}/reporte`;
  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    if (sp.pending !== undefined) p.set("pending", sp.pending);
    if (sp.from) p.set("from", sp.from);
    if (sp.to) p.set("to", sp.to);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "") p.delete(k); else p.set(k, v);
    }
    const s = p.toString();
    return `${baseUrl}${s ? `?${s}` : ""}`;
  };

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

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", padding: "0.85rem 1rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {/* Pending toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Mostrar</span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Link href={buildUrl({ pending: "" })} style={{ padding: "0.35rem 0.9rem", borderRadius: "100px", border: "1px solid orange", background: onlyPending ? "orange" : "transparent", color: onlyPending ? "white" : "orange", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none" }}>
              Solo pendientes
            </Link>
            <Link href={buildUrl({ pending: "0" })} style={{ padding: "0.35rem 0.9rem", borderRadius: "100px", border: "1px solid var(--card-border)", background: !onlyPending ? "var(--primary)" : "transparent", color: !onlyPending ? "white" : "var(--text-muted)", fontWeight: !onlyPending ? 700 : 400, fontSize: "0.8rem", textDecoration: "none" }}>
              Todos
            </Link>
          </div>
        </div>

        {/* Date range */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          {[{ label: "7d", days: 7 }, { label: "15d", days: 15 }, { label: "30d", days: 30 }, { label: "90d", days: 90 }].map(({ label, days }) => {
            const today = new Date();
            const from = new Date(today); from.setDate(today.getDate() - days + 1);
            const fromStr = from.toISOString().split("T")[0];
            const toStr = today.toISOString().split("T")[0];
            const isActive = sp.from === fromStr && sp.to === toStr;
            return (
              <Link key={days} href={buildUrl({ from: fromStr, to: toStr })} style={{ padding: "0.35rem 0.7rem", borderRadius: "100px", border: "1px solid var(--card-border)", background: isActive ? "var(--primary)" : "var(--bg-color)", color: isActive ? "white" : "var(--text-muted)", fontWeight: isActive ? 700 : 400, fontSize: "0.8rem", textDecoration: "none" }}>
                {label}
              </Link>
            );
          })}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Desde</span>
              <input type="date" defaultValue={sp.from || ""} form="date-form" name="from" style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.82rem" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Hasta</span>
              <input type="date" defaultValue={sp.to || ""} form="date-form" name="to" style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.82rem" }} />
            </div>
          </div>
        </div>

        {(sp.from || sp.to || sp.pending === "0") && (
          <Link href={baseUrl} style={{ alignSelf: "flex-end", padding: "0.35rem 0.85rem", borderRadius: "6px", border: "1px solid var(--card-border)", color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none" }}>
            Limpiar
          </Link>
        )}
      </div>

      {/* KPI Cards — reflect filtered data */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Enviado</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.25rem" }}>{totalSent}</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Recibido</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "green", marginTop: "0.25rem" }}>{totalReceived}</div>
        </div>
        <div style={{ background: totalPending > 0 ? "#fff3e0" : "var(--card-bg)", border: `1px solid ${totalPending > 0 ? "orange" : "var(--card-border)"}`, borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>En Taller</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: totalPending > 0 ? "orange" : "var(--text-muted)", marginTop: "0.25rem" }}>{totalPending}</div>
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
