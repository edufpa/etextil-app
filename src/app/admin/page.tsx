import { prisma } from "@/lib/prisma";
import { Package, Users, FileText, Truck, TrendingUp } from "lucide-react";
import styles from "./dashboard.module.css";
import Link from "next/link";

export const dynamic = 'force-dynamic';

const DAYS = 14;

function formatDay(d: Date) {
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" });
}

function getDayKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const since = new Date(today);
  since.setDate(since.getDate() - DAYS + 1);
  since.setHours(0, 0, 0, 0);

  const [
    totalActiveOrders,
    totalPendingGarments,
    totalClients,
    totalProviders,
    providerDeliveries,
    guideDetails,
  ] = await Promise.all([
    prisma.order.count({ where: { status: { notIn: ["CERRADO", "CANCELADO"] } } }),
    prisma.order.aggregate({
      where: { status: { notIn: ["CERRADO", "CANCELADO"] } },
      _sum: { totalQuantity: true },
    }),
    prisma.client.count({ where: { status: true } }),
    prisma.provider.count({ where: { status: true } }),
    prisma.providerDelivery.findMany({
      where: { date: { gte: since, lte: today } },
      include: {
        orderService: { include: { service: { select: { name: true } } } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.guideDetail.findMany({
      where: { guide: { date: { gte: since, lte: today }, status: "ACTIVA" } },
      include: { guide: { select: { date: true } } },
    }),
  ]);

  // Build array of last N days
  const days: Date[] = [];
  for (let i = 0; i < DAYS; i++) {
    days.push(addDays(since, i));
  }

  // Build matrix: rows = services + "Entregas SUNAT"
  // Collect all unique services with deliveries
  const serviceMap = new Map<string, Map<string, number>>(); // serviceName -> { dayKey -> qty }

  for (const d of providerDeliveries) {
    const svcName = d.orderService.service.name;
    const dayKey = getDayKey(new Date(d.date));
    if (!serviceMap.has(svcName)) serviceMap.set(svcName, new Map());
    const dayMap = serviceMap.get(svcName)!;
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + d.quantity);
  }

  // SUNAT row
  const sunatRow = new Map<string, number>();
  for (const gd of guideDetails) {
    const dayKey = getDayKey(new Date(gd.guide.date));
    sunatRow.set(dayKey, (sunatRow.get(dayKey) || 0) + gd.deliveredQuantity);
  }

  const serviceNames = [...serviceMap.keys()].sort();

  const totalProviderDeliveries = providerDeliveries.reduce((s, d) => s + d.quantity, 0);
  const totalSunat = guideDetails.reduce((s, d) => s + d.deliveredQuantity, 0);

  return (
    <div>
      <h1 className={styles.pageTitle} style={{ marginBottom: "1.5rem" }}>Dashboard de Producción</h1>

      {/* KPI Cards */}
      <div className={styles.statsGrid} style={{ marginBottom: "2rem" }}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <Package className={styles.statIcon} size={24} />
          </div>
          <div>
            <p className={styles.statLabel}>Pedidos Activos</p>
            <h3 className={styles.statValue}>{totalActiveOrders}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.blue}`}>
            <TrendingUp className={styles.statIcon} size={24} />
          </div>
          <div>
            <p className={styles.statLabel}>Prendas en Proceso</p>
            <h3 className={styles.statValue}>{totalPendingGarments._sum.totalQuantity || 0}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper}`} style={{ background: "#e8f5e9" }}>
            <FileText className={styles.statIcon} size={24} style={{ color: "green" }} />
          </div>
          <div>
            <p className={styles.statLabel}>Entregadas al cliente (14d)</p>
            <h3 className={styles.statValue}>{totalSunat}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper}`} style={{ background: "#fff3e0" }}>
            <Truck className={styles.statIcon} size={24} style={{ color: "orange" }} />
          </div>
          <div>
            <p className={styles.statLabel}>Recibidas de Prov. (14d)</p>
            <h3 className={styles.statValue}>{totalProviderDeliveries}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.blue}`}>
            <Users className={styles.statIcon} size={24} />
          </div>
          <div>
            <p className={styles.statLabel}>Clientes</p>
            <h3 className={styles.statValue}>{totalClients}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <Truck className={styles.statIcon} size={24} />
          </div>
          <div>
            <p className={styles.statLabel}>Proveedores Activos</p>
            <h3 className={styles.statValue}>{totalProviders}</h3>
          </div>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div style={{ background: "var(--card-bg)", borderRadius: "var(--radius)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Operaciones por Día (últimos {DAYS} días)</h2>
          <Link href="/admin/orders" style={{ fontSize: "0.85rem", color: "var(--primary)", textDecoration: "none" }}>Ver pedidos →</Link>
        </div>

        {serviceNames.length === 0 && sunatRow.size === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            No hay operaciones registradas en los últimos {DAYS} días.
            <br /><br />
            <Link href="/admin/orders" style={{ color: "var(--primary)" }}>Registra entregas de proveedor desde los pedidos</Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-color)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, minWidth: "160px", borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "var(--bg-color)", zIndex: 1 }}>
                    Operación / Servicio
                  </th>
                  {days.map(d => (
                    <th key={getDayKey(d)} style={{
                      padding: "0.6rem 0.5rem",
                      textAlign: "center",
                      minWidth: "60px",
                      borderBottom: "1px solid var(--card-border)",
                      fontWeight: getDayKey(d) === getDayKey(new Date()) ? 700 : 400,
                      color: getDayKey(d) === getDayKey(new Date()) ? "var(--primary)" : "var(--text-muted)",
                    }}>
                      {formatDay(d)}
                    </th>
                  ))}
                  <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", borderBottom: "1px solid var(--card-border)", fontWeight: 700 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Service rows */}
                {serviceNames.map((svcName, idx) => {
                  const dayMap = serviceMap.get(svcName)!;
                  const rowTotal = [...dayMap.values()].reduce((a, b) => a + b, 0);
                  return (
                    <tr key={svcName} style={{ background: idx % 2 === 0 ? "var(--card-bg)" : "var(--bg-color)" }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 600, borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "inherit", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", display: "inline-block", flexShrink: 0 }} />
                        {svcName}
                      </td>
                      {days.map(d => {
                        const qty = dayMap.get(getDayKey(d)) || 0;
                        return (
                          <td key={getDayKey(d)} style={{
                            padding: "0.65rem 0.5rem",
                            textAlign: "center",
                            borderBottom: "1px solid var(--card-border)",
                            fontWeight: qty > 0 ? 700 : 400,
                            color: qty > 0 ? "var(--text-color)" : "var(--text-muted)",
                            background: qty > 0 ? "rgba(99,102,241,0.06)" : "transparent",
                          }}>
                            {qty > 0 ? qty : "—"}
                          </td>
                        );
                      })}
                      <td style={{ padding: "0.65rem 0.75rem", textAlign: "center", fontWeight: 700, borderBottom: "1px solid var(--card-border)", color: "var(--primary)" }}>
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}

                {/* SUNAT row */}
                {sunatRow.size > 0 && (
                  <tr style={{ background: "#e8f5e920", borderTop: "2px solid var(--card-border)" }}>
                    <td style={{ padding: "0.65rem 1rem", fontWeight: 700, borderBottom: "1px solid var(--card-border)", position: "sticky", left: 0, background: "#e8f5e920", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "green", display: "inline-block", flexShrink: 0 }} />
                      Entregas al Cliente (SUNAT)
                    </td>
                    {days.map(d => {
                      const qty = sunatRow.get(getDayKey(d)) || 0;
                      return (
                        <td key={getDayKey(d)} style={{
                          padding: "0.65rem 0.5rem",
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
                    <td style={{ padding: "0.65rem 0.75rem", textAlign: "center", fontWeight: 700, borderBottom: "1px solid var(--card-border)", color: "green" }}>
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
