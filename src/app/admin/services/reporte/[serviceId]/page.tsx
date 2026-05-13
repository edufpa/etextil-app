import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Scissors, Truck, Package } from "lucide-react";
import styles from "../../../services/services.module.css";
import { companyFilter } from "@/lib/company";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ pending?: string; date?: string }>;

export default async function ReporteServicioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: SearchParams;
}) {
  const { serviceId } = await params;
  const sp = await searchParams;
  const onlyPending = sp.pending !== "0" && !sp.date;
  const dateFilter = sp.date || null;
  const id = parseInt(serviceId, 10);
  if (isNaN(id)) return notFound();

  const filter = await companyFilter();

  const [service, deliveries] = await Promise.all([
    prisma.service.findUnique({ where: { id }, select: { id: true, name: true } }),
    prisma.providerDelivery.findMany({
      where: {
        orderService: { service_id: id },
        provider: { ...filter },
      },
      include: {
        incomings: { orderBy: { date: "desc" }, select: { id: true, quantity: true, date: true, notes: true } },
        provider: { select: { id: true, businessName: true } },
        orderService: {
          include: {
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
  ]);

  if (!service) return notFound();

  // Group by provider
  type ProviderGroup = {
    providerId: number;
    businessName: string;
    sent: number;
    received: number;
    pending: number;
    ops: {
      id: number;
      orderNumber: string;
      garment: string;
      color: string;
      clientName: string;
      orderId: number;
      quantity: number;
      received: number;
      pending: number;
      date: Date;
      size: string | null;
      endDate: Date | null;
      dateIncomingQty: number | null;
      incomings: { id: number; quantity: number; date: Date; notes: string | null }[];
    }[];
  };

  const byProvider = new Map<number, ProviderGroup>();

  for (const d of deliveries) {
    const inQty = d.incomings.reduce((a, i) => a + i.quantity, 0);
    const pendingQty = d.quantity - inQty;
    const pId = d.provider.id;

    if (!byProvider.has(pId)) {
      byProvider.set(pId, {
        providerId: pId,
        businessName: d.provider.businessName,
        sent: 0,
        received: 0,
        pending: 0,
        ops: [],
      });
    }
    const grp = byProvider.get(pId)!;
    grp.sent += d.quantity;
    grp.received += inQty;
    grp.pending += pendingQty;
    const lastIncoming = d.incomings.length > 0
      ? d.incomings.reduce((latest, i) => new Date(i.date) > new Date(latest.date) ? i : latest)
      : null;
    const dateIncomingQty = dateFilter
      ? d.incomings.filter(i => new Date(i.date).toISOString().split("T")[0] === dateFilter)
          .reduce((a, i) => a + i.quantity, 0)
      : null;
    grp.ops.push({
      id: d.id,
      orderNumber: d.orderService.order.orderNumber,
      garment: d.orderService.order.garment,
      color: d.orderService.order.color,
      clientName: d.orderService.order.client.name,
      orderId: d.orderService.order.id,
      quantity: d.quantity,
      received: inQty,
      size: d.size,
      pending: pendingQty,
      date: d.date,
      endDate: pendingQty === 0 && lastIncoming ? new Date(lastIncoming.date) : null,
      dateIncomingQty,
      incomings: d.incomings,
    });
  }

  let groups = [...byProvider.values()].sort((a, b) => b.pending - a.pending);
  if (dateFilter) {
    groups = groups
      .map((g) => ({ ...g, ops: g.ops.filter((op) => (op.dateIncomingQty ?? 0) > 0) }))
      .filter((g) => g.ops.length > 0);
  } else if (onlyPending) {
    groups = groups
      .map((g) => ({ ...g, ops: g.ops.filter((op) => op.pending > 0) }))
      .filter((g) => g.ops.length > 0);
  }
  const totalSent = groups.reduce((s, g) => s + g.ops.reduce((a, op) => a + op.quantity, 0), 0);
  const totalReceived = groups.reduce((s, g) => s + g.ops.reduce((a, op) => a + op.received, 0), 0);
  const totalPending = groups.reduce((s, g) => s + g.ops.reduce((a, op) => a + op.pending, 0), 0);
  const totalDateIncoming = dateFilter
    ? groups.reduce((s, g) => s + g.ops.reduce((a, op) => a + (op.dateIncomingQty ?? 0), 0), 0)
    : 0;

  // Flat list for date-filtered view
  const flatOps = dateFilter
    ? groups.flatMap((g) => g.ops.map((op) => ({ ...op, tallerName: g.businessName })))
    : [];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/services/reporte" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>
            <Scissors size={20} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "var(--primary)" }} />
            {service.name}
          </h1>
        </div>
      </div>

      {/* KPIs */}
      {dateFilter ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", margin: "1.5rem 0" }}>
          <div style={{ background: "rgba(99,102,241,0.06)", border: "2px solid var(--primary)", borderRadius: "var(--radius)", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Ingresado el {new Date(dateFilter + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.25rem" }}>{totalDateIncoming} unidades</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {flatOps.length} OP{flatOps.length !== 1 ? "s" : ""} · {groups.length} taller{groups.length !== 1 ? "es" : ""}
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        {dateFilter && (
          <span style={{ background: "rgba(99,102,241,0.12)", border: "1px solid var(--primary)", borderRadius: "100px", padding: "0.35rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)" }}>
            📅 {new Date(dateFilter + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        )}
        <Link
          href={`/admin/services/reporte/${id}`}
          style={{
            padding: "0.45rem 1.1rem", borderRadius: "100px", border: "1px solid var(--card-border)",
            background: onlyPending && !dateFilter ? "var(--primary)" : "var(--card-bg)",
            color: onlyPending && !dateFilter ? "white" : "var(--text-muted)",
            fontSize: "0.82rem", textDecoration: "none", fontWeight: onlyPending && !dateFilter ? 700 : 400,
          }}
        >
          Solo pendientes
        </Link>
        <Link
          href={`/admin/services/reporte/${id}?pending=0`}
          style={{
            padding: "0.45rem 1.1rem", borderRadius: "100px", border: "1px solid var(--card-border)",
            background: !onlyPending && !dateFilter ? "var(--primary)" : "var(--card-bg)",
            color: !onlyPending && !dateFilter ? "white" : "var(--text-muted)",
            fontSize: "0.82rem", textDecoration: "none", fontWeight: !onlyPending && !dateFilter ? 700 : 400,
          }}
        >
          Todos
        </Link>
      </div>

      {/* FLAT TABLE when date filter active */}
      {dateFilter && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {flatOps.length === 0 ? (
            <div className={styles.emptyState}>Sin ingresos para esta fecha.</div>
          ) : (
            <table className={styles.table} style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Prenda / Color</th>
                  <th>Taller</th>
                  <th style={{ textAlign: "center" }}>Talla</th>
                  <th style={{ textAlign: "center", color: "var(--primary)" }}>Ingresado ese día</th>
                  <th>Fecha OP</th>
                </tr>
              </thead>
              <tbody>
                {flatOps.map((op) => (
                  <tr key={op.id}>
                    <td>
                      <Link href={`/admin/orders/${op.orderId}`} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
                        <Package size={14} />
                        {op.orderNumber}
                      </Link>
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>{op.clientName}</td>
                    <td style={{ fontSize: "0.875rem" }}>
                      {op.garment}
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}> · {op.color}</span>
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Truck size={13} style={{ color: "var(--text-muted)" }} />
                        {(op as any).tallerName}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {op.size ? (
                        <span style={{ background: "var(--bg-color)", border: "1px solid var(--card-border)", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>
                          {op.size}
                        </span>
                      ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 800, color: "var(--primary)", fontSize: "1rem" }}>
                      {op.dateIncomingQty}
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      {new Date(op.date).toLocaleDateString("es-PE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Groups by provider — only when NO date filter */}
      {!dateFilter && <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {groups.map((grp) => (
          <div key={grp.providerId} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {/* Provider header */}
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: "1rem", background: "var(--bg-color)" }}>
              <Truck size={16} style={{ color: "var(--primary)" }} />
              <strong style={{ fontSize: "1rem" }}>{grp.businessName}</strong>
              <div style={{ marginLeft: "auto", display: "flex", gap: "1.5rem", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--primary)" }}>Env: <strong>{grp.ops.reduce((a, op) => a + op.quantity, 0)}</strong></span>
                <span style={{ color: "green" }}>Rec: <strong>{grp.ops.reduce((a, op) => a + op.received, 0)}</strong></span>
                {(() => { const p = grp.ops.reduce((a, op) => a + op.pending, 0); return (
                  <span style={{ color: p > 0 ? "orange" : "var(--text-muted)", fontWeight: p > 0 ? 700 : 400 }}>
                    {p > 0 ? `Pend: ${p}` : "✓ Al día"}
                  </span>
                ); })()}
              </div>
            </div>

            {/* OPs table */}
            <table className={styles.table} style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Prenda / Color</th>
                  <th style={{ textAlign: "center" }}>Talla</th>
                  <th style={{ textAlign: "center" }}>Enviado</th>
                  <th style={{ textAlign: "center" }}>Recibido</th>
                  <th style={{ textAlign: "center" }}>Pendiente</th>
                  <th>Fecha OP</th>
                  <th>Fecha Fin</th>
                </tr>
              </thead>
              <tbody>
                {grp.ops.map((op) => (
                  <tr key={op.id}>
                    <td>
                      <Link href={`/admin/orders/${op.orderId}`} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
                        <Package size={14} />
                        {op.orderNumber}
                      </Link>
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>{op.clientName}</td>
                    <td style={{ fontSize: "0.875rem" }}>
                      {op.garment}
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}> · {op.color}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {op.size ? (
                        <span style={{ background: "var(--bg-color)", border: "1px solid var(--card-border)", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>
                          {op.size}
                        </span>
                      ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>{op.quantity}</td>
                    <td style={{ textAlign: "center", color: "green", fontWeight: 700 }}>{op.received}</td>
                    <td style={{ textAlign: "center", fontWeight: 800, color: op.pending > 0 ? "orange" : "var(--text-muted)" }}>
                      {op.pending > 0 ? op.pending : "✓"}
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      {new Date(op.date).toLocaleDateString("es-PE")}
                    </td>
                    <td style={{ fontSize: "0.875rem", fontWeight: op.endDate ? 600 : 400, color: op.endDate ? "green" : "var(--text-muted)" }}>
                      {op.endDate ? op.endDate.toLocaleDateString("es-PE") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {groups.length === 0 && (
          <div className={styles.emptyState}>No hay OPs registradas para este servicio.</div>
        )}
      </div>}
    </div>
  );
}
