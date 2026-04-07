import { prisma } from "@/lib/prisma";
import { ScrollText, User, Clock } from "lucide-react";
import styles from "../services/services.module.css";
import { Suspense } from "react";
import LogFilters from "./LogFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ action?: string; user?: string; from?: string; to?: string }>;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE_ORDER:     { label: "Nuevo Pedido",    color: "#6366f1" },
  DELETE_ORDER:     { label: "Eliminó Pedido",  color: "#dc2626" },
  REGISTER_OP:      { label: "Generó OP",       color: "#0ea5e9" },
  REGISTER_INGRESO: { label: "Ingreso Taller",  color: "#16a34a" },
  DELETE_DELIVERY:  { label: "Eliminó Entrega", color: "#f59e0b" },
  DELETE_INGRESO:   { label: "Eliminó Ingreso", color: "#f59e0b" },
  UPDATE_ORDER:     { label: "Editó Pedido",    color: "#8b5cf6" },
  CLOSE_ORDER:      { label: "Cerró Pedido",    color: "#374151" },
};

export default async function LogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const where: any = {};
  if (params.action) where.action = params.action;
  if (params.user) where.username = { contains: params.user, mode: "insensitive" };
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = new Date(params.from);
    if (params.to) where.createdAt.lte = new Date(params.to + "T23:59:59");
  }

  const [logs, allUsers] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.activityLog.findMany({
      select: { username: true },
      distinct: ["username"],
      orderBy: { username: "asc" },
    }),
  ]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ScrollText size={22} style={{ color: "var(--primary)" }} />
          Log de Actividad
        </h1>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {logs.length} registro{logs.length !== 1 ? "s" : ""}
        </span>
      </div>

      <Suspense fallback={null}>
        <LogFilters allUsers={allUsers.map((u) => u.username)} />
      </Suspense>

      {logs.length === 0 ? (
        <div className={styles.emptyState}>No hay actividad registrada con esos filtros.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {logs.map((log) => {
            const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: "var(--text-muted)" };
            return (
              <div
                key={log.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 140px 1fr auto",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.65rem 1rem",
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                }}
              >
                {/* Timestamp */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  <Clock size={12} />
                  <span>{new Date(log.createdAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>

                {/* Action badge */}
                <span style={{
                  display: "inline-block",
                  background: meta.color + "18",
                  color: meta.color,
                  border: `1px solid ${meta.color}40`,
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  whiteSpace: "nowrap",
                }}>
                  {meta.label}
                </span>

                {/* Detail */}
                <span style={{ color: "var(--text-color)" }}>{log.detail}</span>

                {/* User */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                  <User size={12} />
                  <span style={{ fontWeight: 600 }}>{log.username}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
