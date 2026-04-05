"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.searchContainer}>
        {/* Espacio para buscador global si se requiere */}
      </div>
      <div className={styles.actions}>
        <div className={styles.profile}>
          <div className={styles.avatar}>
            <User size={18} />
          </div>
          <span>Administrador</span>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
