"use client";
import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "PENDIENTE", label: "Pendiente", color: "orange" },
  { value: "EN PROCESO", label: "Proceso", color: "#7c3aed" },
  { value: "PARCIALMENTE ENTREGADO", label: "Parcial", color: "#2563eb" },
  { value: "ENTREGADO", label: "Entregado", color: "green" },
  { value: "CANCELADO", label: "Cancelado", color: "#dc2626" },
];

const QUICK_DAYS = [
  { label: "7d", days: 7 },
  { label: "15d", days: 15 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "360d", days: 360 },
];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatus = searchParams.get("status");
  const effectiveStatus = rawStatus !== null ? rawStatus : "EN PROCESO,PENDIENTE,PARCIALMENTE ENTREGADO";
  const selectedStatuses = effectiveStatus === "ALL" ? [] : effectiveStatus.split(",").filter(Boolean);
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    return `/admin/orders?${p.toString()}`;
  };

  const toggleStatus = (value: string) => {
    const next = selectedStatuses.includes(value)
      ? selectedStatuses.filter((s) => s !== value)
      : [...selectedStatuses, value];
    router.push(buildUrl({ status: next.join(",") }));
  };

  const applyQuickDays = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - days + 1);
    router.push(buildUrl({ from: toDateStr(from), to: toDateStr(today) }));
  };

  const isQuickDayActive = (days: number) => {
    if (!fromParam || !toParam) return false;
    const today = new Date();
    const expectedFrom = new Date(today);
    expectedFrom.setDate(today.getDate() - days + 1);
    return fromParam === toDateStr(expectedFrom) && toParam === toDateStr(today);
  };

  const hasFilters = searchParams.toString().length > 0;

  const labelStyle: React.CSSProperties = {
    fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", marginBottom: "0.4rem", display: "block",
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem",
      background: "var(--card-bg)", border: "1px solid var(--card-border)",
      borderRadius: "var(--radius)", marginBottom: "1rem",
    }}>
      {/* Status toggle buttons */}
      <div>
        <label style={labelStyle}>Estado</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {STATUSES.map(({ value, label, color }) => {
            const active = selectedStatuses.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleStatus(value)}
                style={{
                  padding: "0.35rem 0.9rem", borderRadius: "100px", border: `2px solid ${color}`,
                  background: active ? color : "transparent",
                  color: active ? "white" : color,
                  fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={() => router.push(buildUrl({ status: "ALL" }))}
            style={{
              padding: "0.35rem 0.75rem", borderRadius: "100px",
              border: "1px solid var(--card-border)",
              background: effectiveStatus === "ALL" ? "var(--primary)" : "transparent",
              color: effectiveStatus === "ALL" ? "white" : "var(--text-muted)",
              fontWeight: effectiveStatus === "ALL" ? 700 : 400,
              fontSize: "0.78rem", cursor: "pointer",
            }}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Date filters */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        {/* Quick date pills */}
        <div>
          <label style={labelStyle}>Rango rápido</label>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {QUICK_DAYS.map(({ label, days }) => {
              const active = isQuickDayActive(days);
              return (
                <button
                  key={days}
                  onClick={() => applyQuickDays(days)}
                  style={{
                    padding: "0.35rem 0.75rem", borderRadius: "100px",
                    border: "1px solid var(--card-border)",
                    background: active ? "var(--primary)" : "var(--bg-color)",
                    color: active ? "white" : "var(--text-muted)",
                    fontWeight: active ? 700 : 400, fontSize: "0.8rem", cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom date inputs */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Desde</label>
            <input
              type="date"
              value={fromParam}
              onChange={(e) => router.push(buildUrl({ from: e.target.value }))}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.875rem" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Hasta</label>
            <input
              type="date"
              value={toParam}
              onChange={(e) => router.push(buildUrl({ to: e.target.value }))}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.875rem" }}
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => router.push("/admin/orders")}
            style={{ padding: "0.4rem 1rem", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "6px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.82rem" }}
          >
            Limpiar todo
          </button>
        )}
      </div>
    </div>
  );
}
