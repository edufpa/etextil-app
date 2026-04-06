"use client";

import { CheckCircle } from "lucide-react";
import { closeOrderManually } from "@/app/actions/orders";
import { useState } from "react";

export default function CloseOrderButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    if (!confirm("¿Seguro que deseas marcar este pedido como CERRADO? Esto es irreversible.")) return;
    setLoading(true);
    await closeOrderManually(id);
    setLoading(false);
  };

  return (
    <button 
      onClick={handleClose} 
      disabled={loading}
      style={{ 
        display: "flex", alignItems: "center", gap: "0.5rem",
        background: "var(--success)", color: "white",
        padding: "0.5rem 1rem", borderRadius: "100px", fontWeight: 600, border: "none", cursor: "pointer",
        opacity: loading ? 0.5 : 1 
      }}
    >
      <CheckCircle size={18} />
      CERRAR PEDIDO
    </button>
  );
}
