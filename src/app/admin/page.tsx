import { prisma } from "@/lib/prisma";
import { FileText, Truck, Clock, Wrench } from "lucide-react";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { companyFilter } from "@/lib/company";
import { Suspense } from "react";
import DaysSelector from "./DaysSelector";
import ProviderSelector from "./ProviderSelector";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ days?: string; provider?: string }>;

function formatDay(d: Date) {
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" });
}
function getDayKey(d: Date) {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const DAYS = Math.min(30, Math.max(7, parseInt(params.days || "14", 10)));
  const providerFilter = params.provider ? parseInt(params.provider, 10) : null;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const since = new Date(today);
  since.setDate(since.getDate() - DAYS + 1);
  since.setHours(0, 0, 0, 0);

  const filter = await companyFilter();

  const incomingWhere: any = {
    date: { gte: since, lte: today },
    ...(providerFilter ? { providerDelivery: { provider_id: providerFilter } } : {}),
  };

  const [
    allProviders,
    providerIncomings,
    guideDetails,
    activeOrdersRaw,
    allDeliveriesForPending,
  ] = await Promise.all([
    prisma.provider.findMany({
      where: { status: true, ...filter },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true },
    }),
    prisma.providerIncoming.findMany({
      where: incomingWhere,
      include: {
        providerDelivery: {
          include: {
            provider: { select: { id: true, businessName: true } },
            orderService: { include: { service: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.guideDetail.findMany({
      where: { guide: { date: { gte: since, lte: today }, status: "ACTIVA" } },
      include: { guide: { select: { date: true } } },
    }),
    prisma.order.findMany({
      where: { status: { notIn: ["ENTREGADO", "CANCELADO"] }, ...filter },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        guides: { select: { deliveredQuantity: true } },
        services: { select: { deliveries: { select: { quantity: true } } } },
      },
    }),
    prisma.providerDelivery.findMany({
      where: { provider: { ...filter } },
      select: {
        quantity: true,
        incomings: { select: { quantity: true } },
        orderService: { select: { service: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  // Derive status for each active order
  const activeOrders = activeOrdersRaw.map((o: any) => {
    const totalDelivered = o.guides.reduce((acc: number, g: any) => acc + g.deliveredQuantity, 0);
    const sentToWorkshop = o.services.reduce((acc: number, svc: any) =>
      acc + svc.deliveries.reduce((a: number, d: any) => a + d.quantity, 0), 0);
    const derivedStatus =
      totalDelivered >= o.totalQuantity ? "ENTREGADO"
      : totalDelivered > 0 ? "PARCIALMENTE ENTREGADO"
      : sentToWorkshop > 0 ? "EN PROCESO"
      : "PENDIENTE";
    return { ...o, derivedStatus, totalDelivered, sentToWorkshop };
  });

  const pendienteOrders = activeOrders.filter((o: any) => o.derivedStatus === "PENDIENTE");
  const enProcesoOrders = activeOrders.filter((o: any) => o.derivedStatus === "EN PROCESO");

  // Pending by service (all-time)
  const pendingByService = new Map<string, { id: number; pending: number }>();
  for (const d of allDeliveriesForPending) {
    const inQty = d.incomings.reduce((a: number, i: any) => a + i.quantity, 0);
    const pendingQty = d.quantity - inQty;
    if (pendingQty <= 0) continue;
    const svc = d.orderService.service;
    if (!pendingByService.has(svc.name)) pendingByService.set(svc.name, { id: svc.id, pending: 0 });
    pendingByService.get(svc.name)!.pending += pendingQty;
  }
  const pendingServiceList = [...pendingByService.entries()]
    .sort((a, b) => b[1].pending - a[1].pending);

  // Build days array
  const days: Date[] = [];
  for (let i = 0; i < DAYS; i++) days.push(addDays(since, i));

  // Build matrix: rows = services (name → { id, days })
  const serviceMap = new Map<string, { id: number; days: Map<string, number> }>();
  for (const inc of providerIncomings) {
    const svc = inc.providerDelivery.orderService.service;
    const dayKey = getDayKey(new Date(inc.date));
    if (!serviceMap.has(svc.name)) serviceMap.set(svc.name, { id: svc.id, days: new Map() });
    const entry = serviceMap.get(svc.name)!;
    entry.days.set(dayKey, (entry.days.get(dayKey) || 0) + inc.quantity);
  }

  // Despachos row (not filtered by provider — always global)
  const sunatRow = new Map<string, number>();
  if (!providerFilter) {
    for (const gd of guideDetails) {
      const dayKey = getDayKey(new Date(gd.guide.date));
      sunatRow.set(dayKey, (sunatRow.get(dayKey) || 0) + gd.deliveredQuantity);
    }
  }

  const serviceNames = [...serviceMap.keys()].sort();
  const totalSunat = guideDetails.reduce((s, d) => s + d.deliveredQuantity, 0);

  const selectedProvider = providerFilter
    ? allProviders.find((p) => p.id === providerFilter)
    : null;

  return (
    <div>
      <h1 className={styles.pageTitle} style={{ marginBottom: "1rem" }}>Dashboard de Producción</h1>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "stretch", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {/* Entregadas cliente */}
        <div className={styles.statCardCompact} style={{ flexShrink: 0 }}>
          <FileText size={18} style={{ color: "green", flexShrink: 0 }} />
          <div>
            <p className={styles.statLabelCompact}>Entregadas Cliente ({DAYS}d)</p>
            <h3 className={styles.statValueCompact} style={{ color: "green" }}>{totalSunat}</h3>
          </div>
        </div>

        {/* Pending by service chips */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", margin: 0 }}>Pendiente en Taller por Servicio</p>
          {pendingServiceList.length === 0 ? (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Sin pendientes</span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {pendingServiceList.map(([name, { id, pending }]) => (
                <Link key={id} href={`/admin/services/reporte/${id}`} style={{ textDecoration: "none" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(245,158,11,0.1)", border: "1px solid orange", borderRadius: "100px", padding: "0.3rem 0.85rem", fontSize: "0.82rem", cursor: "pointer" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-color)" }}>{name}</span>
                    <span style={{ fontWeight: 800, color: "orange" }}>{pending}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE ORDERS: PENDIENTE + EN PROCESO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

        {/* PENDIENTE — solo total */}
        <Link href="/admin/orders?status=PENDIENTE" style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--card-bg)", borderRadius: "var(--radius)", border: "1px solid var(--card-border)", padding: "1.5rem 1.75rem", display: "flex", alignItems: "center", gap: "1rem", height: "100%" }}>
            <Clock size={28} style={{ color: "orange", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", margin: "0 0 0.25rem" }}>Pedidos Pendientes</p>
              <h3 style={{ fontSize: "2.5rem", fontWeight: 800, color: "orange", margin: 0, lineHeight: 1 }}>{pendienteOrders.length}</h3>
            </div>
          </div>
        </Link>

        {/* EN PROCESO */}
        <div style={{ background: "var(--card-bg)", borderRadius: "var(--radius)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wrench size={16} style={{ color: "#7c3aed" }} />
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "#7c3aed" }}>
              En Proceso <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>({enProcesoOrders.length})</span>
            </h2>
            <Link href="/admin/orders?status=EN PROCESO" style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--primary)", textDecoration: "none" }}>Ver todos →</Link>
          </div>
          {enProcesoOrders.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>Sin pedidos en proceso</div>
          ) : (
            <div style={{ maxHeight: "280px", overflowY: "auto" }}>
              {enProcesoOrders.map((o: any) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1.25rem", borderBottom: "1px solid var(--card-border)", textDecoration: "none", color: "inherit" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{o.orderNumber}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{o.client.name} — {o.garment}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#7c3aed" }}>{o.sentToWorkshop} env.</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{o.totalQuantity} total</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div style={{ background: "var(--card-bg)", borderRadius: "var(--radius)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
              Ingresos de Taller por Día — últimos {DAYS} días
            </h2>
            {selectedProvider && (
              <span style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600 }}>
                Taller: {selectedProvider.businessName}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Suspense fallback={null}>
              <ProviderSelector providers={allProviders} />
            </Suspense>
            <Suspense fallback={null}>
              <DaysSelector />
            </Suspense>
            <Link href="/admin/orders" style={{ fontSize: "0.82rem", color: "var(--primary)", textDecoration: "none" }}>
              Ver pedidos →
            </Link>
          </div>
        </div>

        {serviceNames.length === 0 && sunatRow.size === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            No hay ingresos de taller en los últimos {DAYS} días
            {selectedProvider ? ` para ${selectedProvider.businessName}` : ""}.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-color)" }}>
                  <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 700, minWidth: "160px", borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "var(--bg-color)", zIndex: 1 }}>
                    Operación / Servicio
                  </th>
                  {days.map(d => {
                    const isToday = getDayKey(d) === getDayKey(new Date());
                    return (
                      <th key={getDayKey(d)} style={{
                        padding: "0.5rem 0.4rem",
                        textAlign: "center",
                        minWidth: "52px",
                        borderBottom: "1px solid var(--card-border)",
                        fontWeight: isToday ? 700 : 400,
                        color: isToday ? "var(--primary)" : "var(--text-muted)",
                        fontSize: "0.75rem",
                      }}>
                        {formatDay(d)}
                      </th>
                    );
                  })}
                  <th style={{ padding: "0.5rem 0.65rem", textAlign: "center", borderBottom: "1px solid var(--card-border)", fontWeight: 700, minWidth: "50px" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {serviceNames.map((svcName, idx) => {
                  const entry = serviceMap.get(svcName)!;
                  const rowTotal = [...entry.days.values()].reduce((a, b) => a + b, 0);
                  return (
                    <tr key={svcName} style={{ background: idx % 2 === 0 ? "var(--card-bg)" : "var(--bg-color)" }}>
                      <td style={{ padding: "0.55rem 1rem", fontWeight: 600, borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "inherit", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--primary)", display: "inline-block", flexShrink: 0 }} />
                        <Link href={`/admin/services/reporte/${entry.id}?pending=0`} style={{ color: "inherit", textDecoration: "none" }}>
                          {svcName}
                        </Link>
                      </td>
                      {days.map(d => {
                        const dayKey = getDayKey(d);
                        const qty = entry.days.get(dayKey) || 0;
                        return (
                          <td key={dayKey} style={{
                            padding: "0.55rem 0.4rem",
                            textAlign: "center",
                            borderBottom: "1px solid var(--card-border)",
                            fontWeight: qty > 0 ? 700 : 400,
                            color: qty > 0 ? "var(--text-color)" : "var(--text-muted)",
                            background: qty > 0 ? "rgba(99,102,241,0.07)" : "transparent",
                          }}>
                            {qty > 0 ? (
                              <Link href={`/admin/services/reporte/${entry.id}?date=${dayKey}`} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
                                {qty}
                              </Link>
                            ) : "—"}
                          </td>
                        );
                      })}
                      <td style={{ padding: "0.55rem 0.65rem", textAlign: "center", fontWeight: 700, borderBottom: "1px solid var(--card-border)", color: "var(--primary)" }}>
                        <Link href={`/admin/services/reporte/${entry.id}?pending=0`} style={{ color: "inherit", textDecoration: "none" }}>
                          {rowTotal}
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {/* Despachos row — only when not filtered by provider */}
                {!providerFilter && sunatRow.size > 0 && (
                  <tr style={{ background: "#e8f5e915", borderTop: "2px solid var(--card-border)" }}>
                    <td style={{ padding: "0.55rem 1rem", fontWeight: 700, borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "#e8f5e915", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "green", display: "inline-block", flexShrink: 0 }} />
                      <Link href="/admin/guides" style={{ color: "inherit", textDecoration: "none" }}>
                        Despachos al Cliente
                      </Link>
                    </td>
                    {days.map(d => {
                      const dayKey = getDayKey(d);
                      const qty = sunatRow.get(dayKey) || 0;
                      return (
                        <td key={dayKey} style={{
                          padding: "0.55rem 0.4rem",
                          textAlign: "center",
                          borderBottom: "1px solid var(--card-border)",
                          fontWeight: qty > 0 ? 700 : 400,
                          color: qty > 0 ? "green" : "var(--text-muted)",
                          background: qty > 0 ? "rgba(0,128,0,0.05)" : "transparent",
                        }}>
                          {qty > 0 ? (
                            <Link href={`/admin/guides?from=${dayKey}&to=${dayKey}`} style={{ color: "green", textDecoration: "none", display: "block" }}>
                              {qty}
                            </Link>
                          ) : "—"}
                        </td>
                      );
                    })}
                    <td style={{ padding: "0.55rem 0.65rem", textAlign: "center", fontWeight: 700, borderBottom: "1px solid var(--card-border)", color: "green" }}>
                      <Link href="/admin/guides" style={{ color: "green", textDecoration: "none" }}>
                        {totalSunat}
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
