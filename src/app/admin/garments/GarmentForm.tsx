"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createGarment, updateGarment } from "@/app/actions/garments";
import { ImageIcon, Upload, Save, Shirt, X } from "lucide-react";
import styles from "../services/form.module.css";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(garment?.photoUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
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
    <form
      className={styles.formCard}
      onSubmit={handleSubmit}
      style={{ maxWidth: "780px" }}
    >
      {error && <div className={styles.error}>{error}</div>}

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--card-border)" }}>
        <Shirt size={17} style={{ color: "var(--primary)" }} />
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--foreground)" }}>Datos de la Prenda</span>
      </div>

      {/* Photo + main fields row */}
      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>

        {/* Photo upload */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)", alignSelf: "flex-start" }}>Foto de Prenda</span>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: "148px",
              height: "148px",
              border: `2px dashed var(--card-border)`,
              borderRadius: "10px",
              cursor: "pointer",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-color)",
              transition: "border-color 0.2s",
              position: "relative",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--card-border)")}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem" }}>
                <ImageIcon size={28} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
                <div style={{ fontSize: "0.72rem", lineHeight: 1.4 }}>Click para<br />subir imagen</div>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {previewUrl && (
            <button
              type="button"
              onClick={() => { setPreviewUrl(null); if (fileRef.current) fileRef.current.value = ""; }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.75rem",
                color: "#dc2626",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <X size={12} /> Quitar foto
            </button>
          )}
        </div>

        {/* Main fields */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className={styles.formGroup}>
            <label>Nombre de la prenda *</label>
            <input
              name="name"
              type="text"
              defaultValue={garment?.name ?? ""}
              required
              placeholder="Ej: Polo Deportivo, Camisa Slim Fit..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div className={styles.formGroup}>
              <label>Código</label>
              <input
                name="code"
                type="text"
                defaultValue={garment?.code ?? ""}
                placeholder="Ej: CAM-001"
                style={{ fontFamily: "monospace" }}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Material / Composición</label>
              <input
                name="material"
                type="text"
                defaultValue={garment?.material ?? ""}
                placeholder="Ej: Algodón 100%, Polyester..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mold + notes section */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--card-border)", marginTop: "0.5rem" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--foreground)" }}>Configuración</span>
      </div>

      <div className={styles.formGroup}>
        <label>Molde asociado</label>
        <select name="mold_id" defaultValue={garment?.mold_id ?? ""}>
          <option value="">— Sin molde —</option>
          {molds.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} — {m.name}
            </option>
          ))}
        </select>
        <span className={styles.helpText}>Vincula esta prenda con un molde de producción existente</span>
      </div>

      <div className={styles.formGroup}>
        <label>Notas adicionales</label>
        <textarea
          name="notes"
          defaultValue={garment?.notes ?? ""}
          placeholder="Instrucciones especiales, referencias de producción, detalles de confección..."
          rows={3}
          style={{ resize: "vertical" }}
        />
      </div>

      <div className={styles.actions} style={{ gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => router.push("/admin/garments")}
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
          <Upload size={16} />
          {loading ? "Guardando..." : garment ? "Actualizar Prenda" : "Crear Prenda"}
        </button>
      </div>
    </form>
  );
}
