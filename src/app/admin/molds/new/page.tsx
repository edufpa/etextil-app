import MoldForm from "../MoldForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../../services/services.module.css";

export default function NewMoldPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/molds" style={{ color: "var(--text-muted)" }}><ArrowLeft size={20} /></Link>
          <h1 className={styles.title}>Nuevo Molde</h1>
        </div>
      </div>
      <MoldForm />
    </div>
  );
}
