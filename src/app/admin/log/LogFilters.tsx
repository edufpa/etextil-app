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

const ACTIONS = [
  { value: "CREATE_ORDER",     label: "Nuevo Pedido" },
  { value: "DELETE_ORDER",     label: "Eliminó Pedido" },
  { value: "REGISTER_OP",      label: "Generó OP" },
  { value: "REGISTER_INGRESO", label: "Ingreso Taller" },
  { value: "UPDATE_ORDER",     label: "Editó Pedido" },
  { value: "CLOSE_ORDER",      label: "Cerró Pedido" },
];

export default function LogFilters({ allUsers }: { allUsers: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/admin/log?${p.toString()}`);
  };

  const clear = () => router.push("/admin/log");
  const hasFilters = searchParams.toString().length > 0;

  return (
    <div style={filterBarStyle}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Acción</label>
        <select value={searchParams.get("action") || ""} onChange={(e) => update("action", e.target.value)}>
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Usuario</label>
        <select value={searchParams.get("user") || ""} onChange={(e) => update("user", e.target.value)}>
          <option value="">Todos los usuarios</option>
          {allUsers.map((u) => <option key={u} value={u}>{u}</option>)}
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
          Limpiar
        </button>
      )}
    </div>
  );
}
