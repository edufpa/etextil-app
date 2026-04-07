import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/company";
import Link from "next/link";
import { Plus, Pencil, Image } from "lucide-react";
import styles from "../services/services.module.css";
import DeleteGarmentButton from "./DeleteGarmentButton";

export const dynamic = "force-dynamic";

export default async function GarmentsPage() {
  const companyId = await getSessionCompanyId();
  const garments = await prisma.garment.findMany({
    where: companyId ? { company_id: companyId } : {},
    orderBy: { name: "asc" },
    include: { mold: { select: { code: true, name: true } } },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Prendas</h1>
        <Link href="/admin/garments/new" className={styles.addBtn}>
          <Plus size={18} /> Nueva Prenda
        </Link>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: "60px" }}>Foto</th>
              <th>Nombre</th>
              <th>Código</th>
              <th>Material</th>
              <th>Molde</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {garments.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No hay prendas registradas.</td></tr>
            )}
            {garments.map((g) => (
              <tr key={g.id}>
                <td>
                  {g.photoUrl ? (
                    <img src={g.photoUrl} alt={g.name}
                      style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--card-border)" }} />
                  ) : (
                    <div style={{ width: "48px", height: "48px", background: "var(--bg-color)", borderRadius: "6px", border: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      <Image size={20} />
                    </div>
                  )}
                </td>
                <td><strong>{g.name}</strong></td>
                <td style={{ fontFamily: "monospace", color: "var(--primary)", fontSize: "0.875rem" }}>{g.code || "—"}</td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{g.material || "—"}</td>
                <td style={{ fontSize: "0.875rem" }}>
                  {g.mold ? (
                    <span><strong style={{ color: "var(--primary)" }}>{g.mold.code}</strong> {g.mold.name}</span>
                  ) : "—"}
                </td>
                <td>
                  <span className={styles.badge} style={{ background: g.status ? "var(--primary)" : "#888", color: "white" }}>
                    {g.status ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <Link href={`/admin/garments/${g.id}`} className={styles.editBtn} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }}>
                      <Pencil size={14} /> Editar
                    </Link>
                    <DeleteGarmentButton id={g.id} name={g.name} />
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
