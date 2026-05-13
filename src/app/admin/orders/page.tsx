import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Package, ClipboardList } from "lucide-react";
import styles from "../services/services.module.css";
import { companyFilter } from "@/lib/company";
import { Suspense } from "react";
import OrderFilters from "./OrderFilters";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ status?: string; from?: string; to?: string }>;

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();

  const rawStatus = params.status !== undefined ? params.status : "EN PROCESO,PENDIENTE,PARCIALMENTE ENTREGADO";
  const selectedStatuses = rawStatus === "ALL" ? [] : rawStatus.split(",").filter(Boolean);

  const where: any = { ...filter };
  if (params.from || params.to) {
    where.date = {};
    if (params.from) where.date.gte = new Date(params.from);
    if (params.to) where.date.lte = new Date(params.to + "T23:59:59");
  }

  const ordersRaw = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      guides: { select: { deliveredQuantity: true } },
      services: { select: { deliveries: { select: { quantity: true } } } },
    },
    where,
  });

  const orders = selectedStatuses.length === 0 ? ordersRaw : ordersRaw.filter((o: any) => {
    const totalDelivered = o.guides.reduce((acc: number, g: any) => acc + g.deliveredQuantity, 0);
    const sentToWorkshop = o.services.reduce((acc: number, svc: any) =>
      acc + svc.deliveries.reduce((a: number, d: any) => a + d.quantity, 0), 0);
    const s =
      o.status === "CANCELADO" ? "CANCELADO"
      : o.status === "ENTREGADO" || o.status === "CERRADO" ? "ENTREGADO"
      : totalDelivered >= o.totalQuantity ? "ENTREGADO"
      : totalDelivered > 0 ? "PARCIALMENTE ENTREGADO"
      : sentToWorkshop > 0 ? "EN PROCESO"
      : "PENDIENTE";
    return selectedStatuses.includes(s);
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>OPs — Órdenes de Producción</h1>
        <Link href="/admin/orders/new" className={styles.newButton}>
          <Plus size={18} />
          Nueva OP
        </Link>
      </div>

      <Suspense fallback={null}>
        <OrderFilters />
      </Suspense>

      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
        {orders.length} OP{orders.length !== 1 ? "s" : ""} encontrada{orders.length !== 1 ? "s" : ""}
      </div>

      <div className={styles.tableContainer}>
        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            No hay OPs con los filtros seleccionados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>OP</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Prenda / Color</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const totalDelivered = o.guides.reduce((acc: number, g: any) => acc + g.deliveredQuantity, 0);
                const sentToWorkshop = o.services.reduce((acc: number, svc: any) =>
                  acc + svc.deliveries.reduce((a: number, d: any) => a + d.quantity, 0), 0);
                const displayStatus =
                  o.status === "CANCELADO"
                    ? o.status
                    : o.status === "CERRADO" || o.status === "ENTREGADO"
                    ? "ENTREGADO"
                    : totalDelivered >= o.totalQuantity
                    ? "ENTREGADO"
                    : totalDelivered > 0
                    ? "PARCIALMENTE ENTREGADO"
                    : sentToWorkshop > 0
                    ? "EN PROCESO"
                    : "PENDIENTE";

                return (
                  <tr key={o.id}>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>{o.client.name}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      {o.date.toLocaleDateString()}
                    </td>
                    <td>
                      {o.garment} <br />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{o.color}</span>
                    </td>
                    <td>
                      <div>Pedidas: {o.totalQuantity}</div>
                      <div style={{ fontSize: "0.75rem", color: totalDelivered >= o.totalQuantity ? "green" : "orange" }}>
                        Entregadas: {totalDelivered}
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge} style={{
                        background:
                          displayStatus === "ENTREGADO" ? "green" :
                          displayStatus === "PARCIALMENTE ENTREGADO" ? "#2563eb" :
                          displayStatus === "EN PROCESO" ? "#7c3aed" :
                          displayStatus === "CANCELADO" ? "#dc2626" :
                          "orange",
                        color: "white",
                        fontSize: displayStatus === "PARCIALMENTE ENTREGADO" ? "0.65rem" : undefined,
                      }}>
                        {displayStatus === "EN PROCESO" ? "PROCESO" : displayStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          title="Ver detalle"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.78rem",
                            fontWeight: 600, border: "1px solid var(--card-border)",
                            background: "var(--card-bg)", color: "var(--text-color)",
                            textDecoration: "none",
                          }}
                        >
                          <Package size={14} /> Ver
                        </Link>
                        <Link
                          href={`/admin/providers/ops?order=${o.id}`}
                          title="Vista operativa — talleres e ingresos"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.78rem",
                            fontWeight: 600, border: "1px solid var(--card-border)",
                            background: "var(--card-bg)", color: "var(--text-color)",
                            textDecoration: "none",
                          }}
                        >
                          <ClipboardList size={14} /> Operativo
                        </Link>
                      </div>
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
