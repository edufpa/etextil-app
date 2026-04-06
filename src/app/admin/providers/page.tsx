import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil, BarChart2 } from "lucide-react";
import styles from "../services/services.module.css";
import DeleteProviderButton from "./DeleteProviderButton";
import { companyFilter } from "@/lib/company";

export const dynamic = 'force-dynamic';
export default async function ProvidersPage() {
  const filter = await companyFilter();
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "desc" },
    where: { status: true, ...filter },
    include: { services: { include: { service: { select: { name: true } } } } },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Proveedores</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/admin/providers/reporte" className={styles.editBtn} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <BarChart2 size={16} />
            Reporte Talleres
          </Link>
          <Link href="/admin/providers/new" className={styles.newButton}>
            <Plus size={18} />
            Nuevo Proveedor
          </Link>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {providers.length === 0 ? (
          <div className={styles.emptyState}>
            No hay proveedores registrados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Razón Social</th>
                <th>Contacto Principal</th>
                <th>Datos Contacto</th>
                <th>Servicios</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p: any) => (

                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td><strong>{p.businessName}</strong></td>
                  <td>{p.contactName || "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {p.phone && <div>Tel: {p.phone}</div>}
                    {p.email && <div>Email: {p.email}</div>}
                    {!p.phone && !p.email && "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {(p as any).services.length > 0
                        ? (p as any).services.map((ps: any) => (
                            <span key={ps.service.name} style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 600, padding: "2px 7px", borderRadius: "999px", border: "1px solid rgba(99,102,241,0.2)" }}>
                              {ps.service.name}
                            </span>
                          ))
                        : <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Sin servicios</span>
                      }
                    </div>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link
                        href={`/admin/providers/${p.id}/reporte`}
                        className={styles.editBtn}
                        title="Ver reporte de taller"
                        style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }}
                      >
                        <BarChart2 size={16} />
                        Reporte
                      </Link>
                      <Link href={`/admin/providers/${p.id}`} className={styles.editBtn}>
                        <Pencil size={18} />
                      </Link>
                      <DeleteProviderButton id={p.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
