import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, ShoppingBag } from "lucide-react";
import styles from "../../services/services.module.css";
import GenerarOpsButton from "./GenerarOpsButton";
import DeletePedidoButton from "./DeletePedidoButton";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  BORRADOR: "#94a3b8",
  CONFIRMADO: "#2563eb",
  "EN PROCESO": "#7c3aed",
  COMPLETADO: "green",
};

const OP_STATUS_COLORS: Record<string, string> = {
  PENDIENTE: "orange",
  "EN PROCESO": "#7c3aed",
  "PARCIALMENTE ENTREGADO": "#2563eb",
  ENTREGADO: "green",
  CANCELADO: "#dc2626",
};

type Params = Promise<{ id: string }>;

export default async function PedidoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(id) },
    include: {
      client: true,
      items: {
        include: { sizes: { orderBy: { size: "asc" } } },
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
          services: { select: { deliveries: { select: { quantity: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!pedido) notFound();

  const totalUnits = pedido.items.reduce(
    (acc, item) => acc + item.sizes.reduce((s, sz) => s + sz.quantity, 0),
    0
  );
  const opsAlreadyGenerated = pedido.ops.length > 0;
  const statusColor = STATUS_COLORS[pedido.status] || "#94a3b8";

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/pedidos" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800 }}>
                <ShoppingBag size={20} style={{ display: "inline", marginRight: "0.3rem", verticalAlign: "middle" }} />
                {pedido.pedidoNumber}
              </h1>
              <span className={styles.badge} style={{ background: statusColor, color: "white", fontSize: "0.68rem" }}>
                {pedido.status}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {pedido.client.name} · {new Date(pedido.date).toLocaleDateString()} · {totalUnits} unidades totales
            </div>
            {pedido.notes && (
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem", fontStyle: "italic" }}>
                {pedido.notes}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {!opsAlreadyGenerated && (
            <GenerarOpsButton pedidoId={pedido.id} />
          )}
          <DeletePedidoButton pedidoId={pedido.id} hasOps={opsAlreadyGenerated} />
        </div>
      </div>

      {/* Items del pedido */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          Items del Pedido ({pedido.items.length})
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {pedido.items.map((item, idx) => {
            const itemTotal = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
            return (
              <div key={item.id} style={{
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                borderLeft: "3px solid var(--primary)", borderRadius: "var(--radius)",
                padding: "0.9rem 1.1rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{item.garment}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginLeft: "0.5rem" }}>— {item.color}</span>
                    {item.notes && (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "0.75rem", fontStyle: "italic" }}>
                        {item.notes}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--primary)" }}>{itemTotal} u.</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {item.sizes.map((sz) => (
                    <span key={sz.id} style={{
                      background: "var(--primary)", color: "white",
                      padding: "2px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                    }}>
                      {sz.size}: {sz.quantity}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OPs generadas */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            OPs Generadas ({pedido.ops.length})
          </h2>
          {opsAlreadyGenerated && (
            <GenerarOpsButton pedidoId={pedido.id} disabled />
          )}
        </div>

        {pedido.ops.length === 0 ? (
          <div style={{
            background: "var(--card-bg)", border: "2px dashed var(--card-border)",
            borderRadius: "var(--radius)", padding: "2.5rem", textAlign: "center",
            color: "var(--text-muted)", fontSize: "0.9rem",
          }}>
            Todavía no se generaron OPs para este pedido.
            <br />
            <span style={{ fontSize: "0.8rem" }}>Usá el botón "Generar OPs" para crear una OP por cada item.</span>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>OP</th>
                  <th>Prenda / Color</th>
                  <th>Total</th>
                  <th>Entregado</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pedido.ops.map((op) => {
                  const delivered = op.guides.reduce((s, g) => s + g.deliveredQuantity, 0);
                  const sentToWorkshop = op.services.reduce(
                    (s, svc) => s + svc.deliveries.reduce((a, d) => a + d.quantity, 0), 0
                  );
                  const displayStatus =
                    op.status === "CANCELADO" ? "CANCELADO"
                    : op.status === "ENTREGADO" || op.status === "CERRADO" ? "ENTREGADO"
                    : delivered >= op.totalQuantity ? "ENTREGADO"
                    : delivered > 0 ? "PARCIALMENTE ENTREGADO"
                    : sentToWorkshop > 0 ? "EN PROCESO"
                    : "PENDIENTE";
                  const opColor = OP_STATUS_COLORS[displayStatus] || "orange";

                  return (
                    <tr key={op.id}>
                      <td><strong>{op.orderNumber}</strong></td>
                      <td>
                        {op.garment}
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>{op.color}</span>
                      </td>
                      <td>{op.totalQuantity}</td>
                      <td style={{ color: delivered >= op.totalQuantity ? "green" : "orange", fontWeight: 600 }}>
                        {delivered}
                      </td>
                      <td>
                        <span className={styles.badge} style={{ background: opColor, color: "white", fontSize: "0.68rem" }}>
                          {displayStatus === "EN PROCESO" ? "PROCESO" : displayStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <Link
                            href={`/admin/orders/${op.id}`}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "0.3rem",
                              padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem",
                              fontWeight: 600, border: "1px solid var(--card-border)",
                              background: "var(--card-bg)", color: "var(--text-color)", textDecoration: "none",
                            }}
                          >
                            <Package size={13} /> Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
