"use client";

import { PackageCheck } from "lucide-react";
import { closeOrderManually } from "@/app/actions/orders";
import { useState } from "react";

export default function CloseOrderButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    if (!confirm("¿Marcar este pedido como ENTREGADO?")) return;
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
        opacity: loading ? 0.5 : 1,
      }}
    >
      <PackageCheck size={18} />
      {loading ? "Guardando..." : "MARCAR ENTREGADO"}
    </button>
  );
}
