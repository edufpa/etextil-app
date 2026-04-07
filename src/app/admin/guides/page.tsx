import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import styles from "../services/services.module.css";
import { Suspense } from "react";
import GuideFilters from "./GuideFilters";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ status?: string; from?: string; to?: string }>;

export default async function GuidesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.from || params.to) {
    where.date = {};
    if (params.from) where.date.gte = new Date(params.from);
    if (params.to) where.date.lte = new Date(params.to + "T23:59:59");
  }

  const guides = await prisma.guide.findMany({
    orderBy: { createdAt: "desc" },
    where,
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

      <Suspense fallback={null}>
        <GuideFilters />
      </Suspense>

      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
        {guides.length} despacho{guides.length !== 1 ? "s" : ""} encontrado{guides.length !== 1 ? "s" : ""}
      </div>

      <div className={styles.tableContainer}>
        {guides.length === 0 ? (
          <div className={styles.emptyState}>
            No hay despachos con los filtros seleccionados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>N° Despacho</th>
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
                const clientNames = [...new Set(g.details.map((d: any) => d.order.client.name))] as string[];
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
                        {clientNames.map((name: string) => (
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
