"use client";

import { Trash2 } from "lucide-react";
import { deleteService } from "@/app/actions/services";
import styles from "./services.module.css";
import { useState } from "react";

export default function DeleteServiceButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar este servicio?")) return;
    setLoading(true);
    await deleteService(id);
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
