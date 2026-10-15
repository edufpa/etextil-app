"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Truck, Send, X, Check } from "lucide-react";
import { addOrderService, removeOrderService, ensureDefaultOrderServices } from "@/app/actions/orders";
import { DEFAULT_OP_SERVICE_NAMES } from "@/lib/default-op-services";
import { quickCreateService } from "@/app/actions/services";
import { ProgressBar } from "@/components/ui";
import AdjustQtyButton from "./AdjustQtyButton";
import s from "./route.module.css";

type CatalogService = { id: number; name: string; type?: string };
type OrderServiceRow = {
  id: number;
  serviceId: number;
  serviceName: string;
  serviceType: string;
  requiredQuantity: number;
  sentQty: number;
  receivedQty: number;
  sequence: number;
  /** Cuánto se puede enviar todavía (considera la etapa anterior). */
  available: { total: number; gated: boolean; prevName: string | null };
  providerName?: string | null;
  sizeSplit?: { size: string; quantity: number }[];
};

/** Pide al formulario de emisión que se abra con esta etapa seleccionada. */
export const OPEN_OS_FORM_EVENT = "siat:open-os-form";

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

  const assignedIds = new Set(initialServices.map((x) => x.serviceId));
  const available = catalog.filter((x) => !assignedIds.has(x.id));
  const stages = [...initialServices].sort((a, b) => (a.sequence || 999) - (b.sequence || 999) || a.id - b.id);

  const handleAdd = async () => {
    if (!addServiceId) { setAddError("Selecciona un servicio"); return; }
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
    if (!newName.trim()) { setModalError("Ingresa un nombre"); return; }
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

  const openForm = (orderServiceId: number) =>
    window.dispatchEvent(new CustomEvent(OPEN_OS_FORM_EVENT, { detail: { orderServiceId } }));

  return (
    <>
      {modalOpen && (
        <div className={s.modalBack} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className={s.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <strong>Nuevo servicio</strong>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar" style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setModalError(""); }}
              placeholder="Nombre del servicio..."
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickCreate(); if (e.key === "Escape") setModalOpen(false); }}
              style={{ width: "100%" }}
            />
            {modalError && <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.4rem" }}>{modalError}</div>}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleQuickCreate} disabled={modalSaving}>
                {modalSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={s.route}>
        {stages.map((svc, idx) => {
          const done = svc.receivedQty >= svc.requiredQuantity && svc.requiredQuantity > 0;
          const started = svc.sentQty > 0;
          const canSend = canEdit && svc.available.total > 0;
          return (
            <div key={svc.id} className={`${s.stage} ${done ? s.stageDone : ""}`}>
              <div className={`${s.num} ${done ? s.numDone : started ? s.numActive : ""}`}>
                {done ? <Check size={18} /> : idx + 1}
              </div>
              <div className={`${s.box} ${done ? s.boxDone : ""}`}>
                <div className={s.top}>
                  <div>
                    <div className={s.name}>
                      {svc.serviceName}
                      {done && <span className="pill pill-success">Completada</span>}
                    </div>
                    <div className={s.meta}>
                      {svc.serviceType}
                      {svc.providerName && <> · <Truck size={11} style={{ display: "inline" }} /> {svc.providerName}</>}
                    </div>
                  </div>
                  <div className={s.tools}>
                    {canEdit && (
                      <AdjustQtyButton
                        orderServiceId={svc.id}
                        orderId={orderId}
                        currentQty={svc.requiredQuantity}
                        sentQty={svc.sentQty}
                        serviceName={svc.serviceName}
                      />
                    )}
                    {canEdit && svc.sentQty === 0 && (
                      <button
                        type="button"
                        className={`btn btn-secondary ${s.small} ${s.danger}`}
                        onClick={() => handleRemove(svc.id)}
                        disabled={removingId === svc.id}
                        title="Quitar servicio"
                      >
                        <Trash2 size={13} /> {removingId === svc.id ? "..." : "Quitar"}
                      </button>
                    )}
                    {canSend && (
                      <button type="button" className={`btn btn-primary ${s.small}`} onClick={() => openForm(svc.id)}>
                        <Send size={13} /> Emitir OS
                      </button>
                    )}
                  </div>
                </div>

                <div className={s.nums}>
                  <div className={s.numBox}><span>Requerido</span><strong>{svc.requiredQuantity}</strong></div>
                  <div className={s.numBox}><span>Enviado</span><strong className={s.accent}>{svc.sentQty}</strong></div>
                  <div className={s.numBox}><span>Recibido</span><strong className={s.good}>{svc.receivedQty}</strong></div>
                  <div className={s.numBox}><span>Disponible</span><strong>{svc.available.total}</strong></div>
                </div>

                <ProgressBar
                  max={svc.requiredQuantity}
                  segments={[
                    { value: svc.sentQty, tone: "info" },
                    { value: svc.receivedQty, tone: done ? "success" : "primary" },
                  ]}
                />

                {svc.available.gated && !done && (
                  <div className={s.note}>
                    Solo se puede enviar lo recibido de {svc.available.prevName ?? "la etapa anterior"}.
                  </div>
                )}

                {svc.sizeSplit && svc.sizeSplit.length > 0 && (
                  <div className={s.chips}>
                    {svc.sizeSplit.map((sz) => (
                      <span key={sz.size} className="pill pill-primary"><strong>{sz.size}</strong> {sz.quantity}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {stages.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No hay servicios asignados a esta OP.
            {canEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={fillingDefaults}
                style={{ display: "flex", marginTop: "0.75rem" }}
                onClick={async () => {
                  setFillingDefaults(true);
                  const res = await ensureDefaultOrderServices(orderId);
                  setFillingDefaults(false);
                  if (res.error) alert(res.error);
                  else router.refresh();
                }}
              >
                {fillingDefaults ? "Asignando..." : `Asignar ${DEFAULT_OP_SERVICE_NAMES.join(", ")}`}
              </button>
            )}
          </div>
        )}
      </div>

      {canEdit && (
        <div className={s.addRow}>
          <div className={s.field} style={{ flex: "1 1 200px" }}>
            <label>
              Agregar etapa
              <button
                type="button"
                onClick={() => { setModalOpen(true); setNewName(""); setModalError(""); }}
                title="Crear un servicio nuevo"
                className="btn btn-ghost"
                style={{ height: 22, width: 22, padding: 0, borderRadius: "50%", border: "1px solid var(--primary)", color: "var(--primary)" }}
              >
                <Plus size={12} />
              </button>
            </label>
            <select value={addServiceId} onChange={(e) => setAddServiceId(e.target.value)}>
              <option value="">Seleccionar servicio...</option>
              {available.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className={s.field}>
            <label>Cantidad</label>
            <input type="number" min={1} value={addQty} onChange={(e) => setAddQty(Number(e.target.value))} style={{ width: 100 }} />
          </div>
          <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={adding}>
            {adding ? "..." : "Agregar"}
          </button>
          {addError && <div style={{ width: "100%", fontSize: "0.8rem", color: "var(--danger)" }}>{addError}</div>}
        </div>
      )}
    </>
  );
}
