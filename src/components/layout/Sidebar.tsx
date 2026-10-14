"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Scissors, Truck, Users, FileText, Ruler, Palette, BarChart2, ClipboardList,
  ScrollText, Shirt, BookOpen, PieChart, ChevronDown, ShoppingBag, PackageCheck, Menu, X,
  Wallet, Send, Factory, ShieldCheck,
} from "lucide-react";
import styles from "./Sidebar.module.css";

type Item = { name: string; path: string; icon: React.ComponentType<{ size?: number; className?: string }> };
type Group = { label: string; items: Item[]; collapsible?: boolean; adminOnly?: boolean };

/** Menú ordenado según el flujo: Pedido → OP → OS → Taller → Despacho. */
const GROUPS: Group[] = [
  { label: "General", items: [{ name: "Dashboard", path: "/admin", icon: LayoutDashboard }] },
  {
    label: "Producción",
    items: [
      { name: "Pedidos (PE)", path: "/admin/pedidos", icon: ShoppingBag },
      { name: "Órdenes de Producción", path: "/admin/orders", icon: ClipboardList },
      { name: "Órdenes de Servicio", path: "/admin/os", icon: Send },
    ],
  },
  {
    label: "Talleres",
    items: [
      { name: "Recepción por taller", path: "/admin/taller", icon: PackageCheck },
      { name: "Operativo de talleres", path: "/admin/providers/ops", icon: Factory },
      { name: "Cuentas por pagar", path: "/admin/providers/pagos", icon: Wallet },
    ],
  },
  { label: "Despacho", items: [{ name: "Guías de despacho", path: "/admin/guides", icon: FileText }] },
  {
    label: "Reportes",
    items: [
      { name: "Reporte de talleres", path: "/admin/providers/reporte", icon: BarChart2 },
      { name: "Reporte de servicios", path: "/admin/services/reporte", icon: PieChart },
      { name: "Actividad", path: "/admin/log", icon: ScrollText },
    ],
  },
  {
    label: "Catálogos",
    collapsible: true,
    items: [
      { name: "Clientes", path: "/admin/clients", icon: Users },
      { name: "Proveedores", path: "/admin/providers", icon: Truck },
      { name: "Servicios", path: "/admin/services", icon: Scissors },
      { name: "Prendas", path: "/admin/garments", icon: Shirt },
      { name: "Moldes", path: "/admin/molds", icon: BookOpen },
      { name: "Tallas", path: "/admin/sizes", icon: Ruler },
      { name: "Colores", path: "/admin/colors", icon: Palette },
    ],
  },
  { label: "Administración", adminOnly: true, items: [{ name: "Empresas y usuarios", path: "/admin/global", icon: ShieldCheck }] },
];

export default function Sidebar({ isGlobalAdmin = false }: { isGlobalAdmin?: boolean }) {
  const pathname = usePathname();
  const groups = GROUPS.filter((g) => !g.adminOnly || isGlobalAdmin);

  // La opción activa es la de ruta más específica (evita que "Proveedores" se marque en /providers/pagos)
  const all = groups.flatMap((g) => g.items);
  const activePath = all
    .filter((i) => pathname === i.path || (i.path !== "/admin" && pathname.startsWith(i.path + "/")))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;

  const catalogActive = groups.find((g) => g.collapsible)?.items.some((i) => i.path === activePath) ?? false;
  const [catalogToggled, setCatalogToggled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Catálogos se muestra abierto si el usuario lo abrió o si la página actual pertenece a él
  const catalogOpen = catalogToggled || catalogActive;

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}>
      <div className={styles.brandRow}>
        <Link href="/admin" className={styles.logo}>
          <span className={styles.logoMark} aria-hidden="true">S</span>
          <span className={styles.logoText}>
            <strong>SIAT</strong>
            <small>Control de producción</small>
          </span>
        </Link>
        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className={styles.navWrap} aria-label="Principal">
        {groups.map((g) => {
          const open = !g.collapsible || catalogOpen;
          return (
            <div key={g.label} className={styles.group}>
              {g.collapsible ? (
                <button type="button" className={styles.groupToggle} onClick={() => setCatalogToggled((o) => !o)} aria-expanded={catalogOpen}>
                  <span>{g.label}</span>
                  <ChevronDown size={14} className={catalogOpen ? styles.chevOpen : ""} />
                </button>
              ) : (
                <div className={styles.groupLabel}>{g.label}</div>
              )}
              {open &&
                g.items.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`${styles.link} ${item.path === activePath ? styles.active : ""}`}
                    aria-current={item.path === activePath ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className={styles.icon} size={17} />
                    <span>{item.name}</span>
                  </Link>
                ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
