import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ClipboardList, ChevronRight } from "lucide-react";
import { PageHeader, Card, StatusPill, ProgressBar, EmptyState } from "@/components/ui";
import { deriveOrderDisplayStatus, piecesInWorkshop } from "@/lib/order-status";
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
      services: { select: { deliveries: { select: { quantity: true, incomings: { select: { quantity: true } } } } } },
    },
    where,
  });

  const withStatus = ordersRaw.map((o) => ({
    o,
    display: deriveOrderDisplayStatus(o),
    delivered: o.guides.reduce((acc, g) => acc + g.deliveredQuantity, 0),
    inShop: piecesInWorkshop(o),
  }));
  const orders = selectedStatuses.length === 0 ? withStatus : withStatus.filter((r) => selectedStatuses.includes(r.display));

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Órdenes de producción"
        subtitle="Una OP por prenda y color. Desde aquí se emiten las órdenes de servicio a talleres."
        breadcrumbs={[{ label: "Producción" }, { label: "Órdenes de producción" }]}
        actions={
          <Link href="/admin/orders/new" className={styles.newButton}>
            <Plus size={18} /> Nueva OP
          </Link>
        }
      />

      <Suspense fallback={null}>
        <OrderFilters />
      </Suspense>

      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.25rem 0 0.6rem" }}>
        {orders.length} OP{orders.length !== 1 ? "s" : ""}
      </div>

      <Card flush>
        {orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No hay OPs con los filtros seleccionados" />
        ) : (
          <div className={styles.tableContainer} style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr><th>OP</th><th>Cliente</th><th>Fecha</th><th>Prenda / Color</th><th style={{ minWidth: 160 }}>Avance</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map(({ o, display, delivered, inShop }) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} style={{ fontWeight: 800, color: "var(--primary-700)" }}>{o.orderNumber}</Link></td>
                    <td>{o.client.name}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{o.date.toLocaleDateString("es-PE")}</td>
                    <td>
                      {o.garment}
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{o.color}</div>
                    </td>
                    <td>
                      <ProgressBar max={o.totalQuantity} segments={[{ value: delivered + inShop, tone: "info" }, { value: delivered, tone: "success" }]} />
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                        {delivered} despachadas · {inShop} en taller · {o.totalQuantity} total
                      </div>
                    </td>
                    <td><StatusPill status={display} /></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link href={`/admin/orders/${o.id}`} className="btn btn-secondary" style={{ height: 30, fontSize: "0.78rem" }}>
                        Abrir <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
