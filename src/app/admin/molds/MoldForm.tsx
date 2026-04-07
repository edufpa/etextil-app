"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMold, updateMold } from "@/app/actions/molds";
import styles from "../services/services.module.css";

type MoldData = { id: number; code: string; name: string; description: string | null; notes: string | null; status: boolean };

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
      code: fd.get("code") as string,
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
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: "6px", fontSize: "0.875rem" }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
            <div>
              <label className={styles.label}>Código *</label>
              <input name="code" defaultValue={mold?.code || ""} required placeholder="MOL-001"
                className={styles.input} style={{ fontFamily: "monospace", textTransform: "uppercase" }} />
            </div>
            <div>
              <label className={styles.label}>Nombre *</label>
              <input name="name" defaultValue={mold?.name || ""} required placeholder="Nombre del molde"
                className={styles.input} />
            </div>
          </div>

          <div>
            <label className={styles.label}>Descripción</label>
            <input name="description" defaultValue={mold?.description || ""} placeholder="Descripción breve"
              className={styles.input} />
          </div>

          <div>
            <label className={styles.label}>Notas</label>
            <textarea name="notes" defaultValue={mold?.notes || ""} placeholder="Observaciones adicionales..."
              className={styles.input} rows={3} style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => router.push("/admin/molds")}
              style={{ padding: "0.6rem 1.25rem", border: "1px solid var(--card-border)", borderRadius: "6px", background: "transparent", cursor: "pointer", color: "var(--text-color)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={styles.addBtn}>
              {loading ? "Guardando..." : mold ? "Actualizar" : "Crear Molde"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
