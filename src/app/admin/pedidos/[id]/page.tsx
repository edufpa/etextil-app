import { canAccessCompany } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, ShoppingBag, Layers, ClipboardList, Info } from "lucide-react";
import styles from "../../services/services.module.css";
import GenerarOpsButton from "./GenerarOpsButton";
import DeletePedidoButton from "./DeletePedidoButton";
import PedidoFilesPanel from "@/components/pedidos/PedidoFilesPanel";
import ItemImage from "@/components/pedidos/ItemImage";
import { PageHeader, Card, Split, Stack, StatGrid, Stat, StatusPill, KV, EmptyState, ProgressBar } from "@/components/ui";
import { deriveOrderDisplayStatus, piecesInWorkshop } from "@/lib/order-status";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function PedidoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(id) },
    include: {
      client: true,
      items: {
        include: {
          sizes: { orderBy: { size: "asc" } },
          image: { select: { updatedAt: true } }, // nunca cargar los bytes aquí
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      files: {
        select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      ops: {
        select: {
          id: true,
          orderNumber: true,
          garment: true,
          color: true,
          totalQuantity: true,
          status: true,
          guides: { select: { deliveredQuantity: true } },
          services: { select: { deliveries: { select: { quantity: true, incomings: { select: { quantity: true } } } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!pedido || !(await canAccessCompany(pedido.company_id))) notFound();

  const totalUnits = pedido.items.reduce(
    (acc, item) => acc + item.sizes.reduce((s, sz) => s + sz.quantity, 0),
    0
  );
  const opsAlreadyGenerated = pedido.ops.length > 0;
  const opRows = pedido.ops.map((op) => ({
    ...op,
    delivered: op.guides.reduce((s, g) => s + g.deliveredQuantity, 0),
    inShop: piecesInWorkshop(op),
    display: deriveOrderDisplayStatus(op),
  }));
  const deliveredTotal = opRows.reduce((a, o) => a + o.delivered, 0);
  const opsTotal = opRows.reduce((a, o) => a + o.totalQuantity, 0);
  const doneOps = opRows.filter((o) => o.display === "ENTREGADO").length;

  return (
    <div>
      <PageHeader
        icon={ShoppingBag}
        title={`Pedido ${pedido.pedidoNumber}`}
        badge={<StatusPill status={pedido.status} />}
        subtitle={`${pedido.client.name} · ${new Date(pedido.date).toLocaleDateString("es-PE")}`}
        breadcrumbs={[{ label: "Producción" }, { label: "Pedidos", href: "/admin/pedidos" }, { label: pedido.pedidoNumber }]}
        actions={
          <>
            {!opsAlreadyGenerated && <GenerarOpsButton pedidoId={pedido.id} />}
            <DeletePedidoButton pedidoId={pedido.id} hasOps={opsAlreadyGenerated} />
          </>
        }
      />

      <StatGrid>
        <Stat label="Ítems" value={pedido.items.length} tone="primary" hint="prendas distintas" />
        <Stat label="Unidades" value={totalUnits.toLocaleString("es-PE")} tone="info" />
        <Stat label="OPs generadas" value={pedido.ops.length} tone={opsAlreadyGenerated ? "success" : "warning"} hint={opsAlreadyGenerated ? `${doneOps} entregada${doneOps === 1 ? "" : "s"}` : "aún sin generar"} />
        <Stat label="Despachado" value={opsAlreadyGenerated ? `${deliveredTotal.toLocaleString("es-PE")} / ${opsTotal.toLocaleString("es-PE")}` : "—"} tone="success" />
      </StatGrid>

      <Split>
        <Stack>
          <Card title="Ítems del pedido" icon={Layers} count={pedido.items.length}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {pedido.items.map((item, idx) => {
                const itemTotal = item.sizes.reduce((sum, sz) => sum + sz.quantity, 0);
                return (
                  <div key={item.id} style={{ border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "0.85rem 1rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <ItemImage
                      itemId={item.id}
                      version={item.image ? new Date(item.image.updatedAt).getTime() : null}
                      label={`${item.garment} — ${item.color}`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 600 }}>#{idx + 1}{item.sku ? ` · ${item.sku}` : ""}</div>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{item.garment}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginLeft: "0.5rem" }}>— {item.color}</span>
                        </div>
                        <span className="pill pill-primary">{itemTotal} u.</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                        {item.sizes.map((sz) => (
                          <span key={sz.id} className="pill"><strong>{sz.size}</strong> {sz.quantity}</span>
                        ))}
                      </div>
                      {item.notes && (
                        <div style={{ fontSize: "0.78rem", color: "var(--gray-600)", marginTop: "0.55rem", whiteSpace: "pre-line", background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.65rem" }}>
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Órdenes de producción" icon={ClipboardList} count={pedido.ops.length} flush={opsAlreadyGenerated}>
            {!opsAlreadyGenerated ? (
              <EmptyState icon={ClipboardList} title="Todavía no se generaron OPs">
                Usa “Generar OPs” para crear una OP por cada ítem del pedido.
              </EmptyState>
            ) : (
              <div className={styles.tableContainer} style={{ border: "none", boxShadow: "none", borderRadius: 0, maxHeight: "none" }}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>OP</th><th>Prenda / Color</th><th style={{ minWidth: 140 }}>Avance</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {opRows.map((op) => (
                      <tr key={op.id}>
                        <td><Link href={`/admin/orders/${op.id}`} style={{ fontWeight: 800, color: "var(--primary-700)" }}>{op.orderNumber}</Link></td>
                        <td>
                          {op.garment}
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{op.color}</div>
                        </td>
                        <td>
                          <ProgressBar max={op.totalQuantity} segments={[{ value: op.delivered + op.inShop, tone: "info" }, { value: op.delivered, tone: "success" }]} />
                          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                            {op.delivered} despachadas · {op.inShop} en taller · {op.totalQuantity} total
                          </div>
                        </td>
                        <td><StatusPill status={op.display} /></td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/admin/orders/${op.id}`} className="btn btn-secondary" style={{ height: 30, fontSize: "0.78rem" }}>
                            <Package size={13} /> Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Stack>

        <Stack>
          <Card title="Datos del pedido" icon={Info}>
            <KV
              items={[
                { label: "Cliente", value: pedido.client.name },
                { label: "Fecha", value: new Date(pedido.date).toLocaleDateString("es-PE") },
                { label: "Estado", value: <StatusPill status={pedido.status} /> },
                { label: "Notas", value: pedido.notes || "—", wide: true },
              ]}
            />
          </Card>
          <PedidoFilesPanel
            pedidoId={pedido.id}
            files={pedido.files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
          />
        </Stack>
      </Split>
    </div>
  );
}
