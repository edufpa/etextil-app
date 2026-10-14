import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode, ComponentType } from "react";
import s from "./ui.module.css";

export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";
type Icon = ComponentType<{ size?: number }>;

/* ---------- PageHeader ---------- */
export function PageHeader({
  title, subtitle, icon: Icon, breadcrumbs, actions, badge,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: Icon;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className={s.header}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={s.crumbs} aria-label="Ruta de navegación">
          {breadcrumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span className={s.crumbCurrent}>{c.label}</span>}
              {i < breadcrumbs.length - 1 && <ChevronRight size={13} className={s.crumbSep} />}
            </span>
          ))}
        </nav>
      )}
      <div className={s.headRow}>
        <div className={s.titleBlock}>
          <div className={s.titleLine}>
            {Icon && <span className={s.titleIcon}><Icon size={20} /></span>}
            <h1 className={s.title}>{title}</h1>
            {badge}
          </div>
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- Card ---------- */
export function Card({
  title, icon: Icon, count, actions, children, flush, id,
}: {
  title?: ReactNode;
  icon?: Icon;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  /** Sin padding interno (tablas a sangre). */
  flush?: boolean;
  id?: string;
}) {
  return (
    <section className={s.card} id={id}>
      {title && (
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>
            {Icon && <Icon size={17} />}
            {title}
            {count !== undefined && <span className={s.cardCount}>{count}</span>}
          </h2>
          {actions}
        </div>
      )}
      <div className={flush ? s.cardFlush : s.cardBody}>{children}</div>
    </section>
  );
}

/* ---------- Stats ---------- */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={s.stats}>{children}</div>;
}
export function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className={`${s.stat} ${s[`tone-${tone}`]}`}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
      {hint && <div className={s.statHint}>{hint}</div>}
    </div>
  );
}

/* ---------- Status ---------- */
const STATUS_TONE: Record<string, Tone> = {
  // Pedido
  BORRADOR: "neutral", CONFIRMADO: "info", "EN PROCESO": "primary", COMPLETADO: "success",
  // OP
  PENDIENTE: "warning", "PARCIALMENTE ENTREGADO": "info", ENTREGADO: "success", CERRADO: "success", CANCELADO: "danger",
  // OS
  EMITIDA: "info", PARCIAL: "warning", COMPLETA: "success", ANULADA: "neutral",
  // Despacho
  ACTIVA: "success",
};
const STATUS_LABEL: Record<string, string> = { "PARCIALMENTE ENTREGADO": "ENTREGA PARCIAL" };

export function StatusPill({ status, tone }: { status: string; tone?: Tone }) {
  const t = tone ?? STATUS_TONE[status] ?? "neutral";
  return <span className={`${s.pill} ${s[`pill-${t}`]}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/* ---------- Progress ---------- */
/** Barras apiladas sobre un máximo: p. ej. enviado (claro) y recibido (fuerte). El orden de `segments` es de atrás hacia adelante. */
export function ProgressBar({ max, segments, large }: { max: number; segments: { value: number; tone: "primary" | "success" | "info" | "warning" }[]; large?: boolean }) {
  return (
    <div className={`${s.progress} ${large ? s.progressLg : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={max}>
      {segments.map((g, i) => (
        <div key={i} className={`${s.seg} ${s[`seg-${g.tone}`]}`} style={{ width: `${max > 0 ? Math.min(100, (g.value / max) * 100) : 0}%` }} />
      ))}
    </div>
  );
}

/* ---------- Empty ---------- */
export function EmptyState({ icon: Icon, title, children }: { icon?: Icon; title: string; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      {Icon && <div className={s.emptyIcon}><Icon size={22} /></div>}
      <div className={s.emptyTitle}>{title}</div>
      {children && <div>{children}</div>}
    </div>
  );
}

/* ---------- Layout ---------- */
export function Split({ children }: { children: ReactNode }) { return <div className={s.split}>{children}</div>; }
export function Stack({ children }: { children: ReactNode }) { return <div className={s.stack}>{children}</div>; }
export function KV({ items }: { items: { label: string; value: ReactNode; wide?: boolean }[] }) {
  return (
    <div className={s.kv}>
      {items.map((it) => (
        <div key={it.label} style={it.wide ? { gridColumn: "1 / -1" } : undefined}>
          <div className={s.kvLabel}>{it.label}</div>
          <div className={s.kvValue}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}
