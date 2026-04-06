"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./Header.module.css";

export default function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
  return (
    <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
      <LogOut size={18} />
    </button>
  );
}
