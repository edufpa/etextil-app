"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder } from "@/app/actions/orders";
import { Trash2 } from "lucide-react";

export default function DeleteOrderButton({ orderId, orderNumber }: { orderId: number; orderNumber: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    const res = await deleteOrder(orderId);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      setConfirming(false);
    } else {
      router.push("/admin/orders");
    }
  };

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        {error && <span style={{ color: "red", fontSize: "0.8rem" }}>{error}</span>}
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>¿Eliminar {orderNumber}?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          style={{ background: "#dc2626", color: "white", border: "none", padding: "0.45rem 1rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}
        >
          {loading ? "Eliminando..." : "Sí, eliminar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ background: "transparent", border: "1px solid var(--card-border)", padding: "0.45rem 0.75rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem" }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "transparent", border: "1px solid #dc2626", color: "#dc2626", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
    >
      <Trash2 size={15} /> Eliminar
    </button>
  );
}
