import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/company";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import styles from "../services/services.module.css";
import DeleteMoldButton from "./DeleteMoldButton";

export const dynamic = "force-dynamic";

export default async function MoldsPage() {
  const companyId = await getSessionCompanyId();
  const molds = await prisma.mold.findMany({
    where: companyId ? { company_id: companyId } : {},
    orderBy: { code: "asc" },
    include: { _count: { select: { garments: true } } },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Moldes</h1>
        <Link href="/admin/molds/new" className={styles.addBtn}>
          <Plus size={18} /> Nuevo Molde
        </Link>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Prendas</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {molds.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No hay moldes registrados.</td></tr>
            )}
            {molds.map((m) => (
              <tr key={m.id}>
                <td><strong style={{ fontFamily: "monospace", color: "var(--primary)" }}>{m.code}</strong></td>
                <td>{m.name}</td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{m.description || "—"}</td>
                <td>{m._count.garments}</td>
                <td>
                  <span className={styles.badge} style={{ background: m.status ? "var(--primary)" : "#888", color: "white" }}>
                    {m.status ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <Link href={`/admin/molds/${m.id}`} className={styles.editBtn} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }}>
                      <Pencil size={14} /> Editar
                    </Link>
                    <DeleteMoldButton id={m.id} code={m.code} garmentCount={m._count.garments} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
