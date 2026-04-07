"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProviderIncoming } from "@/app/actions/providerIncoming";
import { PackageCheck, Plus } from "lucide-react";

type Props = {
  deliveryId: number;
  orderId: number;
  pending: number;
};

export default function OpsIncomingButton({ deliveryId, orderId, pending }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(pending);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = () => {
    setOpen(true);
    setQty(pending);
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createProviderIncoming({
      providerDelivery_id: deliveryId,
      orderId,
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
        onClick={handleOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "green",
          color: "white",
          border: "none",
          padding: "5px 12px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <PackageCheck size={13} /> Registrar Ingreso
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
    >
      {error && (
        <div
          style={{
            color: "red",
            fontSize: "0.72rem",
            background: "#fff0f0",
            padding: "2px 6px",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="number"
          min={1}
          max={pending}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          style={{ width: "58px" }}
          required
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
            background: "green",
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
          <Plus size={12} /> {loading ? "Guardando..." : "Confirmar"}
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
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
