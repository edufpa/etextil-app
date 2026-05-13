"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Scissors, Truck, Users, Package, FileText, Ruler, Palette, BarChart2, ClipboardList, ScrollText, Shirt, BookOpen, PieChart, ChevronDown, ShoppingBag } from "lucide-react";
import styles from "./Sidebar.module.css";

const mainItems = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Pedidos", path: "/admin/pedidos", icon: ShoppingBag },
  { name: "OPs", path: "/admin/orders", icon: ClipboardList },
  { name: "Despachos", path: "/admin/guides", icon: FileText },
  { name: "Reporte Talleres", path: "/admin/providers/reporte", icon: BarChart2 },
  { name: "Reporte Servicios", path: "/admin/services/reporte", icon: PieChart },
  { name: "Log Actividad", path: "/admin/log", icon: ScrollText },
  { name: "Admin General", path: "/admin/global", icon: Users },
];

const configItems = [
  { name: "Clientes", path: "/admin/clients", icon: Users },
  { name: "Proveedores", path: "/admin/providers", icon: Truck },
  { name: "Servicios", path: "/admin/services", icon: Scissors },
  { name: "Prendas", path: "/admin/garments", icon: Shirt },
  { name: "Moldes", path: "/admin/molds", icon: BookOpen },
  { name: "Tallas", path: "/admin/sizes", icon: Ruler },
  { name: "Colores", path: "/admin/colors", icon: Palette },
];

export default function Sidebar() {
  const pathname = usePathname();
  const configActive = configItems.some((item) => pathname.startsWith(item.path));
  const [configOpen, setConfigOpen] = useState(configActive);

  const isActive = (path: string) =>
    pathname === path || (pathname.startsWith(path) && path !== "/admin");

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.logo} style={{ textDecoration: "none" }}>
        <h1>SIAT</h1>
      </Link>

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

      {/* Config section — collapsible */}
      <div className={styles.configSection}>
        <button
          onClick={() => setConfigOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "none", border: "none", cursor: "pointer",
            padding: "0.5rem 1rem 0.25rem", color: "var(--text-muted)",
          }}
        >
          <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>
            Configuración
          </span>
          <ChevronDown
            size={13}
            style={{ opacity: 0.5, transition: "transform 0.2s", transform: configOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {configOpen && configItems.map((item) => (
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
