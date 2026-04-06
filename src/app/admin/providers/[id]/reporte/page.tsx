import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, Send, PackageCheck, AlertCircle } from "lucide-react";
import styles from "../../../services/services.module.css";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProviderReportPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const providerId = parseInt(resolvedParams.id, 10);
  if (isNaN(providerId)) return notFound();

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return notFound();

  // Fetch all OPs (deliveries) for this provider, including each OP's incomings
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

  // KPI: sent = sum of OP quantities, received = sum of incomings
  const totalSent = deliveries.reduce((s, d) => s + d.quantity, 0);
  const totalReceived = deliveries.reduce(
    (s, d) => s + d.incomings.reduce((a, i) => a + i.quantity, 0), 0
  );
  const totalPending = totalSent - totalReceived;

  // Group by service
  const byService = new Map<string, { serviceName: string; sent: number; received: number; pending: number }>();
  for (const d of deliveries) {
    const serviceName = d.orderService.service.name as string;
    const current = byService.get(serviceName) ?? { serviceName, sent: 0, received: 0, pending: 0 };
    const incomingQty = d.incomings.reduce((a, i) => a + i.quantity, 0);
    current.sent += d.quantity;
    current.received += incomingQty;
    current.pending += d.quantity - incomingQty;
    byService.set(serviceName, current);
  }

  // Group by order
  const byOrder = new Map<number, { order: any; rows: any[] }>();
  for (const d of deliveries) {
    const orderId = d.orderService.order.id;
    if (!byOrder.has(orderId)) {
      byOrder.set(orderId, { order: d.orderService.order, rows: [] });
    }
    const incomingQty = d.incomings.reduce((a, i) => a + i.quantity, 0);
    byOrder.get(orderId)!.rows.push({
      ...d,
      sentQty: d.quantity,
      received: incomingQty,
      pending: d.quantity - incomingQty,
    });
  }

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
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>En Taller (Pendiente)</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: totalPending > 0 ? "orange" : "var(--text-muted)", marginTop: "0.25rem" }}>{totalPending}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Sin ingresar</div>
        </div>
      </div>

      {/* By service */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ padding: "0.9rem 1.25rem", background: "var(--bg-color)", borderBottom: "1px solid var(--card-border)", fontWeight: 700 }}>
          Reporte en proceso por servicio
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table} style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Servicio</th>
                <th style={{ textAlign: "center" }}>Enviado (OP)</th>
                <th style={{ textAlign: "center" }}>Recibido (Ingreso)</th>
                <th style={{ textAlign: "center" }}>En Taller</th>
              </tr>
            </thead>
            <tbody>
              {[...byService.values()].map((row) => (
                <tr key={row.serviceName}>
                  <td><strong>{row.serviceName}</strong></td>
                  <td style={{ textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>{row.sent}</td>
                  <td style={{ textAlign: "center", color: "green", fontWeight: 700 }}>{row.received}</td>
                  <td style={{ textAlign: "center", color: row.pending > 0 ? "orange" : "var(--text-muted)", fontWeight: 700 }}>
                    {row.pending > 0 ? row.pending : "✓"}
                  </td>
                </tr>
              ))}
              {byService.size === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-muted)", textAlign: "center" }}>
                    Sin movimientos por servicio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail by order */}
      {byOrder.size === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          No hay OPs generadas para este proveedor.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {[...byOrder.values()].map(({ order, rows }) => {
            const orderPending = rows.reduce((s: number, r: any) => s + r.pending, 0);
            return (
              <div key={order.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.5rem", background: "var(--bg-color)", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <Link href={`/admin/orders/${order.id}`} style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>
                      Pedido {order.orderNumber}
                    </Link>
                    <span style={{ color: "var(--text-muted)", marginLeft: "0.75rem", fontSize: "0.875rem" }}>
                      {order.client.name} · {order.garment} · {order.color}
                    </span>
                  </div>
                  {orderPending > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#fff3e0", color: "orange", border: "1px solid orange", borderRadius: "999px", padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700 }}>
                      <AlertCircle size={13} /> {orderPending} en taller
                    </span>
                  )}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className={styles.table} style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Talla</th>
                        <th>Fecha OP</th>
                        <th style={{ textAlign: "center" }}>Enviado</th>
                        <th style={{ textAlign: "center" }}>Ingresado</th>
                        <th style={{ textAlign: "center" }}>En Taller</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row: any) => (
                        <tr key={row.id} style={{ background: row.pending > 0 ? "#fff8f0" : undefined }}>
                          <td><strong>{row.orderService.service.name}</strong></td>
                          <td>
                            {row.size ? (
                              <span style={{ background: "var(--primary)", color: "white", padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
                                {row.size}
                              </span>
                            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            {new Date(row.date).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", fontWeight: 700 }}>
                              <Send size={13} /> {row.sentQty}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "green", fontWeight: 700 }}>
                              <PackageCheck size={13} /> {row.received}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ fontWeight: 700, color: row.pending > 0 ? "orange" : "var(--text-muted)" }}>
                              {row.pending > 0 ? row.pending : "✓"}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {row.notes || "—"}
                          </td>
                        </tr>
                      ))}
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
