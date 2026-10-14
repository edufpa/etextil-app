import { companyFilter } from "@/lib/company";
import { getOrderSummary } from "@/app/actions/orders";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Pencil, ClipboardList, Route, Send, Truck, Ruler, FileText, Info } from "lucide-react";
import styles from "../../services/services.module.css";
import { notFound } from "next/navigation";
import CloseOrderButton from "./CloseOrderButton";
import DeleteOrderButton from "./DeleteOrderButton";
import ProviderDeliveryForm from "./ProviderDeliveryForm";
import DeleteDeliveryButton from "./DeleteDeliveryButton";
import IncomingPanel from "./IncomingPanel";
import OrderServicesPanel from "./OrderServicesPanel";
import { PageHeader, Card, Split, Stack, StatGrid, Stat, StatusPill, KV, EmptyState } from "@/components/ui";
import ServiceOrdersPanel, { type ServiceOrderRow } from "./ServiceOrdersPanel";
import { computeAvailability, previousStage, osStatus } from "@/lib/service-orders";

export const dynamic = 'force-dynamic';
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const orderId = parseInt(resolvedParams.id, 10);
  if (isNaN(orderId)) return notFound();

  const filter = await companyFilter();
  const [order, providers, catalogServices, serviceOrders] = await Promise.all([
    getOrderSummary(orderId),
    prisma.provider.findMany({
      where: { status: true, ...filter },
      orderBy: { businessName: "asc" },
      include: { services: { select: { service_id: true } }, prices: { select: { service_id: true, price: true } } },
    }),
    prisma.service.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.serviceOrder.findMany({
      where: { orderService: { order_id: orderId }, ...filter },
      orderBy: { id: "desc" },
      include: {
        provider: { select: { businessName: true } },
        orderService: { select: { service: { select: { name: true } } } },
        lines: { select: { size: true, quantity: true, unitPrice: true, incomings: { select: { quantity: true } } }, orderBy: { id: "asc" } },
      },
    }),
  ]);

  if (!order) return notFound();

  // Build data for the ProviderDeliveryForm
  const orderSizesForAvail = (order.sizes ?? []).map((s: any) => ({ size: s.size, quantity: s.quantity }));
  const orderServicesForForm = order.services.map((svc: any) => {
    const prev: any = previousStage(order.services as any[], svc);
    const avail = computeAvailability(svc, orderSizesForAvail, prev);
    const deliveredBySize: Record<string, number> = {};
    for (const d of svc.deliveries) {
      if (d.size) deliveredBySize[d.size] = (deliveredBySize[d.size] || 0) + d.quantity;
    }
    return {
      id: svc.id,
      serviceId: svc.service_id,
      service: { name: svc.service.name, trackBySize: svc.service.trackBySize ?? false },
      requiredQuantity: svc.requiredQuantity,
      alreadyDelivered: svc.deliveries.reduce((a: number, d: any) => a + d.quantity, 0),
      deliveredBySize,
      provider: svc.provider ?? null,
      available: { total: avail.total, bySize: avail.bySize, gated: avail.gated, prevName: prev?.service?.name ?? null },
    };
  });

  const serviceOrderRows: ServiceOrderRow[] = serviceOrders.map((so: any) => {
    const sent = so.lines.reduce((a: number, l: any) => a + l.quantity, 0);
    const lineRecv = (l: any) => l.incomings.reduce((a: number, i: any) => a + i.quantity, 0);
    return {
      id: so.id,
      osNumber: so.osNumber,
      serviceName: so.orderService.service.name,
      providerName: so.provider.businessName,
      date: so.date.toISOString(),
      dueDate: so.dueDate ? so.dueDate.toISOString() : null,
      status: osStatus(so, so.lines),
      sent,
      received: so.lines.reduce((a: number, l: any) => a + lineRecv(l), 0),
      unitPrice: so.lines.find((l: any) => l.unitPrice !== null)?.unitPrice != null ? Number(so.lines.find((l: any) => l.unitPrice !== null).unitPrice) : null,
      voidNote: so.voidNote,
      notes: so.notes,
      lines: so.lines.map((l: any) => ({ size: l.size ?? "", quantity: l.quantity, received: lineRecv(l) })),
    };
  });

  // Tallas del pedido para el selector de entrega
  const orderSizes = (order.sizes ?? []).map((s: any) => ({ size: s.size, quantity: s.quantity }));

  // Info del pedido para la OP
  const orderInfo = {
    orderNumber: order.orderNumber,
    clientName: order.client.name,
    garment: order.garment,
    color: order.color,
    date: order.date.toLocaleDateString("es-PE"),
    totalQuantity: order.totalQuantity,
  };

  const providersForPanel = providers.map((p: any) => ({
    id: p.id,
    businessName: p.businessName,
    serviceIds: p.services.map((ps: any) => ps.service_id),
    prices: Object.fromEntries(p.prices.map((pr: any) => [pr.service_id, Number(pr.price)])) as Record<number, number>,
  }));

  // Build IncomingPanel data: group deliveries (OPs) by service
  const servicesForPanel = order.services.map((svc: any) => {
    const sentQty = svc.deliveries.reduce((a: number, d: any) => a + d.quantity, 0);
    const receivedQty = svc.deliveries.reduce(
      (a: number, d: any) => a + (d.incomings ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
      0
    );
    return {
      id: svc.id,
      serviceId: svc.service_id,
      serviceName: svc.service.name,
      serviceType: svc.service.type,
      requiredQuantity: svc.requiredQuantity,
      sentQty,
      receivedQty,
      providerName: svc.provider?.businessName ?? null,
      sizeSplit: svc.sizeSplit?.map((sz: any) => ({ size: sz.size, quantity: sz.quantity })) ?? [],
      sequence: svc.sequence ?? 0,
      available: (() => {
        const a = orderServicesForForm.find((f: any) => f.id === svc.id)!.available;
        return { total: a.total, gated: a.gated, prevName: a.prevName };
      })(),
    };
  });

  const pedidoRef = order.pedido_id
    ? await prisma.pedido.findUnique({ where: { id: order.pedido_id }, select: { id: true, pedidoNumber: true } })
    : null;

  const activeOs = serviceOrderRows.filter((r) => r.status !== "ANULADA");
  const openOs = activeOs.filter((r) => r.status === "EMITIDA" || r.status === "PARCIAL");
  const todayIso = new Date().toISOString().slice(0, 10);
  const lateOs = openOs.filter((r) => r.dueDate && r.dueDate.slice(0, 10) < todayIso).length;
  const osValue = activeOs.reduce((a, r) => a + (r.unitPrice ?? 0) * r.sent, 0);
  const canOperate = !["ENTREGADO", "CERRADO", "CANCELADO"].includes(order.status);
  const displayStatus = order.status === "CERRADO" ? "ENTREGADO" : order.status;

  const osNumberById = new Map<number, string>(serviceOrders.map((so: any) => [so.id, so.osNumber]));
  const serviceDeliveriesForIncoming = order.services.map((svc: any) => ({
    serviceId: svc.id,
    serviceName: svc.service.name,
    deliveries: (svc.deliveries ?? []).map((d: any) => ({
      id: d.id,
      size: d.size,
      quantity: d.quantity,
      date: d.date,
      notes: d.notes,
      providerName: providers.find((p: any) => p.id === d.provider_id)?.businessName || "Taller",
      osNumber: osNumberById.get(d.serviceOrder_id) ?? null,
      incomings: (d.incomings ?? []).map((i: any) => ({
        id: i.id,
        quantity: i.quantity,
        date: i.date,
        notes: i.notes,
      })),
    })),
  }));

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title={`OP ${order.orderNumber}`}
        badge={<StatusPill status={displayStatus} />}
        subtitle={`${order.client.name} · ${order.garment} ${order.color} · ${order.date.toLocaleDateString("es-PE")}`}
        breadcrumbs={[
          { label: "Producción" },
          ...(pedidoRef ? [{ label: "Pedidos", href: "/admin/pedidos" }, { label: pedidoRef.pedidoNumber, href: `/admin/pedidos/${pedidoRef.id}` }] : [{ label: "Órdenes de Producción", href: "/admin/orders" }]),
          { label: order.orderNumber },
        ]}
        actions={
          <>
            {canOperate && (
              <Link href={`/admin/orders/${order.id}/edit`} className="btn btn-secondary">
                <Pencil size={15} /> Editar
              </Link>
            )}
            {canOperate && <CloseOrderButton id={order.id} />}
            <DeleteOrderButton orderId={order.id} orderNumber={order.orderNumber} />
          </>
        }
      />

      <StatGrid>
        <Stat label="Solicitado" value={order.totalQuantity.toLocaleString("es-PE")} tone="primary" hint="prendas de la OP" />
        <Stat label="Despachado" value={order.totalDelivered.toLocaleString("es-PE")} tone="success" hint="en guías al cliente" />
        <Stat label="Saldo por despachar" value={order.pending.toLocaleString("es-PE")} tone={order.pending > 0 ? "warning" : "neutral"} />
        <Stat label="OS abiertas" value={openOs.length} tone="info" hint={lateOs > 0 ? `${lateOs} atrasada${lateOs > 1 ? "s" : ""}` : "en talleres"} />
        <Stat label="Valor de OS" value={`S/ ${osValue.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="neutral" hint="según tarifas" />
      </StatGrid>

      <Split>
        <Stack>
          <Card title="Ruta de producción" icon={Route} count={servicesForPanel.length}>
            <OrderServicesPanel
              orderId={order.id}
              orderStatus={order.status}
              totalQuantity={order.totalQuantity}
              services={servicesForPanel}
              catalogServices={catalogServices}
            />
          </Card>

          {canOperate && orderServicesForForm.some((s: any) => s.requiredQuantity - s.alreadyDelivered > 0) && (
            <Card title="Emitir orden de servicio" icon={Send} id="nueva-os">
              <ProviderDeliveryForm
                orderId={order.id}
                orderServices={orderServicesForForm}
                providers={providersForPanel}
                orderSizes={orderSizes}
                orderInfo={orderInfo}
              />
            </Card>
          )}

          <Card title="Órdenes de servicio" icon={Truck} count={serviceOrderRows.length} flush={serviceOrderRows.length === 0 ? false : true}>
            {serviceOrderRows.length === 0 ? (
              <EmptyState icon={Send} title="Aún no hay órdenes de servicio">
                Emite la primera desde una etapa de la ruta de producción.
              </EmptyState>
            ) : (
              <div style={{ padding: "0.5rem 1rem 1rem" }}>
                <ServiceOrdersPanel rows={serviceOrderRows} op={{ opNumber: order.orderNumber, clientName: order.client.name, garment: order.garment, color: order.color }} />
              </div>
            )}
          </Card>

          {serviceDeliveriesForIncoming.some((sv: any) => sv.deliveries.length > 0) && (
            <Card title="Salidas e ingresos" icon={FileText}>
              <IncomingPanel orderId={order.id} serviceDeliveries={serviceDeliveriesForIncoming} />
            </Card>
          )}
        </Stack>

        <Stack>
          <Card title="Datos generales" icon={Info}>
            <KV
              items={[
                { label: "Cliente", value: order.client.name },
                { label: "Fecha", value: order.date.toLocaleDateString("es-PE") },
                { label: "Prenda", value: order.garment },
                { label: "Color", value: order.color },
                ...(pedidoRef ? [{ label: "Pedido", value: <Link href={`/admin/pedidos/${pedidoRef.id}`} style={{ color: "var(--primary)" }}>{pedidoRef.pedidoNumber}</Link> }] : []),
                { label: "Observaciones", value: order.notes || "—", wide: true },
              ]}
            />
          </Card>

          <Card title="Tallas" icon={Ruler} count={order.totalQuantity} flush>
            <table className={styles.table} style={{ width: "100%" }}>
              <thead><tr><th>Talla</th><th style={{ textAlign: "right" }}>Cantidad</th></tr></thead>
              <tbody>
                {order.sizes.map((sz: any) => (
                  <tr key={sz.id}><td><strong>{sz.size}</strong></td><td style={{ textAlign: "right" }}>{sz.quantity}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Despachos al cliente" icon={Truck} count={order.guides.length}>
            {order.guides.length === 0 ? (
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No se han registrado despachos.</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {order.guides.map((gd: any) => (
                  <div key={gd.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--gray-100)" }}>
                    <div>
                      <Link href={`/admin/guides/${gd.guide.id}`} style={{ fontWeight: 700, color: "var(--primary)" }}>{gd.guide.sunatNumber}</Link>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{gd.guide.date.toLocaleDateString("es-PE")}</div>
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>
                      +{gd.deliveredQuantity}
                      {gd.size && <div style={{ fontWeight: 500, fontSize: "0.75rem", color: "var(--text-muted)" }}>Talla {gd.size}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Stack>
      </Split>
    </div>
  );
}
