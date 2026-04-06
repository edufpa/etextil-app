"use client";

import { createProviderDeliveryBatch } from "@/app/actions/providerDeliveries";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Truck, FileText, Printer, X } from "lucide-react";

type OrderServiceRow = {
  id: number;
  serviceId: number;
  service: { name: string; trackBySize?: boolean };
  requiredQuantity: number;
  alreadyDelivered: number;
  deliveredBySize: Record<string, number>;
  provider?: { id: number; businessName: string } | null;
};

type ProviderRow = {
  id: number;
  businessName: string;
  serviceIds: number[];
};

type OrderInfo = {
  orderNumber: string;
  clientName: string;
  garment: string;
  color: string;
  date: string;
  totalQuantity: number;
};

type SizeEntry = { size: string; ordered: number; delivered: number; remaining: number; toSend: number };

type Props = {
  orderId: number;
  orderServices: OrderServiceRow[];
  providers: ProviderRow[];
  orderSizes: { size: string; quantity: number }[];
  orderInfo: OrderInfo;
};

export default function ProviderDeliveryForm({
  orderId,
  orderServices,
  providers,
  orderSizes,
  orderInfo,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const firstSvc = orderServices[0];
  const [orderServiceId, setOrderServiceId] = useState(firstSvc?.id || 0);
  const [providerId, setProviderId] = useState<number>(firstSvc?.provider?.id || 0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Size breakdown entries for the selected service
  const [sizeEntries, setSizeEntries] = useState<SizeEntry[]>([]);

  // OP modal after successful registration
  const [opData, setOpData] = useState<{
    providerName: string;
    serviceName: string;
    date: string;
    sizes: SizeEntry[];
    notes: string;
  } | null>(null);

  const selectedService = orderServices.find((s) => s.id === orderServiceId);

  const buildSizeEntries = (svc: OrderServiceRow | undefined): SizeEntry[] => {
    if (!svc) return [];
    return orderSizes.map((sz) => {
      const delivered = svc.deliveredBySize[sz.size] || 0;
      const remaining = Math.max(0, sz.quantity - delivered);
      return {
        size: sz.size,
        ordered: sz.quantity,
        delivered,
        remaining,
        toSend: remaining, // default: send all remaining
      };
    });
  };

  // Rebuild size entries when service changes
  useEffect(() => {
    setSizeEntries(buildSizeEntries(selectedService));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderServiceId]);

  const handleServiceChange = (id: number) => {
    setOrderServiceId(id);
    const svc = orderServices.find((s) => s.id === id);
    if (svc?.provider?.id) setProviderId(svc.provider.id);
    else setProviderId(0);
  };

  const updateToSend = (index: number, val: number) => {
    setSizeEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, toSend: Math.max(0, val) } : e))
    );
  };

  const totalToSend = sizeEntries.reduce((s, e) => s + e.toSend, 0);

  const qualifiedProviders = providers.filter(
    (p) => selectedService && p.serviceIds.includes(selectedService.serviceId)
  );
  const otherProviders = providers.filter(
    (p) => !selectedService || !p.serviceIds.includes(selectedService.serviceId)
  );

  const selectedProvider = providers.find((p) => p.id === providerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (providerId === 0) { setError("Selecciona un proveedor."); return; }
    if (totalToSend === 0) { setError("Ingresa al menos una cantidad mayor a 0."); return; }

    setLoading(true);
    setError("");

    const res = await createProviderDeliveryBatch({
      orderService_id: orderServiceId,
      provider_id: providerId,
      date: new Date(date + "T12:00:00"),
      notes,
      sizes: sizeEntries.map((e) => ({ size: e.size, quantity: e.toSend })),
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      // Show OP modal before refreshing
      setOpData({
        providerName: selectedProvider?.businessName || "—",
        serviceName: selectedService?.service.name || "—",
        date,
        sizes: sizeEntries.filter((e) => e.toSend > 0),
        notes,
      });
    }
  };

  const closeOP = () => {
    setOpData(null);
    setOpen(false);
    router.refresh();
  };

  if (orderServices.length === 0) return null;

  return (
    <div>
      {/* OP Modal */}
      {opData && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
          <div id="op-printable" style={{
            background: "white", borderRadius: "var(--radius)", padding: "2rem",
            width: "100%", maxWidth: "520px", position: "relative",
          }}>
            <button
              onClick={closeOP}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}
            >
              <X size={20} />
            </button>

            {/* OP Header */}
            <div style={{ textAlign: "center", marginBottom: "1.5rem", borderBottom: "2px solid #333", paddingBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#666", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Orden de Producción
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#111", marginTop: "0.25rem" }}>
                {orderInfo.orderNumber}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#555", marginTop: "0.25rem" }}>
                Emitida: {new Date(opData.date + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
              <div><span style={{ color: "#888", fontSize: "0.72rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Cliente</span>{orderInfo.clientName}</div>
              <div><span style={{ color: "#888", fontSize: "0.72rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Prenda</span>{orderInfo.garment}</div>
              <div><span style={{ color: "#888", fontSize: "0.72rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Color</span>{orderInfo.color}</div>
              <div><span style={{ color: "#888", fontSize: "0.72rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Servicio</span><strong>{opData.serviceName}</strong></div>
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ color: "#888", fontSize: "0.72rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Taller / Proveedor</span>
                <strong style={{ fontSize: "1rem" }}>{opData.providerName}</strong>
              </div>
            </div>

            {/* Size table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginBottom: "1rem" }}>
              <thead>
                <tr style={{ background: "#f0f4ff" }}>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", border: "1px solid #dde", fontWeight: 700 }}>Talla</th>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", border: "1px solid #dde", fontWeight: 700 }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {opData.sizes.map((e) => (
                  <tr key={e.size}>
                    <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #dde", fontWeight: 600 }}>{e.size}</td>
                    <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #dde", textAlign: "center", fontWeight: 800, fontSize: "1.05rem" }}>{e.toSend}</td>
                  </tr>
                ))}
                <tr style={{ background: "#f8f8f8" }}>
                  <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #dde", fontWeight: 700 }}>TOTAL</td>
                  <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #dde", textAlign: "center", fontWeight: 900, fontSize: "1.1rem" }}>
                    {opData.sizes.reduce((s, e) => s + e.toSend, 0)}
                  </td>
                </tr>
              </tbody>
            </table>

            {opData.notes && (
              <div style={{ fontSize: "0.8rem", color: "#666", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
                <strong>Notas:</strong> {opData.notes}
              </div>
            )}

            {/* Signature lines */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2rem", paddingTop: "1rem" }}>
              <div style={{ borderTop: "1px solid #999", paddingTop: "0.4rem", fontSize: "0.72rem", color: "#777", textAlign: "center" }}>Entregado por</div>
              <div style={{ borderTop: "1px solid #999", paddingTop: "0.4rem", fontSize: "0.72rem", color: "#777", textAlign: "center" }}>Recibido por</div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#111", color: "white", border: "none", padding: "0.7rem", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 600 }}
              >
                <Printer size={16} /> Imprimir OP
              </button>
              <button
                onClick={closeOP}
                style={{ flex: 1, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--card-border)", padding: "0.7rem", borderRadius: "var(--radius)", cursor: "pointer" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main form toggle */}
      {!open ? (
        <button
          onClick={() => { setOpen(true); setSizeEntries(buildSizeEntries(selectedService)); }}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "var(--primary)", color: "white", border: "none",
            padding: "0.75rem 1.25rem", borderRadius: "var(--radius)",
            cursor: "pointer", fontWeight: 600, width: "100%", justifyContent: "center", marginTop: "1rem",
          }}
        >
          <FileText size={18} /> Registrar entrega / Generar OP
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem", background: "var(--bg-color)", padding: "1.25rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}
        >
          <strong style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)", fontSize: "0.95rem" }}>
            <Truck size={16} /> Nueva Entrega / Orden de Producción
          </strong>

          {error && (
            <div style={{ color: "red", fontSize: "0.875rem", padding: "0.5rem", background: "#fff0f0", borderRadius: "4px" }}>{error}</div>
          )}

          {/* Servicio */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Servicio</label>
            <select value={orderServiceId} onChange={(e) => handleServiceChange(Number(e.target.value))}>
              {orderServices.map((s) => {
                const rem = s.requiredQuantity - s.alreadyDelivered;
                return (
                  <option key={s.id} value={s.id} disabled={rem <= 0}>
                    {s.service.name} — Saldo: {rem}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Proveedor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Proveedor
              {qualifiedProviders.length > 0 && (
                <span style={{ fontWeight: 400, color: "green", marginLeft: "0.4rem" }}>
                  ({qualifiedProviders.length} con este servicio)
                </span>
              )}
            </label>
            <select value={providerId} onChange={(e) => setProviderId(Number(e.target.value))} required>
              <option value={0}>— Selecciona proveedor —</option>
              {qualifiedProviders.length > 0 && (
                <optgroup label={`✓ Con servicio "${selectedService?.service.name}"`}>
                  {qualifiedProviders.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}
                </optgroup>
              )}
              {otherProviders.length > 0 && (
                <optgroup label="Otros proveedores">
                  {otherProviders.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          {/* Fecha + Notas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Notas (opcional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Lote 1..." />
            </div>
          </div>

          {/* Size breakdown table */}
          {sizeEntries.length > 0 && (
            <div style={{ border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              <div style={{ padding: "0.5rem 0.75rem", background: "var(--primary)", color: "white", fontSize: "0.8rem", fontWeight: 700 }}>
                Saldo por Talla — edita la cantidad a enviar
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-color)" }}>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-muted)" }}>Talla</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>Pedido</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>Entregado</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>Saldo</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 700, color: "var(--primary)" }}>A enviar</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeEntries.map((e, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid var(--card-border)", background: e.remaining === 0 ? "var(--bg-color)" : "var(--card-bg)" }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>{e.size}</td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "center", color: "var(--text-muted)" }}>{e.ordered}</td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "center", color: "green", fontWeight: 600 }}>{e.delivered}</td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "center", color: e.remaining > 0 ? "orange" : "var(--text-muted)", fontWeight: 700 }}>
                        {e.remaining}
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem", textAlign: "center" }}>
                        <input
                          type="number"
                          min={0}
                          max={e.remaining}
                          value={e.toSend}
                          onChange={(ev) => updateToSend(idx, Number(ev.target.value))}
                          style={{ width: "70px", textAlign: "center", fontWeight: 700, border: e.toSend > 0 ? "2px solid var(--primary)" : "1px solid var(--card-border)", borderRadius: "6px", padding: "4px 6px" }}
                          disabled={e.remaining === 0}
                        />
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr style={{ borderTop: "2px solid var(--card-border)", background: "var(--bg-color)" }}>
                    <td colSpan={4} style={{ padding: "0.5rem 0.75rem", fontWeight: 700, textAlign: "right" }}>TOTAL A ENVIAR:</td>
                    <td style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 900, color: totalToSend > 0 ? "var(--primary)" : "var(--text-muted)", fontSize: "1rem" }}>
                      {totalToSend}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="submit"
              disabled={loading || totalToSend === 0}
              style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "var(--primary)", color: "white", border: "none", padding: "0.7rem", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 700 }}
            >
              <FileText size={16} />
              {loading ? "Guardando..." : "Registrar y Generar OP"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ flex: 1, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--card-border)", padding: "0.7rem", borderRadius: "var(--radius)", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
