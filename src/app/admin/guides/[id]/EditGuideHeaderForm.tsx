"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateGuideHeader } from "@/app/actions/guides";
import { Pencil, Save, X } from "lucide-react";

type Props = {
  guideId: number;
  sunatNumber: string;
  date: string; // ISO date string YYYY-MM-DD
  notes: string;
};

export default function EditGuideHeaderForm({ guideId, sunatNumber, date, notes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [num, setNum] = useState(sunatNumber);
  const [dt, setDt] = useState(date);
  const [nt, setNt] = useState(notes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await updateGuideHeader(guideId, {
      sunatNumber: num,
      date: new Date(dt + "T12:00:00"),
      notes: nt,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setOpen(false);
      router.refresh();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "var(--primary)",
          color: "white",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        <Pencil size={16} /> Editar
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginTop: "1rem",
      }}
    >
      <strong style={{ fontSize: "0.9rem" }}>Editar Guía</strong>
      {error && (
        <div style={{ color: "red", fontSize: "0.82rem", background: "#fff0f0", padding: "0.4rem 0.6rem", borderRadius: "4px" }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>N° Guía SUNAT</label>
          <input type="text" value={num} onChange={(e) => setNum(e.target.value)} required />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Fecha</label>
          <input type="date" value={dt} onChange={(e) => setDt(e.target.value)} required />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Observaciones</label>
        <textarea value={nt} onChange={(e) => setNt(e.target.value)} rows={2} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--primary)",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          <Save size={15} /> {loading ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "transparent",
            border: "1px solid var(--card-border)",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          <X size={15} /> Cancelar
        </button>
      </div>
    </form>
  );
}
