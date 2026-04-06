"use client";

import { createColor, updateColor } from "@/app/actions/colors";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function ColorForm({ color }: { color?: any }) {
  const isEditing = !!color;
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    let res;

    if (isEditing) {
      res = await updateColor(color.id, { name });
    } else {
      res = await createColor({ name });
    }

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/colors");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin/colors" className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver a Colores
        </Link>
        <h1 className={styles.title}>{isEditing ? "Editar Color" : "Nuevo Color"}</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label>Nombre del Color *</label>
          <input
            name="name"
            type="text"
            defaultValue={color?.name}
            required
            placeholder="Ej: Negro, Blanco, Azul Rey, Rojo Carmín..."
            autoFocus
          />
          <p className={styles.helpText}>
            Ingresa el nombre del color tal como se usa en órdenes de producción.
          </p>
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar Color"}
          </button>
        </div>
      </form>
    </div>
  );
}
