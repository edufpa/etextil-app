"use client";

import { createProviderDelivery } from "@/app/actions/providerDeliveries";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Truck } from "lucide-react";

type Props = {
  orderId: number;
  orderServices: {
    id: number;
    service: { name: string };
    requiredQuantity: number;
    alreadyDelivered: number;
    provider?: { id: number; businessName: string } | null;
  }[];
  providers: { id: number; businessName: string }[];
};

export default function ProviderDeliveryForm({ orderId, orderServices, providers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [orderServiceId, setOrderServiceId] = useState(orderServices[0]?.id || 0);
  const [providerId, setProviderId] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const selectedService = orderServices.find(s => s.id === orderServiceId);
  const remaining = selectedService ? selectedService.requiredQuantity - selectedService.alreadyDelivered : 0;

  // Al cambiar servicio, preseleccionar su proveedor si lo tiene
  const handleServiceChange = (id: number) => {
    setOrderServiceId(id);
    const svc = orderServices.find(s => s.id === id);
    if (svc?.provider?.id) setProviderId(svc.provider.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (providerId === 0) { setError("Selecciona un proveedor."); return; }
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await createProviderDelivery({
      orderService_id: orderServiceId,
      provider_id: providerId,
      date: new Date(date + "T12:00:00"),
      quantity,
      notes,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("✓ Entrega registrada");
      setQuantity(1);
      setNotes("");
      setOpen(false);
      router.refresh();
    }
  };

  if (orderServices.length === 0) return null;

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "var(--primary)", color: "white", border: "none",
            padding: "0.75rem 1.25rem", borderRadius: "var(--radius)",
            cursor: "pointer", fontWeight: 600, width: "100%", justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          <Truck size={18} /> Registrar Entrega de Proveedor
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", background: "var(--bg-color)", padding: "1.25rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
          <strong style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
            <Truck size={16} /> Nueva Entrega de Proveedor
          </strong>

          {error && <div style={{ color: "red", fontSize: "0.875rem", padding: "0.5rem", background: "#fff0f0", borderRadius: "4px" }}>{error}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Servicio</label>
            <select value={orderServiceId} onChange={e => handleServiceChange(Number(e.target.value))}>
              {orderServices.map(s => (
                <option key={s.id} value={s.id} disabled={s.requiredQuantity - s.alreadyDelivered <= 0}>
                  {s.service.name} — Saldo: {s.requiredQuantity - s.alreadyDelivered}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Proveedor</label>
            <select value={providerId} onChange={e => setProviderId(Number(e.target.value))} required>
              <option value={0}>— Selecciona proveedor —</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.businessName}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                Cantidad (máx: {remaining})
              </label>
              <input type="number" min={1} max={remaining} value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Notas (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Lote del día 05/04..." />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" disabled={loading || remaining <= 0} style={{ flex: 1, background: "var(--primary)", color: "white", border: "none", padding: "0.65rem", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 600 }}>
              {loading ? "Guardando..." : "Registrar"}
            </button>
            <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--card-border)", padding: "0.65rem", borderRadius: "var(--radius)", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
