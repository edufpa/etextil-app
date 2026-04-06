import { User, Building2 } from "lucide-react";
import styles from "./Header.module.css";
import LogoutButton from "./LogoutButton";
import { getServerSession } from "@/lib/server-session";

export default async function Header() {
  const session = await getServerSession();
  const displayName = session?.username
    ? String(session.username).toUpperCase()
    : "Administrador";
  const companyName = session?.companyName
    ? String(session.companyName)
    : session?.role === "GLOBAL_ADMIN"
    ? "Admin General"
    : "";

  return (
    <header className={styles.header}>
      <div className={styles.searchContainer}>
        {companyName && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700 }}>
            <Building2 size={15} />
            {companyName}
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <div className={styles.profile}>
          <div className={styles.avatar}>
            <User size={18} />
          </div>
          <span>{displayName}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
