"use client";

import { Trash2 } from "lucide-react";
import { disableClient } from "@/app/actions/clients";
import styles from "../services/services.module.css";
import { useState } from "react";

export default function DeleteClientButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas desactivar este cliente?")) return;
    setLoading(true);
    await disableClient(id);
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
