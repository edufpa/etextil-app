import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import styles from "../services/services.module.css";

export const dynamic = 'force-dynamic';
export default async function GuidesPage() {
  const guides = await prisma.guide.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      details: { include: { order: true } }
    }
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Guías SUNAT (Entregas)</h1>
        <Link href="/admin/guides/new" className={styles.newButton}>
          <Plus size={18} />
          Nueva Guía
        </Link>
      </div>

      <div className={styles.tableContainer}>
        {guides.length === 0 ? (
          <div className={styles.emptyState}>
            No hay guías registradas.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>N° Guía</th>
                <th>Fecha</th>
                <th>Pedidos Incluidos</th>
                <th>Total Prendas Entregadas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((g: any) => {
                const totalDelivered = g.details.reduce((acc: number, d: any) => acc + d.deliveredQuantity, 0);
                
                return (
                  <tr key={g.id}>
                    <td><strong>{g.sunatNumber}</strong></td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      {g.date.toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {g.details.map((d: any) => (
                          <span key={d.id} style={{ background: "var(--bg-color)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius)" }}>
                            {d.order.orderNumber}
                          </span>
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
