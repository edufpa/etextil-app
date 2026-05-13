"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { generarOPs } from "@/app/actions/pedidos";

export default function GenerarOpsButton({ pedidoId, disabled }: { pedidoId: number; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (!confirm("¿Generar OPs para todos los items de este pedido?")) return;
    setLoading(true);
    setError("");
    try {
      const ops = await generarOPs(pedidoId);
      router.refresh();
      alert(`${ops.length} OP${ops.length !== 1 ? "s" : ""} generada${ops.length !== 1 ? "s" : ""} correctamente.`);
    } catch (err: any) {
      setError(err.message || "Error al generar OPs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          padding: "0.55rem 1.2rem", borderRadius: "8px", fontSize: "0.875rem",
          fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
          background: disabled ? "var(--card-border)" : "var(--primary)",
          color: "white", border: "none",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Zap size={15} />
        {loading ? "Generando..." : "Generar OPs"}
      </button>
      {error && (
        <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#dc2626" }}>{error}</div>
      )}
    </div>
  );
}
