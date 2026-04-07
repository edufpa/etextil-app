"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteMold } from "@/app/actions/molds";

export default function DeleteMoldButton({ id, code, garmentCount }: { id: number; code: string; garmentCount: number }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (garmentCount > 0) {
      alert(`No se puede eliminar: el molde ${code} tiene ${garmentCount} prenda(s) asociada(s).`);
      return;
    }
    if (!confirm(`¿Eliminar molde ${code}? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res = await deleteMold(id);
    if (res.error) { alert(res.error); setLoading(false); }
  }

  return (
    <button onClick={handleDelete} disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0.35rem 0.7rem", border: "1px solid #dc2626", borderRadius: "6px", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "0.8rem" }}>
      <Trash2 size={14} /> {loading ? "..." : "Eliminar"}
    </button>
  );
}
