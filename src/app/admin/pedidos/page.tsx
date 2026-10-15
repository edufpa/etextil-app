import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ShoppingBag, ChevronRight } from "lucide-react";
import { PageHeader, Card, StatusPill, EmptyState } from "@/components/ui";
import styles from "../services/services.module.css";
import { companyFilter } from "@/lib/company";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

const STATUSES = ["BORRADOR", "CONFIRMADO", "EN PROCESO", "COMPLETADO"];
const LABEL: Record<string, string> = { BORRADOR: "Borrador", CONFIRMADO: "Confirmado", "EN PROCESO": "En proceso", COMPLETADO: "Completado" };

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
      items: { include: { sizes: true } },
      ops: { select: { id: true, status: true } },
    },
  });

  return (
    <div>
      <PageHeader
        icon={ShoppingBag}
        title="Pedidos de cliente"
        subtitle="Cada pedido agrupa prendas y genera una OP por ítem."
        breadcrumbs={[{ label: "Producción" }, { label: "Pedidos" }]}
        actions={
          <Link href="/admin/pedidos/new" className={styles.newButton}>
            <Plus size={18} /> Nuevo pedido
          </Link>
        }
      />

      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
        <Link href="/admin/pedidos" className={!params.status ? "btn btn-primary" : "btn btn-secondary"} style={{ height: 34 }}>Todos</Link>
        {STATUSES.map((st) => (
          <Link key={st} href={`/admin/pedidos?status=${st}`} className={params.status === st ? "btn btn-primary" : "btn btn-secondary"} style={{ height: 34 }}>
            {LABEL[st]}
          </Link>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}
        </span>
      </div>

      <Card flush>
        {pedidos.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No hay pedidos con estos filtros">
            Crea un pedido nuevo para empezar el flujo.
          </EmptyState>
        ) : (
          <div className={styles.tableContainer} style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Ítems</th><th style={{ textAlign: "right" }}>Unidades</th><th style={{ textAlign: "center" }}>OPs</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const totalUnits = p.items.reduce((acc, item) => acc + item.sizes.reduce((sum, sz) => sum + sz.quantity, 0), 0);
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/admin/pedidos/${p.id}`} style={{ fontWeight: 800, color: "var(--primary-700)" }}>{p.pedidoNumber}</Link></td>
                      <td>{p.client.name}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{new Date(p.date).toLocaleDateString("es-PE")}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {p.items.slice(0, 2).map((item, i) => (
                            <span key={i} style={{ fontSize: "0.8rem" }}>
                              {item.garment} <span style={{ color: "var(--text-muted)" }}>{item.color}</span>
                            </span>
                          ))}
                          {p.items.length > 2 && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>+{p.items.length - 2} más</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, textAlign: "right" }}>{totalUnits.toLocaleString("es-PE")}</td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: p.ops.length > 0 ? "var(--primary)" : "var(--text-muted)" }}>{p.ops.length}</td>
                      <td><StatusPill status={p.status} /></td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/admin/pedidos/${p.id}`} className="btn btn-secondary" style={{ height: 30, fontSize: "0.78rem" }}>
                          Abrir <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
