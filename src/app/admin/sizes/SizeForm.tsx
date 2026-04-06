"use client";

import { createSize, updateSize } from "@/app/actions/sizes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Ruler } from "lucide-react";

export default function SizeForm({ size }: { size?: any }) {
  const isEditing = !!size;
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
      res = await updateSize(size.id, { name });
    } else {
      res = await createSize({ name });
    }

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/sizes");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin/sizes" className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver a Tallas
        </Link>
        <h1 className={styles.title}>{isEditing ? "Editar Talla" : "Nueva Talla"}</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label>Nombre de la Talla *</label>
          <input
            name="name"
            type="text"
            defaultValue={size?.name}
            required
            placeholder="Ej: XS, S, M, L, XL, XXL, 28, 30, 32..."
            autoFocus
          />
          <p className={styles.helpText}>
            Ingresa el nombre exacto de la talla tal como se usa en producción.
          </p>
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar Talla"}
          </button>
        </div>
      </form>
    </div>
  );
}
