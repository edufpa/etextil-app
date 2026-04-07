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

type Props = {
  services: { id: number; name: string }[];
  providers: { id: number; businessName: string }[];
};

export default function OpsFilters({ services, providers }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/admin/providers/ops?${p.toString()}`);
  };

  const clear = () => router.push("/admin/providers/ops");
  const hasFilters = searchParams.toString().length > 0;

  return (
    <div style={filterBarStyle}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Servicio</label>
        <select value={searchParams.get("service") || ""} onChange={(e) => update("service", e.target.value)}>
          <option value="">Todos los servicios</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Taller</label>
        <select value={searchParams.get("provider") || ""} onChange={(e) => update("provider", e.target.value)}>
          <option value="">Todos los talleres</option>
          {providers.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.businessName}</option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <button onClick={clear} style={{ padding: "0.45rem 1rem", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "6px", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.82rem", alignSelf: "flex-end" }}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
