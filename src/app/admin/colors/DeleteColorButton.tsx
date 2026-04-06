"use client";

import { Trash2 } from "lucide-react";
import { deleteColor } from "@/app/actions/colors";
import styles from "../services/services.module.css";
import { useState } from "react";

export default function DeleteColorButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar este color?")) return;
    setLoading(true);
    const res = await deleteColor(id);
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
