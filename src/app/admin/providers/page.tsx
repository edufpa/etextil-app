import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import styles from "../services/services.module.css";
import DeleteProviderButton from "./DeleteProviderButton";

export default async function ProvidersPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "desc" },
    where: { status: true },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Proveedores</h1>
        <Link href="/admin/providers/new" className={styles.newButton}>
          <Plus size={18} />
          Nuevo Proveedor
        </Link>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
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
                    <div className={styles.actions}>
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
