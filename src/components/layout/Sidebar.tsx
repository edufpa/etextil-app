"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Scissors, Truck, Users, Package, FileText, Ruler, Palette, BarChart2, ClipboardList, ScrollText } from "lucide-react";
import styles from "./Sidebar.module.css";

const mainItems = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Pedidos", path: "/admin/orders", icon: Package },
  { name: "Despachos", path: "/admin/guides", icon: FileText },
  { name: "Reporte Talleres", path: "/admin/providers/reporte", icon: BarChart2 },
  { name: "OPs Abiertas", path: "/admin/providers/ops", icon: ClipboardList },
  { name: "Log Actividad", path: "/admin/log", icon: ScrollText },
  { name: "Admin General", path: "/admin/global", icon: Users },
];

const configItems = [
  { name: "Clientes", path: "/admin/clients", icon: Users },
  { name: "Proveedores", path: "/admin/providers", icon: Truck },
  { name: "Servicios", path: "/admin/services", icon: Scissors },
  { name: "Tallas", path: "/admin/sizes", icon: Ruler },
  { name: "Colores", path: "/admin/colors", icon: Palette },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || (pathname.startsWith(path) && path !== "/admin");

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>eTextil</h1>
      </div>

      {/* Main navigation */}
      <nav className={styles.nav}>
        {mainItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`${styles.link} ${isActive(item.path) ? styles.active : ""}`}
          >
            <item.icon className={styles.icon} size={20} />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Config section pushed to bottom */}
      <div className={styles.configSection}>
        <div className={styles.configLabel}>Configuración</div>
        {configItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`${styles.link} ${isActive(item.path) ? styles.active : ""}`}
          >
            <item.icon className={styles.icon} size={18} />
            <span>{item.name}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
