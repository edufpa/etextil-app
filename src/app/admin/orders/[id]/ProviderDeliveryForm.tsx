"use client";

import { createServiceOrder } from "@/app/actions/serviceOrders";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Truck, FileText } from "lucide-react";
import OsDocument from "./OsDocument";

type OrderServiceRow = {
  id: number;
  serviceId: number;
  service: { name: string; trackBySize?: boolean };
  requiredQuantity: number;
  alreadyDelivered: number;
  deliveredBySize: Record<string, number>;
  provider?: { id: number; businessName: string } | null;
  /** Cuánto se puede enviar todavía (ya descuenta lo enviado y, si hay secuencia, lo recibido de la etapa anterior). */
  available: { total: number; bySize: Record<string, number>; gated: boolean; prevName: string | null };
};

type ProviderRow = {
  id: number;
  businessName: string;
  serviceIds: number[];
  /** Tarifa por prenda (S/) por id de servicio. */
  prices: Record<number, number>;
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

  const firstSvc = orderServices.find((s) => s.available.total > 0) ?? orderServices[0];
  const [orderServiceId, setOrderServiceId] = useState(firstSvc?.id || 0);
  const [providerId, setProviderId] = useState<number>(firstSvc?.provider?.id || 0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [price, setPrice] = useState("");

  // Size breakdown entries for the selected service
  const [sizeEntries, setSizeEntries] = useState<SizeEntry[]>([]);

  // OP modal after successful registration
  const [opData, setOpData] = useState<{
    osNumber: string;
    price: number | null;
    dueDate: string;
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
      const remaining = Math.max(0, svc.available.bySize[sz.size] ?? 0);
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
  const tariff = selectedProvider && selectedService ? selectedProvider.prices[selectedService.serviceId] : undefined;

  // La tarifa del taller para este servicio es el precio por defecto (editable)
  useEffect(() => {
    setPrice(tariff !== undefined ? String(tariff) : "");
  }, [tariff, providerId, orderServiceId]);

  const priceNum = price.trim() === "" ? null : Number(price.replace(",", "."));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (providerId === 0) { setError("Selecciona un proveedor."); return; }
    if (totalToSend === 0) { setError("Ingresa al menos una cantidad mayor a 0."); return; }

    if (priceNum !== null && (!Number.isFinite(priceNum) || priceNum < 0)) {
      setError("El precio debe ser un número mayor o igual a 0.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createServiceOrder({
      orderService_id: orderServiceId,
      provider_id: providerId,
      date: new Date(date + "T12:00:00"),
      dueDate: dueDate ? new Date(dueDate + "T12:00:00") : null,
      notes,
      unitPrice: priceNum,
      sizes: sizeEntries.map((e) => ({ size: e.size, quantity: e.toSend })),
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error);
    } else {
      // Show OP modal before refreshing
      setOpData({
        osNumber: res.osNumber,
        price: res.unitPrice,
        dueDate,
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
      {opData && (
        <OsDocument
          onClose={closeOP}
          data={{
            osNumber: opData.osNumber,
            opNumber: orderInfo.orderNumber,
            clientName: orderInfo.clientName,
            garment: orderInfo.garment,
            color: orderInfo.color,
            serviceName: opData.serviceName,
            providerName: opData.providerName,
            date: opData.date,
            dueDate: opData.dueDate || null,
            lines: opData.sizes.map((e) => ({ size: e.size, quantity: e.toSend })),
            unitPrice: opData.price,
            notes: opData.notes,
          }}
        />
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
          <FileText size={18} /> Emitir orden de servicio (OS)
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem", background: "var(--bg-color)", padding: "1.25rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}
        >
          <strong style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)", fontSize: "0.95rem" }}>
            <Truck size={16} /> Nueva Orden de Servicio (OS)
          </strong>

          {error && (
            <div style={{ color: "red", fontSize: "0.875rem", padding: "0.5rem", background: "#fff0f0", borderRadius: "4px" }}>{error}</div>
          )}

          {/* Servicio */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Servicio</label>
            <select value={orderServiceId} onChange={(e) => handleServiceChange(Number(e.target.value))}>
              {orderServices.map((s) => {
                const rem = s.available.total;
                return (
                  <option key={s.id} value={s.id} disabled={rem <= 0}>
                    {s.service.name} — Disponible: {rem}{s.available.gated ? ` (según ${s.available.prevName ?? "etapa anterior"})` : ""}
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
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Fecha de entrega (opcional)</label>
              <input type="date" value={dueDate} min={date} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                Precio por prenda (S/)
                {tariff !== undefined && <span style={{ fontWeight: 400, color: "green", marginLeft: "0.4rem" }}>tarifa del taller</span>}
              </label>
              <input type="number" min={0} step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Sin tarifa" />
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
                {selectedService?.available.gated ? `Disponible por talla (lo recibido de ${selectedService.available.prevName ?? "la etapa anterior"}) — edita la cantidad a enviar` : "Saldo por Talla — edita la cantidad a enviar"}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-color)" }}>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-muted)" }}>Talla</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>Pedido</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>Entregado</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>Disponible</th>
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
              {loading ? "Emitiendo..." : "Emitir OS"}
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
