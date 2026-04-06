import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import styles from "../services/services.module.css";
import DeleteColorButton from "./DeleteColorButton";

export const dynamic = 'force-dynamic';
export default async function ColorsPage() {
  const colors = await prisma.color.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Colores</h1>
        <Link href="/admin/colors/new" className={styles.newButton}>
          <Plus size={18} />
          Nuevo Color
        </Link>
      </div>

      <div className={styles.tableContainer}>
        {colors.length === 0 ? (
          <div className={styles.emptyState}>
            No hay colores registrados. Agrega tu primer color.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre del Color</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((color: any) => (
                <tr key={color.id}>
                  <td style={{ color: "var(--text-muted)" }}>#{color.id}</td>
                  <td><strong>{color.name}</strong></td>
                  <td>
                    <span className={styles.badge} style={{
                      background: color.status ? "var(--primary)" : "#888",
                      color: "white"
                    }}>
                      {color.status ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/admin/colors/${color.id}`} className={styles.editBtn}>
                        <Pencil size={18} />
                      </Link>
                      <DeleteColorButton id={color.id} />
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
