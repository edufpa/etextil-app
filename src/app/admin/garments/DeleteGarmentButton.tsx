"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteGarment } from "@/app/actions/garments";

export default function DeleteGarmentButton({ id, name }: { id: number; name: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar la prenda "${name}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res = await deleteGarment(id);
    if (res.error) { alert(res.error); setLoading(false); }
  }

  return (
    <button onClick={handleDelete} disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0.35rem 0.7rem", border: "1px solid #dc2626", borderRadius: "6px", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "0.8rem" }}>
      <Trash2 size={14} /> {loading ? "..." : "Eliminar"}
    </button>
  );
}
