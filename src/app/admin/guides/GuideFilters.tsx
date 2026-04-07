"use client";
import { useRouter, useSearchParams } from "next/navigation";

const filterBarStyle: React.CSSProperties = {
  display: "flex", gap: "0.75rem", alignItems: "flex-end", padding: "1rem",
  background: "var(--card-bg)", border: "1px solid var(--card-border)",
  borderRadius: "var(--radius)", marginBottom: "1rem", flexWrap: "wrap",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
  textTransform: "uppercase", marginBottom: "0.25rem", display: "block",
};
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column" };

export default function GuideFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/admin/guides?${p.toString()}`);
  };

  const clear = () => router.push("/admin/guides");
  const hasFilters = searchParams.toString().length > 0;

  return (
    <div style={filterBarStyle}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Estado</label>
        <select value={searchParams.get("status") || ""} onChange={(e) => update("status", e.target.value)}>
          <option value="">Todos</option>
          <option value="ACTIVA">Activa</option>
          <option value="ANULADA">Anulada</option>
        </select>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Desde</label>
        <input type="date" value={searchParams.get("from") || ""} onChange={(e) => update("from", e.target.value)} />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Hasta</label>
        <input type="date" value={searchParams.get("to") || ""} onChange={(e) => update("to", e.target.value)} />
      </div>
      {hasFilters && (
        <button onClick={clear} style={{ padding: "0.45rem 1rem", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "6px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.82rem", alignSelf: "flex-end" }}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
