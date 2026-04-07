import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Send, PackageCheck, ClipboardList, CheckCircle2 } from "lucide-react";
import styles from "../../services/services.module.css";
import { companyFilter } from "@/lib/company";
import { Suspense } from "react";
import OpsFilters from "./OpsFilters";
import OpsIncomingButton from "./OpsIncomingButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ service?: string; provider?: string; estado?: string }>;

export default async function OpenOpsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();
  const showAll = params.estado === "todas";

  const [deliveries, allServices, allProviders] = await Promise.all([
    prisma.providerDelivery.findMany({
      where: { provider: { ...filter } },
      include: {
        incomings: true,
        provider: { select: { id: true, businessName: true } },
        orderService: {
          include: {
            service: { select: { id: true, name: true } },
            order: {
              select: {
                id: true,
                orderNumber: true,
                garment: true,
                color: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    prisma.service.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.provider.findMany({ where: { status: true, ...filter }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
  ]);

  const withPending = deliveries.map((d) => {
    const inQty = d.incomings.reduce((s, i) => s + i.quantity, 0);
    return { ...d, received: inQty, pending: d.quantity - inQty };
  });

  // Filter by open/all status
  const statusFiltered = showAll ? withPending : withPending.filter((d) => d.pending > 0);

  // Apply service / provider filters
  let filtered = statusFiltered;
  if (params.service) {
    filtered = filtered.filter((d) => d.orderService.service.name === params.service);
  }
  if (params.provider) {
    const pid = parseInt(params.provider, 10);
    filtered = filtered.filter((d) => d.provider_id === pid);
  }

  // Group by service
  const byService = new Map<string, { serviceName: string; ops: any[] }>();
  for (const d of filtered) {
    const name = d.orderService.service.name as string;
    if (!byService.has(name)) byService.set(name, { serviceName: name, ops: [] });
    byService.get(name)!.ops.push({
      id: d.id,
      size: d.size,
      date: d.date,
      quantity: d.quantity,
      received: d.received,
      pending: d.pending,
      providerName: d.provider.businessName,
      providerId: d.provider_id,
      orderId: d.orderService.order.id,
      orderNumber: d.orderService.order.orderNumber,
      garment: d.orderService.order.garment,
      color: d.orderService.order.color,
      clientName: d.orderService.order.client.name,
    });
  }

  const totalPending = filtered.reduce((s, d) => s + d.pending, 0);
  const totalOps = showAll ? filtered.length : filtered.filter((d) => d.pending > 0).length;
  const openCount = withPending.filter((d) => d.pending > 0).length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/providers/reporte" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>
            <ClipboardList size={22} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "var(--primary)" }} />
            OPs {showAll ? "— Historial Completo" : "Abiertas — Servicios en Proceso"}
          </h1>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "1.5rem 0" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>OPs Abiertas</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.25rem" }}>{openCount}</div>
        </div>
        <div style={{ background: "#fff3e0", border: "1px solid orange", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Unidades en Taller</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "orange", marginTop: "0.25rem" }}>{totalPending}</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Servicios activos</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-color)", marginTop: "0.25rem" }}>{byService.size}</div>
        </div>
      </div>

      <Suspense fallback={null}>
        <OpsFilters services={allServices} providers={allProviders} />
      </Suspense>

      {byService.size === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          No hay OPs con los filtros seleccionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {[...byService.values()].map(({ serviceName, ops }) => {
            const svcPending = ops.reduce((s: number, o: any) => s + o.pending, 0);
            return (
              <div key={serviceName} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <div style={{ padding: "0.9rem 1.25rem", background: "var(--bg-color)", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <strong style={{ fontSize: "1rem" }}>{serviceName}</strong>
                  {svcPending > 0 && (
                    <span style={{ background: "#fff3e0", color: "orange", border: "1px solid orange", borderRadius: "999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                      {svcPending} u. en taller
                    </span>
                  )}
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{ops.length} OP{ops.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className={styles.table} style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Taller</th>
                        <th>Talla</th>
                        <th>Fecha OP</th>
                        <th style={{ textAlign: "center" }}>Enviado</th>
                        <th style={{ textAlign: "center" }}>Ingresado</th>
                        <th style={{ textAlign: "center" }}>Pendiente</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ops.map((op: any) => {
                        const isClosed = op.pending === 0;
                        return (
                          <tr key={op.id} style={{ background: isClosed ? "#f0fff4" : "#fff8f0" }}>
                            <td>
                              <Link href={`/admin/orders/${op.orderId}`} style={{ fontWeight: 700, color: "var(--primary)" }}>
                                {op.orderNumber}
                              </Link>
                            </td>
                            <td style={{ fontSize: "0.85rem" }}>{op.clientName}</td>
                            <td>
                              <Link href={`/admin/providers/${op.providerId}/reporte`} style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.85rem" }}>
                                {op.providerName}
                              </Link>
                            </td>
                            <td>
                              {op.size ? (
                                <span style={{ background: "var(--primary)", color: "white", padding: "2px 8px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700 }}>
                                  {op.size}
                                </span>
                              ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                            </td>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                              {new Date(op.date).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", fontWeight: 700 }}>
                                <Send size={12} /> {op.quantity}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "green", fontWeight: 700 }}>
                                <PackageCheck size={12} /> {op.received}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: isClosed ? "green" : "orange", fontSize: "1rem" }}>
                              {isClosed ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }}>
                                  <CheckCircle2 size={14} /> Completo
                                </span>
                              ) : op.pending}
                            </td>
                            <td>
                              {isClosed ? (
                                <Link href={`/admin/orders/${op.orderId}`} style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                  Ver pedido →
                                </Link>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                  <OpsIncomingButton
                                    deliveryId={op.id}
                                    orderId={op.orderId}
                                    pending={op.pending}
                                  />
                                  <Link href={`/admin/orders/${op.orderId}`} style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    Ver pedido →
                                  </Link>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
