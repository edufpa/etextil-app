import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import styles from "./layout.module.css";
import { getServerSession } from "@/lib/server-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  return (
    <div className={styles.adminContainer}>
      <Sidebar isGlobalAdmin={session?.role === "GLOBAL_ADMIN"} />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.pageContent}>{children}</main>
      </div>
    </div>
  );
}
