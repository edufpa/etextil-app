"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMold, updateMold } from "@/app/actions/molds";
import styles from "../services/form.module.css";
import { Box, Save } from "lucide-react";

type MoldData = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  notes: string | null;
  status: boolean;
};

export default function MoldForm({ mold }: { mold?: MoldData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      code: (fd.get("code") as string).toUpperCase().trim(),
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      notes: fd.get("notes") as string,
    };
    const res = mold ? await updateMold(mold.id, data) : await createMold(data);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
    } else {
      router.push("/admin/molds");
    }
  }

  return (
    <form
      className={styles.formCard}
      onSubmit={handleSubmit}
      style={{ maxWidth: "680px" }}
    >
      {error && <div className={styles.error}>{error}</div>}

      {/* Section: Identificación */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--card-border)" }}>
        <Box size={17} style={{ color: "var(--primary)" }} />
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--foreground)" }}>Identificación del Molde</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1.25rem" }}>
        <div className={styles.formGroup}>
          <label>Código *</label>
          <input
            name="code"
            type="text"
            defaultValue={mold?.code ?? ""}
            required
            placeholder="MOL-001"
            style={{ fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}
          />
          <span className={styles.helpText}>Identificador único del molde</span>
        </div>
        <div className={styles.formGroup}>
          <label>Nombre *</label>
          <input
            name="name"
            type="text"
            defaultValue={mold?.name ?? ""}
            required
            placeholder="Ej: Camisa Slim Fit, Polo Cuello V..."
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Descripción</label>
        <input
          name="description"
          type="text"
          defaultValue={mold?.description ?? ""}
          placeholder="Descripción breve del molde (tela, tipo de corte, etc.)"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Notas adicionales</label>
        <textarea
          name="notes"
          defaultValue={mold?.notes ?? ""}
          placeholder="Observaciones, instrucciones especiales, historial de modificaciones..."
          rows={4}
          style={{ resize: "vertical" }}
        />
      </div>

      <div className={styles.actions} style={{ gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => router.push("/admin/molds")}
          style={{
            padding: "0.75rem 1.5rem",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--radius)",
            background: "transparent",
            cursor: "pointer",
            color: "var(--foreground)",
            fontWeight: 500,
            fontSize: "0.9rem",
          }}
        >
          Cancelar
        </button>
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          <Save size={16} />
          {loading ? "Guardando..." : mold ? "Actualizar Molde" : "Crear Molde"}
        </button>
      </div>
    </form>
  );
}
