import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import styles from "./layout.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.adminContainer}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.pageContent}>{children}</main>
      </div>
    </div>
  );
}
