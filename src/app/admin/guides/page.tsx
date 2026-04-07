import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import styles from "../services/services.module.css";

export const dynamic = 'force-dynamic';
export default async function GuidesPage() {
  const guides = await prisma.guide.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      details: {
        include: {
          order: { include: { client: true } }
        }
      }
    }
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Despachos</h1>
        <Link href="/admin/guides/new" className={styles.newButton}>
          <Plus size={18} />
          Nuevo Despacho
        </Link>
      </div>

      <div className={styles.tableContainer}>
        {guides.length === 0 ? (
          <div className={styles.emptyState}>
            No hay despachos registrados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>N° Guía</th>
                <th>Fecha</th>
                <th>Cliente(s)</th>
                <th>Pedidos / Tallas</th>
                <th>Total Prendas</th>
                <th>Estado</th>
                <th>Ver</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((g: any) => {
                const totalDelivered = g.details.reduce((acc: number, d: any) => acc + d.deliveredQuantity, 0);

                // Obtener clientes únicos
                const clientNames = [...new Set(g.details.map((d: any) => d.order.client.name))] as string[];

                // Agrupar por pedido > talla
                const byOrder = new Map<string, { orderNumber: string; sizes: Map<string, number> }>();
                for (const d of g.details) {
                  if (!byOrder.has(d.order.orderNumber)) {
                    byOrder.set(d.order.orderNumber, { orderNumber: d.order.orderNumber, sizes: new Map() });
                  }
                  const entry = byOrder.get(d.order.orderNumber)!;
                  entry.sizes.set(d.size, (entry.sizes.get(d.size) || 0) + d.deliveredQuantity);
                }

                return (
                  <tr key={g.id}>
                    <td><strong>{g.sunatNumber}</strong></td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      {g.date.toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        {clientNames.map(name => (
                          <span key={name} style={{ fontWeight: 600, fontSize: "0.9rem" }}>{name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {[...byOrder.values()].map(entry => (
                          <div key={entry.orderNumber} style={{ fontSize: "0.8rem" }}>
                            <strong style={{ color: "var(--primary)" }}>{entry.orderNumber}:</strong>{" "}
                            {[...entry.sizes.entries()].map(([sz, qty]) => (
                              <span key={sz} style={{ background: "var(--bg-color)", padding: "0.1rem 0.4rem", borderRadius: "4px", margin: "0 0.15rem" }}>
                                {sz}: {qty}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{totalDelivered} u.</td>
                    <td>
                      <span className={styles.badge} style={{
                        background: g.status === 'ANULADA' ? 'var(--danger)' : 'var(--primary)',
                        color: 'white'
                      }}>
                        {g.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/guides/${g.id}`} className={styles.editBtn}>
                          <FileText size={18} />
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
