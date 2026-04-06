"use client";

import { createService, updateService } from "@/app/actions/services";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Ruler } from "lucide-react";

export default function ServiceForm({ service }: { service?: any }) {
  const isEditing = !!service;
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackBySize, setTrackBySize] = useState<boolean>(service?.trackBySize ?? false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("trackBySize", trackBySize ? "true" : "false");

    let res;
    if (isEditing) {
      formData.append("status", "true");
      res = await updateService(service.id, formData);
    } else {
      res = await createService(formData);
    }

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/services");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin/services" className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver
        </Link>
        <h1 className={styles.title}>{isEditing ? "Editar Servicio" : "Nuevo Servicio"}</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.formGroup}>
          <label>Nombre del Servicio *</label>
          <input 
            name="name" 
            type="text" 
            defaultValue={service?.name} 
            required 
            placeholder="Ej: Bordado, Sublimado, Plancha..."
          />
        </div>

        <div className={styles.formGroup}>
          <label>Descripción</label>
          <textarea 
            name="description" 
            defaultValue={service?.description} 
            rows={3}
            placeholder="Detalles sobre este servicio..."
          />
        </div>

        <div className={styles.formGroup}>
          <label>Tipo de Servicio *</label>
          <select name="type" defaultValue={service?.type || "interno"} required>
            <option value="interno">Interno</option>
            <option value="externo">Externo</option>
            <option value="mixto">Mixto</option>
          </select>
          <p className={styles.helpText}>
            Indica si el servicio se realiza en planta (interno), por maquila (externo) o ambos (mixto).
          </p>
        </div>

        {/* trackBySize toggle */}
        <div className={styles.formGroup}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", userSelect: "none" }}>
            <div
              onClick={() => setTrackBySize(!trackBySize)}
              style={{
                width: "44px", height: "24px", borderRadius: "12px",
                background: trackBySize ? "var(--primary)" : "var(--card-border)",
                position: "relative", transition: "background 0.2s", flexShrink: 0, cursor: "pointer",
              }}
            >
              <div style={{
                position: "absolute", top: "3px",
                left: trackBySize ? "23px" : "3px",
                width: "18px", height: "18px", borderRadius: "50%",
                background: "white", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
            <span style={{ fontWeight: 600 }}>
              Requiere control por talla
            </span>
            {trackBySize && (
              <span style={{
                background: "var(--primary)", color: "white",
                fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: "999px", display: "flex", alignItems: "center", gap: "4px",
              }}>
                <Ruler size={11} /> Por talla
              </span>
            )}
          </label>
          <p className={styles.helpText} style={{ marginTop: "0.5rem" }}>
            {trackBySize
              ? "✓ Se registrará la cantidad requerida por cada talla (Ej: Bordado, Sublimado, Estampado)."
              : "Se registrará solo el total de unidades, sin desglose por talla (Ej: Acabados, Plancha, Corte)."}
          </p>
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar Servicio"}
          </button>
        </div>
      </form>
    </div>
  );
}

