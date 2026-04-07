"use client";

import { useState } from "react";
import { Settings2, Check, X } from "lucide-react";
import { adjustOrderServiceQty } from "@/app/actions/orders";

export default function AdjustQtyButton({
  orderServiceId,
  orderId,
  currentQty,
  sentQty,
  serviceName,
}: {
  orderServiceId: number;
  orderId: number;
  currentQty: number;
  sentQty: number;
  serviceName: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentQty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (value < sentQty) {
      setError(`No puede ser menor que lo ya enviado al taller (${sentQty} u).`);
      return;
    }
    if (value < 1) {
      setError("Debe ser al menos 1.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await adjustOrderServiceQty(orderServiceId, orderId, value);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setValue(currentQty); setError(""); }}
        title="Reajustar cantidad"
        style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px", fontSize: "0.7rem" }}>
        <Settings2 size={12} /> Reajustar
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem", background: "var(--bg-color)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
        Reajustar cantidad requerida — <strong>{serviceName}</strong>
      </div>
      {error && <div style={{ fontSize: "0.7rem", color: "#dc2626" }}>{error}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="number"
          min={sentQty || 1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          style={{ width: "80px", padding: "0.35rem 0.5rem", border: "1px solid var(--card-border)", borderRadius: "4px", background: "var(--card-bg)", color: "var(--text-color)", fontSize: "0.875rem" }}
        />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Actual: {currentQty} · Min: {sentQty}</span>
        <button onClick={handleSave} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "3px", padding: "0.35rem 0.65rem", background: "var(--primary)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>
          <Check size={12} /> {loading ? "..." : "OK"}
        </button>
        <button onClick={() => setOpen(false)}
          style={{ display: "flex", alignItems: "center", padding: "0.35rem", background: "none", border: "1px solid var(--card-border)", borderRadius: "4px", cursor: "pointer", color: "var(--text-muted)" }}>
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
