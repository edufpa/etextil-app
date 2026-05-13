import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ShoppingBag, ChevronRight } from "lucide-react";
import styles from "../services/services.module.css";
import { companyFilter } from "@/lib/company";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  BORRADOR: "#94a3b8",
  CONFIRMADO: "#2563eb",
  "EN PROCESO": "#7c3aed",
  COMPLETADO: "green",
};

type SearchParams = Promise<{ status?: string }>;

export default async function PedidosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();

  const where: any = { ...filter };
  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      items: {
        include: { sizes: true },
      },
      ops: { select: { id: true, status: true } },
    },
  });

  const statuses = ["BORRADOR", "CONFIRMADO", "EN PROCESO", "COMPLETADO"];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>
          <ShoppingBag size={20} style={{ display: "inline", marginRight: "0.4rem", verticalAlign: "middle" }} />
          Pedidos de Cliente
        </h1>
        <Link href="/admin/pedidos/new" className={styles.newButton}>
          <Plus size={18} />
          Nuevo Pedido
        </Link>
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link
          href="/admin/pedidos"
          style={{
            padding: "0.3rem 0.9rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 600,
            border: "1px solid var(--card-border)", textDecoration: "none",
            background: !params.status ? "var(--primary)" : "transparent",
            color: !params.status ? "white" : "var(--text-muted)",
          }}
        >
          Todos
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/pedidos?status=${s}`}
            style={{
              padding: "0.3rem 0.9rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 600,
              border: `2px solid ${STATUS_COLORS[s]}`, textDecoration: "none",
              background: params.status === s ? STATUS_COLORS[s] : "transparent",
              color: params.status === s ? "white" : STATUS_COLORS[s],
            }}
          >
            {s === "EN PROCESO" ? "En Proceso" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
        {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} encontrado{pedidos.length !== 1 ? "s" : ""}
      </div>

      <div className={styles.tableContainer}>
        {pedidos.length === 0 ? (
          <div className={styles.emptyState}>No hay pedidos con los filtros seleccionados.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Items</th>
                <th>Total Unidades</th>
                <th>OPs</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const totalUnits = p.items.reduce(
                  (acc, item) => acc + item.sizes.reduce((s, sz) => s + sz.quantity, 0),
                  0
                );
                const color = STATUS_COLORS[p.status] || "#94a3b8";
                return (
                  <tr key={p.id}>
                    <td><strong>{p.pedidoNumber}</strong></td>
                    <td>{p.client.name}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {p.items.slice(0, 2).map((item, i) => (
                          <span key={i} style={{ fontSize: "0.78rem" }}>
                            {item.garment} <span style={{ color: "var(--text-muted)" }}>{item.color}</span>
                          </span>
                        ))}
                        {p.items.length > 2 && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            +{p.items.length - 2} más
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{totalUnits}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: p.ops.length > 0 ? "var(--primary)" : "var(--text-muted)" }}>
                        {p.ops.length}
                      </span>
                    </td>
                    <td>
                      <span className={styles.badge} style={{ background: color, color: "white", fontSize: "0.68rem" }}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/pedidos/${p.id}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.2rem",
                          padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.78rem",
                          fontWeight: 600, border: "1px solid var(--card-border)",
                          background: "var(--card-bg)", color: "var(--text-color)", textDecoration: "none",
                        }}
                      >
                        Ver <ChevronRight size={13} />
                      </Link>
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
