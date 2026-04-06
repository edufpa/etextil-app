"use client";

import { Trash2 } from "lucide-react";
import { deleteSize } from "@/app/actions/sizes";
import styles from "../services/services.module.css";
import { useState } from "react";

export default function DeleteSizeButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar esta talla?")) return;
    setLoading(true);
    const res = await deleteSize(id);
    if (res.error) {
      alert(res.error);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      className={styles.deleteBtn}
      disabled={loading}
      style={{ opacity: loading ? 0.5 : 1 }}
    >
      <Trash2 size={18} />
    </button>
  );
}
