import { prisma } from "@/lib/prisma";
import { Scissors, Truck } from "lucide-react";
import styles from "./dashboard.module.css";


export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const [totalServices, totalProviders, totalClients, totalOrders] = await Promise.all([
    prisma.service.count({ where: { status: true } }),
    prisma.provider.count({ where: { status: true } }),
    prisma.client.count({ where: { status: true } }),
    prisma.order.count({ where: { status: { notIn: ["CERRADO", "CANCELADO"] } } }),
  ]);

  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard Inicial</h1>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>
            <Scissors className={styles.statIcon} size={24} />
          </div>
          <div>
            <p className={styles.statLabel}>Servicios Activos</p>
            <h3 className={styles.statValue}>{totalServices}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.blue}`}>
            <Truck className={styles.statIcon} size={24} />
          </div>
          <div>
            <p className={styles.statLabel}>Proveedores Activos</p>
            <h3 className={styles.statValue}>{totalProviders}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
