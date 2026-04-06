import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import styles from "../services/services.module.css";
import DeleteClientButton from "./DeleteClientButton";

export const dynamic = 'force-dynamic';
export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    where: { status: true },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Clientes</h1>
        <Link href="/admin/clients/new" className={styles.newButton}>
          <Plus size={18} />
          Nuevo Cliente
        </Link>
      </div>

      <div className={styles.tableContainer}>
        {clients.length === 0 ? (
          <div className={styles.emptyState}>
            No hay clientes registrados o activos.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre del Cliente</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {c.createdAt.toLocaleDateString()}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/admin/clients/${c.id}`} className={styles.editBtn}>
                        <Pencil size={18} />
                      </Link>
                      <DeleteClientButton id={c.id} />
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
