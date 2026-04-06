import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import styles from "../services/services.module.css";

export const dynamic = 'force-dynamic';
export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true, guides: true },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Pedidos</h1>
        <Link href="/admin/orders/new" className={styles.newButton}>
          <Plus size={18} />
          Nuevo Pedido
        </Link>
      </div>

      <div className={styles.tableContainer}>
        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            No hay pedidos registrados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Prenda / Color</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const totalDelivered = o.guides.reduce((acc: number, g: any) => acc + g.deliveredQuantity, 0);
                
                return (
                  <tr key={o.id}>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>{o.client.name}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      {o.date.toLocaleDateString()}
                    </td>
                    <td>
                      {o.garment} <br/> 
                      <span style={{fontSize:"0.75rem", color:"var(--text-muted)" }}>{o.color}</span>
                    </td>
                    <td>
                      <div>Pedidas: {o.totalQuantity}</div>
                      <div style={{fontSize:"0.75rem", color: totalDelivered >= o.totalQuantity ? 'green' : 'orange' }}>
                        Entregadas: {totalDelivered}
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge} style={{
                        background: o.status === 'CERRADO' ? '#333' : 
                                   o.status === 'PENDIENTE' ? 'orange' :
                                   o.status === 'ENTREGADO' ? 'green' : 'blue',
                        color: o.status === 'CERRADO' ? 'white' : 'inherit'
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/orders/${o.id}`} className={styles.editBtn}>
                          <Package size={18} />
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
