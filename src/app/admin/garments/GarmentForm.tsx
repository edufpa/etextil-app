"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createGarment, updateGarment } from "@/app/actions/garments";
import { Image, Upload } from "lucide-react";
import styles from "../services/services.module.css";

type MoldOption = { id: number; code: string; name: string };
type GarmentData = {
  id: number;
  name: string;
  code: string | null;
  material: string | null;
  mold_id: number | null;
  notes: string | null;
  photoUrl: string | null;
  status: boolean;
};

export default function GarmentForm({ garment, molds }: { garment?: GarmentData; molds: MoldOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(garment?.photoUrl || null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const res = garment ? await updateGarment(garment.id, fd) : await createGarment(fd);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
    } else {
      router.push("/admin/garments");
    }
  }

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: "6px", fontSize: "0.875rem" }}>{error}</div>}

          {/* Photo upload */}
          <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
            <div>
              <label className={styles.label}>Foto de Prenda</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ width: "140px", height: "140px", border: "2px dashed var(--card-border)", borderRadius: "8px", cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-color)", position: "relative" }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    <Image size={32} style={{ marginBottom: "0.5rem" }} />
                    <div style={{ fontSize: "0.75rem" }}>Click para subir</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" name="photo" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
              {previewUrl && (
                <button type="button" onClick={() => { setPreviewUrl(null); if (fileRef.current) fileRef.current.value = ""; }}
                  style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>
                  Quitar foto
                </button>
              )}
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className={styles.label}>Nombre *</label>
                <input name="name" defaultValue={garment?.name || ""} required placeholder="Nombre de la prenda"
                  className={styles.input} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className={styles.label}>Código</label>
                  <input name="code" defaultValue={garment?.code || ""} placeholder="Ej: CAM-001"
                    className={styles.input} style={{ fontFamily: "monospace" }} />
                </div>
                <div>
                  <label className={styles.label}>Material</label>
                  <input name="material" defaultValue={garment?.material || ""} placeholder="Ej: Algodón 100%"
                    className={styles.input} />
                </div>
              </div>
            </div>
          </div>

          {/* Mold selection */}
          <div>
            <label className={styles.label}>Molde asociado</label>
            <select name="mold_id" defaultValue={garment?.mold_id || ""} className={styles.input}>
              <option value="">— Sin molde —</option>
              {molds.map((m) => (
                <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.label}>Notas</label>
            <textarea name="notes" defaultValue={garment?.notes || ""} placeholder="Observaciones adicionales..."
              className={styles.input} rows={3} style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => router.push("/admin/garments")}
              style={{ padding: "0.6rem 1.25rem", border: "1px solid var(--card-border)", borderRadius: "6px", background: "transparent", cursor: "pointer", color: "var(--text-color)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={styles.addBtn}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Upload size={16} /> {loading ? "Guardando..." : garment ? "Actualizar" : "Crear Prenda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
