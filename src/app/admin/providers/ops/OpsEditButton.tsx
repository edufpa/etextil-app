"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProviderDelivery } from "@/app/actions/providerDeliveries";
import { Pencil, Save, X } from "lucide-react";

type Props = {
  deliveryId: number;
  orderId: number;
  currentQty: number;
  currentDate: string; // YYYY-MM-DD
  currentNotes: string;
  minQty: number; // already received, can't go below
};

export default function OpsEditButton({
  deliveryId,
  orderId,
  currentQty,
  currentDate,
  currentNotes,
  minQty,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(currentQty);
  const [date, setDate] = useState(currentDate);
  const [notes, setNotes] = useState(currentNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await updateProviderDelivery(deliveryId, orderId, {
      quantity: qty,
      date: new Date(date + "T12:00:00"),
      notes,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setOpen(false);
      router.refresh();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setQty(currentQty); setDate(currentDate); setNotes(currentNotes); setError(""); }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "var(--primary)",
          color: "white",
          border: "none",
          padding: "5px 10px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <Pencil size={12} /> Editar OP
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
    >
      {error && (
        <div style={{ color: "red", fontSize: "0.72rem", background: "#fff0f0", padding: "2px 6px", borderRadius: "4px" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="number"
          min={minQty > 0 ? minQty : 1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          style={{ width: "58px" }}
          required
          title={minQty > 0 ? `Mínimo ${minQty} (ya ingresado)` : "Cantidad"}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: "130px" }}
          required
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas..."
          style={{ width: "110px" }}
        />
      </div>
      <div style={{ display: "flex", gap: "0.35rem" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            padding: "4px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Save size={12} /> {loading ? "..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "transparent",
            border: "1px solid var(--card-border)",
            padding: "4px 8px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <X size={12} /> Cancelar
        </button>
      </div>
    </form>
  );
}
