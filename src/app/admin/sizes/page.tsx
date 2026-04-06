import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import styles from "../services/services.module.css";
import DeleteSizeButton from "./DeleteSizeButton";

export const dynamic = 'force-dynamic';
export default async function SizesPage() {
  const sizes = await prisma.size.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Tallas</h1>
        <Link href="/admin/sizes/new" className={styles.newButton}>
          <Plus size={18} />
          Nueva Talla
        </Link>
      </div>

      <div className={styles.tableContainer}>
        {sizes.length === 0 ? (
          <div className={styles.emptyState}>
            No hay tallas registradas. Agrega tu primera talla.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre de la Talla</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((size: any) => (
                <tr key={size.id}>
                  <td style={{ color: "var(--text-muted)" }}>#{size.id}</td>
                  <td><strong>{size.name}</strong></td>
                  <td>
                    <span className={styles.badge} style={{
                      background: size.status ? "var(--primary)" : "#888",
                      color: "white"
                    }}>
                      {size.status ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/admin/sizes/${size.id}`} className={styles.editBtn}>
                        <Pencil size={18} />
                      </Link>
                      <DeleteSizeButton id={size.id} />
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
