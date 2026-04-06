"use client";

import { createClient, updateClient } from "@/app/actions/clients";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function ClientForm({ client }: { client?: any }) {
  const isEditing = !!client;
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
      res = await updateClient(client.id, formData);
    } else {
      res = await createClient(formData);
    }

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/clients");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin/clients" className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver
        </Link>
        <h1 className={styles.title}>{isEditing ? "Editar Cliente" : "Nuevo Cliente"}</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.formGroup}>
          <label>Nombre del Cliente *</label>
          <input 
            name="name" 
            type="text" 
            defaultValue={client?.name} 
            required 
            placeholder="Introduce el nombre identificador"
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar Cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
