import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";
import styles from "../../services/services.module.css";
import { companyFilter } from "@/lib/company";
import { Suspense } from "react";
import ReporteTalleresFilters from "./ReporteTalleresFilters";
import TallerAccordion from "./TallerAccordion";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ provider?: string; service?: string; pending?: string }>;

export default async function ProvidersGlobalReportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();

  // Default: show only pending
  const onlyPending = params.pending !== "0";

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

    // Row totals and service breakdown: always sum only from pending OPs
    if (pendingQty > 0) {
      row.sent += d.quantity;
      row.received += inQty;
      row.pending += pendingQty;

      if (!row.services[sName]) row.services[sName] = { sent: 0, received: 0, pending: 0 };
      row.services[sName].sent += d.quantity;
      row.services[sName].received += inQty;
      row.services[sName].pending += pendingQty;
    }
  }

  let reportRows = [...byProvider.values()].sort((a, b) => b.pending - a.pending);

  if (params.provider) {
    const pid = parseInt(params.provider, 10);
    reportRows = reportRows.filter((r) => r.providerId === pid);
  }
  if (params.service) {
    reportRows = reportRows.filter((r) => params.service! in r.services);
  }
  if (onlyPending) {
    reportRows = reportRows.filter((r) => r.pending > 0);
  }

  // Re-compute row totals from service breakdown AFTER service filter
  if (params.service) {
    for (const row of reportRows) {
      const filteredSvcs = Object.entries(row.services).filter(([name]) => name === params.service);
      row.sent = filteredSvcs.reduce((s, [, v]) => s + v.sent, 0);
      row.received = filteredSvcs.reduce((s, [, v]) => s + v.received, 0);
      row.pending = filteredSvcs.reduce((s, [, v]) => s + v.pending, 0);
    }
    // Re-filter rows that now have 0 pending after service filter
    if (onlyPending) {
      reportRows = reportRows.filter((r) => r.pending > 0);
    }
  }

  // KPIs from filtered rows
  const totalSent = reportRows.reduce((s, r) => s + r.sent, 0);
  const totalReceived = reportRows.reduce((s, r) => s + r.received, 0);
  const totalPending = reportRows.reduce((s, r) => s + r.pending, 0);

  const baseUrl = "/admin/providers/reporte";

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

      {/* KPI Cards */}
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

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", padding: "0.85rem 1rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", marginBottom: "1rem", flexWrap: "wrap" }}>
        {/* Pending toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Mostrar</span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Link href={`${baseUrl}${params.provider ? `?provider=${params.provider}` : ""}`} style={{ padding: "0.35rem 0.9rem", borderRadius: "100px", border: "1px solid orange", background: onlyPending ? "orange" : "transparent", color: onlyPending ? "white" : "orange", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none" }}>
              Solo pendientes
            </Link>
            <Link href={`${baseUrl}?pending=0${params.provider ? `&provider=${params.provider}` : ""}${params.service ? `&service=${params.service}` : ""}`} style={{ padding: "0.35rem 0.9rem", borderRadius: "100px", border: "1px solid var(--card-border)", background: !onlyPending ? "var(--primary)" : "transparent", color: !onlyPending ? "white" : "var(--text-muted)", fontWeight: !onlyPending ? 700 : 400, fontSize: "0.8rem", textDecoration: "none" }}>
              Todos
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <ReporteTalleresFilters services={allServices} providers={allProviders} />
        </Suspense>
      </div>

      {/* Column headers */}
      <div style={{ display: "flex", alignItems: "center", padding: "0.5rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem", gap: "1rem" }}>
        <div style={{ flex: 1 }}>Taller</div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <span style={{ minWidth: "4rem", textAlign: "center", color: "var(--primary)" }}>Enviado</span>
          <span style={{ minWidth: "4rem", textAlign: "center", color: "green" }}>Recibido</span>
          <span style={{ minWidth: "4rem", textAlign: "center", color: "orange" }}>Pendiente</span>
        </div>
        <span style={{ minWidth: "80px" }}></span>
        <span style={{ width: "18px" }}></span>
      </div>

      {/* Accordion rows */}
      {reportRows.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          No hay talleres con trabajo pendiente.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {reportRows.map((row) => {
            const serviceList = Object.entries(row.services)
              .filter(([name, s]) => (!onlyPending || s.pending > 0) && (!params.service || name === params.service))
              .map(([name, s]) => ({ name, ...s }))
              .sort((a, b) => b.pending - a.pending);
            return (
              <TallerAccordion
                key={row.providerId}
                providerId={row.providerId}
                businessName={row.businessName}
                sent={row.sent}
                received={row.received}
                pending={row.pending}
                services={serviceList}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

