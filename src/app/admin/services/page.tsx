import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import styles from "./services.module.css";
import DeleteServiceButton from "./DeleteServiceButton";


export const dynamic = 'force-dynamic';
export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
    where: { status: true },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Servicios</h1>
        <Link href="/admin/services/new" className={styles.newButton}>
          <Plus size={18} />
          Nuevo Servicio
        </Link>
      </div>

      <div className={styles.tableContainer}>
        {services.length === 0 ? (
          <div className={styles.emptyState}>
            No hay servicios registrados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service: any) => (
                <tr key={service.id}>
                  <td>#{service.id}</td>
                  <td><strong>{service.name}</strong></td>
                  <td>
                    <span className={`${styles.badge} ${styles.type}`}>
                      {service.type}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {service.description || "—"}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/admin/services/${service.id}`} className={styles.editBtn}>
                        <Pencil size={18} />
                      </Link>
                      <DeleteServiceButton id={service.id} />
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
