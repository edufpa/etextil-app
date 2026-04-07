import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BarChart2, Truck } from "lucide-react";
import styles from "../../services/services.module.css";
import { companyFilter } from "@/lib/company";
import { Suspense } from "react";
import ReporteTalleresFilters from "./ReporteTalleresFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ provider?: string; service?: string; pending?: string }>;

export default async function ProvidersGlobalReportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();

  const [deliveries, allServices, allProviders] = await Promise.all([
    prisma.providerDelivery.findMany({
      include: {
        incomings: true,
        provider: { select: { id: true, businessName: true } },
        orderService: {
          include: {
            service: { select: { name: true } },
            order: { select: { id: true, orderNumber: true, client: { select: { name: true } } } },
          },
        },
      },
      where: { provider: { ...filter } },
      orderBy: { date: "desc" },
    }),
    prisma.service.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.provider.findMany({ where: { status: true, ...filter }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
  ]);

  type ProviderRow = {
    providerId: number;
    businessName: string;
    sent: number;
    received: number;
    pending: number;
    services: Record<string, { sent: number; received: number; pending: number }>;
  };

  const byProvider = new Map<number, ProviderRow>();

  for (const d of deliveries) {
    const inQty = d.incomings.reduce((a, i) => a + i.quantity, 0);
    const pendingQty = d.quantity - inQty;
    const pId = d.provider.id as number;
    const sName = d.orderService.service.name as string;

    if (!byProvider.has(pId)) {
      byProvider.set(pId, { providerId: pId, businessName: d.provider.businessName as string, sent: 0, received: 0, pending: 0, services: {} });
    }
    const row = byProvider.get(pId)!;
    row.sent += d.quantity;
    row.received += inQty;
    row.pending += pendingQty;

    if (!row.services[sName]) row.services[sName] = { sent: 0, received: 0, pending: 0 };
    row.services[sName].sent += d.quantity;
    row.services[sName].received += inQty;
    row.services[sName].pending += pendingQty;
  }

  let reportRows = [...byProvider.values()].sort((a, b) => b.pending - a.pending);

  // Apply filters
  if (params.provider) {
    const pid = parseInt(params.provider, 10);
    reportRows = reportRows.filter((r) => r.providerId === pid);
  }
  if (params.service) {
    reportRows = reportRows.filter((r) => params.service! in r.services);
  }
  if (params.pending === "1") {
    reportRows = reportRows.filter((r) => r.pending > 0);
  }

  const totalSent = reportRows.reduce((s, r) => s + r.sent, 0);
  const totalReceived = reportRows.reduce((s, r) => s + r.received, 0);
  const totalPending = reportRows.reduce((s, r) => s + r.pending, 0);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/providers" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>
            <BarChart2 size={22} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "var(--primary)" }} />
            Reporte Global por Taller
          </h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "1.5rem 0" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Enviado</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.25rem" }}>{totalSent}</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Recibido</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "green", marginTop: "0.25rem" }}>{totalReceived}</div>
        </div>
        <div style={{ background: totalPending > 0 ? "#fff3e0" : "var(--card-bg)", border: `1px solid ${totalPending > 0 ? "orange" : "var(--card-border)"}`, borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>En Proceso</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: totalPending > 0 ? "orange" : "var(--text-muted)", marginTop: "0.25rem" }}>{totalPending}</div>
        </div>
      </div>

      <Suspense fallback={null}>
        <ReporteTalleresFilters services={allServices} providers={allProviders} />
      </Suspense>

      <div className={styles.tableContainer}>
        {reportRows.length === 0 ? (
          <div className={styles.emptyState}>No hay talleres con los filtros seleccionados.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Taller</th>
                <th style={{ textAlign: "center" }}>Enviado</th>
                <th style={{ textAlign: "center" }}>Recibido</th>
                <th style={{ textAlign: "center" }}>En Proceso</th>
                <th>Servicios</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => {
                const servicesSummary = Object.entries(row.services).filter(
                  ([name]) => !params.service || name === params.service
                );
                return (
                  <tr key={row.providerId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Truck size={16} style={{ color: "var(--primary)" }} />
                        <strong>{row.businessName}</strong>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>{row.sent}</td>
                    <td style={{ textAlign: "center", color: "green", fontWeight: 700 }}>{row.received}</td>
                    <td style={{ textAlign: "center", color: row.pending > 0 ? "orange" : "var(--text-muted)", fontWeight: 800 }}>{row.pending > 0 ? row.pending : "✓"}</td>
                    <td style={{ fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        {servicesSummary.map(([name, data]) => (
                          <div key={name}>
                            <strong>{name}:</strong>{" "}
                            <span style={{ color: "var(--primary)" }}>Env {data.sent}</span>{" · "}
                            <span style={{ color: "green" }}>Rec {data.received}</span>{" · "}
                            <span style={{ color: data.pending > 0 ? "orange" : "var(--text-muted)", fontWeight: data.pending > 0 ? 700 : 400 }}>
                              {data.pending > 0 ? `${data.pending} pend.` : "✓"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/providers/${row.providerId}/reporte`} className={styles.editBtn} style={{ fontSize: "0.8rem" }}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
