"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Scissors, Truck, Settings } from "lucide-react";
import styles from "./Sidebar.module.css";

const menuItems = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Servicios", path: "/admin/services", icon: Scissors },
  { name: "Proveedores", path: "/admin/providers", icon: Truck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>eTextil</h1>
      </div>
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== "/admin");
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.link} ${isActive ? styles.active : ""}`}
            >
              <item.icon className={styles.icon} size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className={styles.footer}>
        <button className={styles.settingsBtn}>
          <Settings size={20} />
          <span>Configuración</span>
        </button>
      </div>
    </aside>
  );
}
