"use client";

import { createService, updateService } from "@/app/actions/services";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./form.module.css";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function ServiceForm({ service }: { service?: any }) {
  const isEditing = !!service;
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    let res;

    if (isEditing) {
      formData.append("status", "true"); // keep it active
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
            placeholder="Ej: Confección de Playeras"
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
