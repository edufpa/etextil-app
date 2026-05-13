"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePedido } from "@/app/actions/pedidos";

export default function DeletePedidoButton({ pedidoId, hasOps }: { pedidoId: number; hasOps: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (hasOps) {
      alert("No se puede eliminar un pedido que ya tiene OPs generadas.");
      return;
    }
    if (!confirm("¿Eliminar este pedido? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    try {
      await deletePedido(pedidoId);
      router.push("/admin/pedidos");
    } catch (err: any) {
      alert(err.message || "Error al eliminar pedido");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || hasOps}
      title={hasOps ? "No se puede eliminar: tiene OPs generadas" : "Eliminar pedido"}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        padding: "0.55rem 1rem", borderRadius: "8px", fontSize: "0.875rem",
        fontWeight: 600, cursor: hasOps ? "not-allowed" : "pointer",
        background: "transparent", color: hasOps ? "var(--text-muted)" : "#dc2626",
        border: `1px solid ${hasOps ? "var(--card-border)" : "#dc2626"}`,
        opacity: hasOps ? 0.5 : 1,
      }}
    >
      <Trash2 size={14} />
      {loading ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
