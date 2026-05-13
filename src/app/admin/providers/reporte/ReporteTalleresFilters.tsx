"use client";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  services: { id: number; name: string }[];
  providers: { id: number; businessName: string }[];
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)",
  textTransform: "uppercase", marginBottom: "0.25rem", display: "block",
};

export default function ReporteTalleresFilters({ services, providers }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/admin/providers/reporte?${p.toString()}`);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label style={labelStyle}>Taller</label>
        <select value={searchParams.get("provider") || ""} onChange={(e) => update("provider", e.target.value)}
          style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.875rem" }}>
          <option value="">Todos los talleres</option>
          {providers.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.businessName}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label style={labelStyle}>Servicio</label>
        <select value={searchParams.get("service") || ""} onChange={(e) => update("service", e.target.value)}
          style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.875rem" }}>
          <option value="">Todos los servicios</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}
