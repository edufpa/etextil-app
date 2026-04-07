import { prisma } from "@/lib/prisma";
import { Package, Users, FileText, Truck, TrendingUp } from "lucide-react";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { companyFilter } from "@/lib/company";
import { Suspense } from "react";
import DaysSelector from "./DaysSelector";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ days?: string }>;

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

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const since = new Date(today);
  since.setDate(since.getDate() - DAYS + 1);
  since.setHours(0, 0, 0, 0);

  const filter = await companyFilter();

  const [
    totalActiveOrders,
    totalPendingGarments,
    totalClients,
    totalProviders,
    providerIncomings,
    guideDetails,
    totalIncomingsKpi,
  ] = await Promise.all([
    prisma.order.count({ where: { status: { notIn: ["CERRADO", "CANCELADO"] }, ...filter } }),
    prisma.order.aggregate({
      where: { status: { notIn: ["CERRADO", "CANCELADO"] }, ...filter },
      _sum: { totalQuantity: true },
    }),
    prisma.client.count({ where: { status: true, ...filter } }),
    prisma.provider.count({ where: { status: true, ...filter } }),
    // Incomings for matrix (received FROM providers in period)
    prisma.providerIncoming.findMany({
      where: { date: { gte: since, lte: today } },
      include: {
        providerDelivery: {
          include: {
            orderService: { include: { service: { select: { name: true } } } },
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.guideDetail.findMany({
      where: { guide: { date: { gte: since, lte: today }, status: "ACTIVA" } },
      include: { guide: { select: { date: true } } },
    }),
    // KPI: total received from providers (last DAYS)
    prisma.providerIncoming.aggregate({
      where: { date: { gte: since, lte: today } },
      _sum: { quantity: true },
    }),
  ]);

  // Build days array
  const days: Date[] = [];
  for (let i = 0; i < DAYS; i++) days.push(addDays(since, i));

  // Build matrix: rows = services (from incomings)
  const serviceMap = new Map<string, Map<string, number>>();

  for (const inc of providerIncomings) {
    const svcName = inc.providerDelivery.orderService.service.name;
    const dayKey = getDayKey(new Date(inc.date));
    if (!serviceMap.has(svcName)) serviceMap.set(svcName, new Map());
    const dayMap = serviceMap.get(svcName)!;
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + inc.quantity);
  }

  // SUNAT / Despachos row
  const sunatRow = new Map<string, number>();
  for (const gd of guideDetails) {
    const dayKey = getDayKey(new Date(gd.guide.date));
    sunatRow.set(dayKey, (sunatRow.get(dayKey) || 0) + gd.deliveredQuantity);
  }

  const serviceNames = [...serviceMap.keys()].sort();
  const totalIncomings = totalIncomingsKpi._sum.quantity || 0;
  const totalSunat = guideDetails.reduce((s, d) => s + d.deliveredQuantity, 0);

  return (
    <div>
      <h1 className={styles.pageTitle} style={{ marginBottom: "1rem" }}>Dashboard de Producción</h1>

      {/* Compact KPI Cards */}
      <div className={styles.statsGridCompact} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.statCardCompact}>
          <Package size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <div>
            <p className={styles.statLabelCompact}>Pedidos Activos</p>
            <h3 className={styles.statValueCompact}>{totalActiveOrders}</h3>
          </div>
        </div>
        <div className={styles.statCardCompact}>
          <TrendingUp size={18} style={{ color: "#8b5cf6", flexShrink: 0 }} />
          <div>
            <p className={styles.statLabelCompact}>Prendas en Proceso</p>
            <h3 className={styles.statValueCompact}>{totalPendingGarments._sum.totalQuantity || 0}</h3>
          </div>
        </div>
        <div className={styles.statCardCompact}>
          <FileText size={18} style={{ color: "green", flexShrink: 0 }} />
          <div>
            <p className={styles.statLabelCompact}>Entregadas Cliente ({DAYS}d)</p>
            <h3 className={styles.statValueCompact} style={{ color: "green" }}>{totalSunat}</h3>
          </div>
        </div>
        <div className={styles.statCardCompact}>
          <Truck size={18} style={{ color: "orange", flexShrink: 0 }} />
          <div>
            <p className={styles.statLabelCompact}>Ingresadas de Taller ({DAYS}d)</p>
            <h3 className={styles.statValueCompact} style={{ color: "orange" }}>{totalIncomings}</h3>
          </div>
        </div>
        <div className={styles.statCardCompact}>
          <Users size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <div>
            <p className={styles.statLabelCompact}>Clientes</p>
            <h3 className={styles.statValueCompact}>{totalClients}</h3>
          </div>
        </div>
        <div className={styles.statCardCompact}>
          <Truck size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <div>
            <p className={styles.statLabelCompact}>Proveedores</p>
            <h3 className={styles.statValueCompact}>{totalProviders}</h3>
          </div>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div style={{ background: "var(--card-bg)", borderRadius: "var(--radius)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
            Ingresos de Taller por Día — últimos {DAYS} días
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Suspense fallback={null}>
              <DaysSelector />
            </Suspense>
            <Link href="/admin/orders" style={{ fontSize: "0.82rem", color: "var(--primary)", textDecoration: "none" }}>Ver pedidos →</Link>
          </div>
        </div>

        {serviceNames.length === 0 && sunatRow.size === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            No hay ingresos de taller en los últimos {DAYS} días.
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
                  const dayMap = serviceMap.get(svcName)!;
                  const rowTotal = [...dayMap.values()].reduce((a, b) => a + b, 0);
                  return (
                    <tr key={svcName} style={{ background: idx % 2 === 0 ? "var(--card-bg)" : "var(--bg-color)" }}>
                      <td style={{ padding: "0.55rem 1rem", fontWeight: 600, borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "inherit", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--primary)", display: "inline-block", flexShrink: 0 }} />
                        {svcName}
                      </td>
                      {days.map(d => {
                        const qty = dayMap.get(getDayKey(d)) || 0;
                        return (
                          <td key={getDayKey(d)} style={{
                            padding: "0.55rem 0.4rem",
                            textAlign: "center",
                            borderBottom: "1px solid var(--card-border)",
                            fontWeight: qty > 0 ? 700 : 400,
                            color: qty > 0 ? "var(--text-color)" : "var(--text-muted)",
                            background: qty > 0 ? "rgba(99,102,241,0.07)" : "transparent",
                          }}>
                            {qty > 0 ? qty : "—"}
                          </td>
                        );
                      })}
                      <td style={{ padding: "0.55rem 0.65rem", textAlign: "center", fontWeight: 700, borderBottom: "1px solid var(--card-border)", color: "var(--primary)" }}>
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}

                {/* Despachos row */}
                {sunatRow.size > 0 && (
                  <tr style={{ background: "#e8f5e915", borderTop: "2px solid var(--card-border)" }}>
                    <td style={{ padding: "0.55rem 1rem", fontWeight: 700, borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "#e8f5e915", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "green", display: "inline-block", flexShrink: 0 }} />
                      Despachos al Cliente
                    </td>
                    {days.map(d => {
                      const qty = sunatRow.get(getDayKey(d)) || 0;
                      return (
                        <td key={getDayKey(d)} style={{
                          padding: "0.55rem 0.4rem",
                          textAlign: "center",
                          borderBottom: "1px solid var(--card-border)",
                          fontWeight: qty > 0 ? 700 : 400,
                          color: qty > 0 ? "green" : "var(--text-muted)",
                          background: qty > 0 ? "rgba(0,128,0,0.05)" : "transparent",
                        }}>
                          {qty > 0 ? qty : "—"}
                        </td>
                      );
                    })}
                    <td style={{ padding: "0.55rem 0.65rem", textAlign: "center", fontWeight: 700, borderBottom: "1px solid var(--card-border)", color: "green" }}>
                      {totalSunat}
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
