"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProviderIncoming, deleteProviderIncoming } from "@/app/actions/providerIncoming";
import { PackageCheck, Plus, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";

type Incoming = { id: number; quantity: number; date: string | Date; notes?: string | null };

type DeliveryRow = {
  id: number;
  size: string | null;
  quantity: number;
  date: string | Date;
  notes?: string | null;
  providerName: string;
  incomings: Incoming[];
};

type ServiceDeliveries = {
  serviceId: number;
  serviceName: string;
  deliveries: DeliveryRow[];
};

type Props = {
  orderId: number;
  serviceDeliveries: ServiceDeliveries[];
};

export default function IncomingPanel({ orderId, serviceDeliveries }: Props) {
  const router = useRouter();

  // One active ingreso form open at a time (delivery id)
  const [activeDelivery, setActiveDelivery] = useState<number | null>(null);
  const [inQty, setInQty] = useState(1);
  const [inDate, setInDate] = useState(new Date().toISOString().split("T")[0]);
  const [inNotes, setInNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Collapsed services
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggleCollapse = (serviceId: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const openIncoming = (delivery: DeliveryRow) => {
    const alreadyIn = delivery.incomings.reduce((s, i) => s + i.quantity, 0);
    const pending = delivery.quantity - alreadyIn;
    setActiveDelivery(delivery.id);
    setInQty(Math.max(1, pending));
    setInDate(new Date().toISOString().split("T")[0]);
    setInNotes("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;
    setLoading(true);
    setError("");
    const res = await createProviderIncoming({
      providerDelivery_id: activeDelivery,
      orderId,
      quantity: inQty,
      date: new Date(inDate + "T12:00:00"),
      notes: inNotes,
    });
    setLoading(false);
    if (res.error) { setError(res.error); }
    else { setActiveDelivery(null); router.refresh(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este ingreso?")) return;
    await deleteProviderIncoming(id, orderId);
    router.refresh();
  };

  if (serviceDeliveries.every((s) => s.deliveries.length === 0)) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {serviceDeliveries.map(({ serviceId, serviceName, deliveries }) => {
        if (deliveries.length === 0) return null;
        const isCollapsed = collapsed.has(serviceId);

        const totalSent = deliveries.reduce((s, d) => s + d.quantity, 0);
        const totalIn = deliveries.reduce(
          (s, d) => s + d.incomings.reduce((a, i) => a + i.quantity, 0), 0
        );
        const totalPending = totalSent - totalIn;

        return (
          <div key={serviceId} style={{ border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {/* Service header */}
            <div
              onClick={() => toggleCollapse(serviceId)}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--bg-color)", cursor: "pointer" }}
            >
              <Send size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <span style={{ fontWeight: 700, flex: 1 }}>{serviceName}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600 }}>Env: {totalSent}</span>
              <span style={{ fontSize: "0.78rem", color: "green", fontWeight: 600, marginLeft: "0.5rem" }}>Rec: {totalIn}</span>
              {totalPending > 0 && (
                <span style={{ fontSize: "0.78rem", background: "#fff3e0", color: "orange", border: "1px solid orange", borderRadius: "999px", padding: "1px 8px", fontWeight: 700, marginLeft: "0.5rem" }}>
                  {totalPending} pendiente
                </span>
              )}
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </div>

            {!isCollapsed && (
              <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {deliveries.map((d) => {
                  const inTotal = d.incomings.reduce((s, i) => s + i.quantity, 0);
                  const pending = d.quantity - inTotal;
                  const isActive = activeDelivery === d.id;

                  return (
                    <div key={d.id} style={{ border: `1px solid ${pending > 0 ? "rgba(255,165,0,0.3)" : "var(--card-border)"}`, borderRadius: "8px", padding: "0.75rem", background: pending > 0 ? "#fffbf0" : "var(--card-bg)" }}>
                      {/* OP header row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                        <Send size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>OP enviada: {d.quantity} u.</span>
                        {d.size && (
                          <span style={{ background: "var(--primary)", color: "white", borderRadius: "999px", fontSize: "0.72rem", padding: "1px 7px", fontWeight: 700 }}>{d.size}</span>
                        )}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{new Date(d.date).toLocaleDateString()}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>· {d.providerName}</span>
                        <span style={{ marginLeft: "auto", fontWeight: 700, color: pending > 0 ? "orange" : "green", fontSize: "0.82rem" }}>
                          {pending > 0 ? `${pending} pendiente` : "✓ Completo"}
                        </span>
                        {pending > 0 && !isActive && (
                          <button
                            onClick={() => openIncoming(d)}
                            style={{ display: "flex", alignItems: "center", gap: "4px", background: "green", color: "white", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                          >
                            <PackageCheck size={13} /> Registrar Ingreso
                          </button>
                        )}
                      </div>

                      {/* Existing incomings */}
                      {d.incomings.map((inc) => (
                        <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.78rem", color: "var(--text-muted)", paddingLeft: "1.25rem", marginBottom: "0.25rem" }}>
                          <PackageCheck size={12} style={{ color: "green", flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, color: "green" }}>+{inc.quantity} ingresado</span>
                          <span>{new Date(inc.date).toLocaleDateString()}</span>
                          {inc.notes && <span style={{ fontStyle: "italic" }}>{inc.notes}</span>}
                          <button
                            onClick={() => handleDelete(inc.id)}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", marginLeft: "auto" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      {/* Inline ingreso form */}
                      {isActive && (
                        <form onSubmit={handleSubmit} style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "green", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <PackageCheck size={13} /> Registrar Ingreso (máx: {pending})
                          </div>
                          {error && <div style={{ color: "red", fontSize: "0.75rem", background: "#fff0f0", padding: "0.3rem 0.5rem", borderRadius: "4px" }}>{error}</div>}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.5rem", alignItems: "end" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Cantidad</label>
                              <input type="number" min={1} max={pending} value={inQty} onChange={(e) => setInQty(Number(e.target.value))} style={{ width: "100%" }} required />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Fecha</label>
                              <input type="date" value={inDate} onChange={(e) => setInDate(e.target.value)} required />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Notas</label>
                              <input type="text" value={inNotes} onChange={(e) => setInNotes(e.target.value)} placeholder="Opcional..." />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="submit" disabled={loading} style={{ background: "green", color: "white", border: "none", padding: "0.45rem 1rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <Plus size={13} /> {loading ? "Guardando..." : "Confirmar Ingreso"}
                            </button>
                            <button type="button" onClick={() => setActiveDelivery(null)} style={{ background: "transparent", border: "1px solid var(--card-border)", padding: "0.45rem 0.75rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
