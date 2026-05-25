"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Plus, Trash2, Truck, Ruler, X } from "lucide-react";
import { addOrderService, removeOrderService, ensureDefaultOrderServices } from "@/app/actions/orders";
import { DEFAULT_OP_SERVICE_NAMES } from "@/lib/default-op-services";
import { quickCreateService } from "@/app/actions/services";
import AdjustQtyButton from "./AdjustQtyButton";

type CatalogService = { id: number; name: string; type?: string };
type OrderServiceRow = {
  id: number;
  serviceId: number;
  serviceName: string;
  serviceType: string;
  requiredQuantity: number;
  sentQty: number;
  receivedQty: number;
  providerName?: string | null;
  sizeSplit?: { size: string; quantity: number }[];
};

export default function OrderServicesPanel({
  orderId,
  orderStatus,
  totalQuantity,
  services: initialServices,
  catalogServices: initialCatalog,
}: {
  orderId: number;
  orderStatus: string;
  totalQuantity: number;
  services: OrderServiceRow[];
  catalogServices: CatalogService[];
}) {
  const router = useRouter();
  const canEdit = !["ENTREGADO", "CERRADO", "CANCELADO"].includes(orderStatus);

  const [catalog, setCatalog] = useState(initialCatalog);
  const [addServiceId, setAddServiceId] = useState("");
  const [addQty, setAddQty] = useState(totalQuantity);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [fillingDefaults, setFillingDefaults] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) inputRef.current?.focus();
  }, [modalOpen]);

  const assignedIds = new Set(initialServices.map((s) => s.serviceId));
  const available = catalog.filter((s) => !assignedIds.has(s.id));

  const handleAdd = async () => {
    if (!addServiceId) { setAddError("Seleccioná un servicio"); return; }
    setAdding(true);
    setAddError("");
    const res = await addOrderService(orderId, Number(addServiceId), addQty);
    setAdding(false);
    if (res.error) setAddError(res.error);
    else {
      setAddServiceId("");
      setAddQty(totalQuantity);
      router.refresh();
    }
  };

  const handleRemove = async (orderServiceId: number) => {
    if (!confirm("¿Quitar este servicio de la OP?")) return;
    setRemovingId(orderServiceId);
    const res = await removeOrderService(orderServiceId, orderId);
    setRemovingId(null);
    if (res.error) alert(res.error);
    else router.refresh();
  };

  const handleQuickCreate = async () => {
    if (!newName.trim()) { setModalError("Ingresá un nombre"); return; }
    setModalSaving(true);
    setModalError("");
    const res = await quickCreateService(newName.trim());
    setModalSaving(false);
    if ("error" in res) {
      setModalError(res.error);
      return;
    }
    setCatalog((p) => [...p, res].sort((a, b) => a.name.localeCompare(b.name)));
    setAddServiceId(String(res.id));
    setModalOpen(false);
    setNewName("");
  };

  return (
    <>
      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div style={{
            background: "var(--card-bg)", borderRadius: "10px", padding: "1.5rem",
            width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid var(--card-border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span style={{ fontWeight: 700 }}>Nuevo Servicio</span>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setModalError(""); }}
              placeholder="Nombre del servicio..."
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickCreate(); if (e.key === "Escape") setModalOpen(false); }}
              style={{
                width: "100%", padding: "0.5rem", borderRadius: "6px",
                border: "1px solid var(--card-border)", background: "var(--bg-color)", boxSizing: "border-box",
              }}
            />
            {modalError && <div style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: "0.4rem" }}>{modalError}</div>}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ padding: "0.4rem 1rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "transparent", cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={handleQuickCreate} disabled={modalSaving} style={{ padding: "0.4rem 1rem", borderRadius: "6px", background: "var(--primary)", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>
                {modalSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {initialServices.map((svc) => {
          const pct = svc.requiredQuantity > 0 ? Math.min(100, Math.round(svc.receivedQty / svc.requiredQuantity * 100)) : 0;
          const sentPct = svc.requiredQuantity > 0 ? Math.min(100, Math.round(svc.sentQty / svc.requiredQuantity * 100)) : 0;
          return (
            <div key={svc.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <div style={{ color: "var(--primary)" }}><Scissors size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{svc.serviceName}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {svc.serviceType}
                    {svc.providerName && (
                      <span> · <strong style={{ color: "var(--primary)" }}><Truck size={12} style={{ display: "inline" }} /> {svc.providerName}</strong></span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.15rem", alignItems: "flex-end" }}>
                  <span style={{ color: "var(--primary)" }}>Env: <strong>{svc.sentQty}</strong></span>
                  <span style={{ color: "green" }}>Rec: <strong>{svc.receivedQty}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Req: {svc.requiredQuantity}</span>
                  {canEdit && (
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <AdjustQtyButton
                        orderServiceId={svc.id}
                        orderId={orderId}
                        currentQty={svc.requiredQuantity}
                        sentQty={svc.sentQty}
                        serviceName={svc.serviceName}
                      />
                      {svc.sentQty === 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemove(svc.id)}
                          disabled={removingId === svc.id}
                          title="Quitar servicio"
                          style={{
                            background: "none", border: "1px solid #fecaca", borderRadius: "4px",
                            padding: "2px 6px", cursor: "pointer", color: "#dc2626",
                            display: "flex", alignItems: "center", gap: "3px", fontSize: "0.7rem",
                          }}
                        >
                          <Trash2 size={12} /> {removingId === svc.id ? "..." : "Quitar"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {svc.sizeSplit && svc.sizeSplit.length > 0 && (
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  {svc.sizeSplit.map((sz) => (
                    <span key={sz.size} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--bg-color)", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.75rem" }}>
                      <Ruler size={10} style={{ color: "var(--primary)" }} />
                      <strong style={{ color: "var(--primary)" }}>{sz.size}</strong>: {sz.quantity}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ position: "relative", height: "8px", background: "var(--bg-color)", borderRadius: "4px", overflow: "hidden", marginBottom: "0.5rem" }}>
                <div style={{ position: "absolute", height: "100%", width: `${sentPct}%`, background: "rgba(59,130,246,0.25)", borderRadius: "4px" }} />
                <div style={{ position: "absolute", height: "100%", width: `${pct}%`, background: pct >= 100 ? "green" : "var(--primary)", transition: "width 0.3s ease" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {pct}% ingresado · {sentPct}% enviado al taller
              </div>
            </div>
          );
        })}
        {initialServices.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No hay servicios asignados.
            {canEdit && (
              <button
                type="button"
                disabled={fillingDefaults}
                onClick={async () => {
                  setFillingDefaults(true);
                  const res = await ensureDefaultOrderServices(orderId);
                  setFillingDefaults(false);
                  if (res.error) alert(res.error);
                  else router.refresh();
                }}
                style={{
                  display: "block", marginTop: "0.75rem", padding: "0.5rem 1rem",
                  borderRadius: "6px", border: "1px solid var(--primary)", background: "transparent",
                  color: "var(--primary)", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
                }}
              >
                {fillingDefaults ? "Asignando..." : `Asignar ${DEFAULT_OP_SERVICE_NAMES.join(", ")}`}
              </button>
            )}
          </div>
        )}
      </div>

      {canEdit && (
        <div style={{
          marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed var(--card-border)",
          display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end",
        }}>
          <div style={{ flex: "1 1 180px" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
              Agregar servicio
              <button
                type="button"
                onClick={() => { setModalOpen(true); setNewName(""); setModalError(""); }}
                title="Nuevo servicio"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--primary)",
                  background: "transparent", color: "var(--primary)", cursor: "pointer", padding: 0,
                }}
              >
                <Plus size={11} />
              </button>
            </label>
            <select
              value={addServiceId}
              onChange={(e) => setAddServiceId(e.target.value)}
              style={{
                width: "100%", padding: "0.45rem", borderRadius: "6px",
                border: "1px solid var(--card-border)", background: "var(--bg-color)", fontSize: "0.875rem",
              }}
            >
              <option value="">Seleccionar...</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Cantidad</label>
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={(e) => setAddQty(Number(e.target.value))}
              style={{
                width: 90, padding: "0.45rem", borderRadius: "6px",
                border: "1px solid var(--card-border)", background: "var(--bg-color)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            style={{
              padding: "0.45rem 1rem", borderRadius: "6px", fontSize: "0.84rem", fontWeight: 600,
              background: "var(--primary)", color: "white", border: "none",
              cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.7 : 1,
            }}
          >
            {adding ? "..." : "Agregar"}
          </button>
          {addError && <div style={{ width: "100%", fontSize: "0.8rem", color: "#dc2626" }}>{addError}</div>}
        </div>
      )}
    </>
  );
}
