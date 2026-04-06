"use client";

import { createProvider, updateProvider } from "@/app/actions/providers";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Scissors } from "lucide-react";

type ServiceOption = { id: number; name: string; type: string };

export default function ProviderForm({
  provider,
  allServices = [],
  selectedServiceIds = [],
}: {
  provider?: any;
  allServices?: ServiceOption[];
  selectedServiceIds?: number[];
}) {
  const isEditing = !!provider;
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedServices, setCheckedServices] = useState<Set<number>>(
    new Set(selectedServiceIds)
  );

  const toggleService = (id: number) => {
    setCheckedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    // Append selected service IDs
    checkedServices.forEach((id) => formData.append("service_ids[]", String(id)));

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

  const serviceTypeLabel: Record<string, string> = {
    interno: "Interno",
    externo: "Externo",
    mixto: "Mixto",
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
          <input name="businessName" type="text" defaultValue={provider?.businessName} required placeholder="Ej: Textiles San Juan S.A." />
        </div>

        <div className={styles.formGroup}>
          <label>Nombre de Contacto</label>
          <input name="contactName" type="text" defaultValue={provider?.contactName} placeholder="Ej: Juan Pérez" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Teléfono</label>
            <input name="phone" type="text" defaultValue={provider?.phone} placeholder="Ej: +52 555 123 4567" />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input name="email" type="email" defaultValue={provider?.email} placeholder="Ej: contacto@empresa.com" />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Dirección</label>
          <textarea name="address" defaultValue={provider?.address} rows={2} />
        </div>

        <div className={styles.formGroup}>
          <label>Observaciones</label>
          <textarea name="notes" defaultValue={provider?.notes} rows={3} placeholder="Comentarios adicionales sobre este proveedor..." />
        </div>

        {/* Services section */}
        {allServices.length > 0 && (
          <div className={styles.formGroup}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Scissors size={15} style={{ color: "var(--primary)" }} />
              Servicios que ofrece este taller
            </label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "var(--bg-color)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--card-border)",
            }}>
              {allServices.map((svc) => (
                <label
                  key={svc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    padding: "0.5rem 0.6rem",
                    borderRadius: "6px",
                    background: checkedServices.has(svc.id) ? "rgba(99,102,241,0.1)" : "transparent",
                    border: checkedServices.has(svc.id) ? "1px solid var(--primary)" : "1px solid transparent",
                    transition: "all 0.15s",
                    fontWeight: checkedServices.has(svc.id) ? 600 : 400,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedServices.has(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    style={{ accentColor: "var(--primary)", width: "15px", height: "15px" }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>{svc.name}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    marginLeft: "auto",
                    background: "var(--card-bg)",
                    padding: "1px 6px",
                    borderRadius: "999px",
                  }}>
                    {serviceTypeLabel[svc.type] || svc.type}
                  </span>
                </label>
              ))}
            </div>
            {checkedServices.size === 0 && (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                Sin servicios asignados — el taller no aparecerá en los filtros de pedidos.
              </div>
            )}
          </div>
        )}

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
