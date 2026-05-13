import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Scissors } from "lucide-react";
import styles from "../../services/services.module.css";
import { companyFilter } from "@/lib/company";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ service?: string; pending?: string }>;

export default async function ReporteServiciosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();

  const deliveries = await prisma.providerDelivery.findMany({
    include: {
      incomings: { select: { quantity: true } },
      provider: { select: { id: true, businessName: true } },
      orderService: {
        include: {
          service: { select: { id: true, name: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              client: { select: { name: true } },
            },
          },
        },
      },
    },
    where: { provider: { ...filter } },
    orderBy: { date: "desc" },
  });

  const allServices = await prisma.service.findMany({
    where: { status: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  type ProviderSub = { providerId: number; businessName: string; sent: number; received: number; pending: number };
  type ServiceRow = {
    serviceId: number;
    serviceName: string;
    sent: number;
    received: number;
    pending: number;
    providers: Map<number, ProviderSub>;
    orders: Set<string>;
  };

  const byService = new Map<number, ServiceRow>();

  for (const d of deliveries) {
    const inQty = d.incomings.reduce((a, i) => a + i.quantity, 0);
    const pendingQty = d.quantity - inQty;
    const svc = d.orderService.service;
    const prov = d.provider;

    if (!byService.has(svc.id)) {
      byService.set(svc.id, {
        serviceId: svc.id,
        serviceName: svc.name,
        sent: 0,
        received: 0,
        pending: 0,
        providers: new Map(),
        orders: new Set(),
      });
    }
    const row = byService.get(svc.id)!;
    row.sent += d.quantity;
    row.received += inQty;
    row.pending += pendingQty;
    row.orders.add(d.orderService.order.orderNumber);

    if (!row.providers.has(prov.id)) {
      row.providers.set(prov.id, { providerId: prov.id, businessName: prov.businessName, sent: 0, received: 0, pending: 0 });
    }
    const pr = row.providers.get(prov.id)!;
    pr.sent += d.quantity;
    pr.received += inQty;
    pr.pending += pendingQty;
  }

  let reportRows = [...byService.values()].sort((a, b) => b.pending - a.pending);

  if (params.service) {
    const sid = parseInt(params.service, 10);
    reportRows = reportRows.filter((r) => r.serviceId === sid);
  }
  if (params.pending !== "0") {
    reportRows = reportRows.filter((r) => r.pending > 0);
  }

  const totalSent = reportRows.reduce((s, r) => s + r.sent, 0);
  const totalReceived = reportRows.reduce((s, r) => s + r.received, 0);
  const totalPending = reportRows.reduce((s, r) => s + r.pending, 0);

  // Build URL helper
  const buildUrl = (key: string, value: string) => {
    const p = new URLSearchParams();
    if (key !== "service" && params.service) p.set("service", params.service);
    if (key !== "pending" && params.pending) p.set("pending", params.pending);
    if (value) p.set(key, value);
    const s = p.toString();
    return `/admin/services/reporte${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title} style={{ marginBottom: 0 }}>
          <Scissors size={22} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "var(--primary)" }} />
          Reporte por Servicio
        </h1>
      </div>

      {/* KPIs */}
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
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", padding: "1rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Servicio</label>
          <select
            defaultValue={params.service || ""}
            onChange={undefined}
            style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.875rem" }}
          >
            <option value="">Todos los servicios</option>
            {allServices.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Mostrar</label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Link href={buildUrl("pending", params.pending === "0" ? "" : "0")} style={{ padding: "0.45rem 1rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: params.pending === "0" ? "var(--bg-color)" : "var(--primary)", color: params.pending === "0" ? "inherit" : "white", fontSize: "0.875rem", textDecoration: "none", fontWeight: params.pending === "0" ? 400 : 700 }}>
              {params.pending === "0" ? "Todos" : "Con pendiente ✓"}
            </Link>
          </div>
        </div>
        {params.service && (
          <Link href="/admin/services/reporte" style={{ alignSelf: "flex-end", padding: "0.45rem 1rem", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "6px", color: "var(--text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
            Limpiar filtros
          </Link>
        )}
      </div>

      {/* Service filter links */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
        <Link href={buildUrl("service", "")} style={{ padding: "0.3rem 0.75rem", borderRadius: "100px", border: "1px solid var(--card-border)", background: !params.service ? "var(--primary)" : "var(--card-bg)", color: !params.service ? "white" : "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none", fontWeight: !params.service ? 700 : 400 }}>
          Todos
        </Link>
        {allServices.map((s) => {
          const isActive = params.service === String(s.id);
          return (
            <Link key={s.id} href={buildUrl("service", isActive ? "" : String(s.id))} style={{ padding: "0.3rem 0.75rem", borderRadius: "100px", border: "1px solid var(--card-border)", background: isActive ? "var(--primary)" : "var(--card-bg)", color: isActive ? "white" : "var(--text-color)", fontSize: "0.8rem", textDecoration: "none", fontWeight: isActive ? 700 : 400 }}>
              {s.name}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        {reportRows.length === 0 ? (
          <div className={styles.emptyState}>No hay datos con los filtros seleccionados.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Servicio</th>
                <th style={{ textAlign: "center" }}>Enviado</th>
                <th style={{ textAlign: "center" }}>Recibido</th>
                <th style={{ textAlign: "center" }}>En Proceso</th>
                <th style={{ textAlign: "center" }}>Talleres</th>
                <th style={{ textAlign: "center" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.serviceId}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Scissors size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                      <strong>{row.serviceName}</strong>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>{row.sent}</td>
                  <td style={{ textAlign: "center", color: "green", fontWeight: 700 }}>{row.received}</td>
                  <td style={{ textAlign: "center", color: row.pending > 0 ? "orange" : "var(--text-muted)", fontWeight: 800 }}>
                    {row.pending > 0 ? row.pending : "✓"}
                  </td>
                  <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {row.providers.size}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link href={`/admin/services/reporte/${row.serviceId}`} className={styles.editBtn} style={{ fontSize: "0.8rem" }}>
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
