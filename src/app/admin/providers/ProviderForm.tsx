"use client";

import { createProvider, updateProvider } from "@/app/actions/providers";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function ProviderForm({ provider }: { provider?: any }) {
  const isEditing = !!provider;
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
      formData.append("status", "true");
      res = await updateProvider(provider.id, formData);
    } else {
      res = await createProvider(formData);
    }

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/providers");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin/providers" className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver
        </Link>
        <h1 className={styles.title}>{isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.formGroup}>
          <label>Nombre o Razón Social *</label>
          <input 
            name="businessName" 
            type="text" 
            defaultValue={provider?.businessName} 
            required 
            placeholder="Ej: Textiles San Juan S.A."
          />
        </div>

        <div className={styles.formGroup}>
          <label>Nombre de Contacto</label>
          <input 
            name="contactName" 
            type="text" 
            defaultValue={provider?.contactName} 
            placeholder="Ej: Juan Pérez"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Teléfono</label>
            <input 
              name="phone" 
              type="text" 
              defaultValue={provider?.phone} 
              placeholder="Ej: +52 555 123 4567"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Email</label>
            <input 
              name="email" 
              type="email" 
              defaultValue={provider?.email} 
              placeholder="Ej: contacto@empresa.com"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Dirección</label>
          <textarea 
            name="address" 
            defaultValue={provider?.address} 
            rows={2}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Observaciones</label>
          <textarea 
            name="notes" 
            defaultValue={provider?.notes} 
            rows={3}
            placeholder="Comentarios adicionales sobre este proveedor..."
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar Proveedor"}
          </button>
        </div>
      </form>
    </div>
  );
}
