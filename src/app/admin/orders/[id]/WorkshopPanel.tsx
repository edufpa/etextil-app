"use client";

import { createWorkAssignment, createWorkReception, deleteWorkAssignment, deleteWorkReception } from "@/app/actions/workshop";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Truck, Plus, ChevronDown, ChevronUp, Trash2, PackageCheck, Send, Ruler } from "lucide-react";

type SizeRow = { size: string; quantity: number };
type Reception = { id: number; receivedQty: number; receivedDate: string; notes?: string | null };
type Assignment = {
  id: number;
  sentQty: number;
  sentDate: string;
  size: string | null;
  notes?: string | null;
  receptions: Reception[];
};

type OrderServiceItem = {
  id: number;
  serviceId: number;
  service: { name: string; type: string; trackBySize: boolean };
  provider?: { id: number; businessName: string } | null;
  requiredQuantity: number;
  sizeSplit: SizeRow[];
  assignments: Assignment[];
};

type Props = {
  orderId: number;
  orderServices: OrderServiceItem[];
  providers: { id: number; businessName: string; serviceIds: number[] }[];
};

export default function WorkshopPanel({ orderId, orderServices, providers }: Props) {
  const router = useRouter();
  const [expandedService, setExpandedService] = useState<number | null>(null);
  const [activeForm, setActiveForm] = useState<"assign" | "receive" | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Assign form state
  const [assignProviderId, setAssignProviderId] = useState(0);
  const [assignSize, setAssignSize] = useState("");
  const [assignQty, setAssignQty] = useState(1);
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignNotes, setAssignNotes] = useState("");

  // Receive form state
  const [receiveAssignmentId, setReceiveAssignmentId] = useState(0);
  const [receiveQty, setReceiveQty] = useState(1);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiveNotes, setReceiveNotes] = useState("");

  const processReport = orderServices.map((svc) => {
    const pendingBySize = new Map<string, number>();
    const totalSent = svc.assignments.reduce((a, x) => a + x.sentQty, 0);
    const totalReceived = svc.assignments.reduce(
      (a, x) => a + x.receptions.reduce((b, r) => b + r.receivedQty, 0),
      0
    );
    for (const assignment of svc.assignments) {
      if (!assignment.size) continue;
      const received = assignment.receptions.reduce((sum, r) => sum + r.receivedQty, 0);
      const pending = assignment.sentQty - received;
      if (pending > 0) {
        pendingBySize.set(assignment.size, (pendingBySize.get(assignment.size) ?? 0) + pending);
      }
    }
    return {
      serviceId: svc.id,
      serviceName: svc.service.name,
      inProcess: totalSent - totalReceived,
      pendingBySize: [...pendingBySize.entries()],
    };
  });

  const openAssignForm = (serviceId: number) => {
    const svc = orderServices.find((s) => s.id === serviceId);
    setSelectedService(serviceId);
    setAssignProviderId(svc?.provider?.id || 0);
    setAssignSize(svc?.service.trackBySize ? (svc?.sizeSplit[0]?.size || "") : "");
    setAssignQty(1);
    setAssignNotes("");
    setActiveForm("assign");
    setError("");
  };

  const openReceiveForm = (serviceId: number, assignmentId: number, pendingQty: number) => {
    setSelectedService(serviceId);
    setReceiveAssignmentId(assignmentId);
    setReceiveQty(Math.max(1, pendingQty));
    setReceiveNotes("");
    setActiveForm("receive");
    setError("");
  };

  const closeForm = () => {
    setActiveForm(null);
    setSelectedService(null);
    setError("");
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    if (assignProviderId === 0) { setError("Selecciona un taller/proveedor."); return; }
    setLoading(true);
    setError("");
    const svc = orderServices.find((s) => s.id === selectedService)!;
    const res = await createWorkAssignment({
      orderService_id: selectedService,
      provider_id: assignProviderId,
      size: svc.service.trackBySize ? assignSize : null,
      sentQty: assignQty,
      sentDate: new Date(assignDate + "T12:00:00"),
      notes: assignNotes,
    });
    setLoading(false);
    if (res.error) { setError(res.error); } else { closeForm(); router.refresh(); }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createWorkReception({
      assignment_id: receiveAssignmentId,
      orderId,
      receivedQty: receiveQty,
      receivedDate: new Date(receiveDate + "T12:00:00"),
      notes: receiveNotes,
    });
    setLoading(false);
    if (res.error) { setError(res.error); } else { closeForm(); router.refresh(); }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    await deleteWorkAssignment(id, orderId);
    router.refresh();
  };

  const handleDeleteReception = async (id: number) => {
    if (!confirm("¿Eliminar esta recepción?")) return;
    await deleteWorkReception(id, orderId);
    router.refresh();
  };

  if (orderServices.length === 0) return null;

  const selectedSvc = orderServices.find((x) => x.id === selectedService);
  const selectedAssignment = selectedSvc?.assignments.find((x) => x.id === receiveAssignmentId);
  const selectedAssignmentPending = selectedAssignment
    ? selectedAssignment.sentQty - selectedAssignment.receptions.reduce((sum, r) => sum + r.receivedQty, 0)
    : 0;

  return (
    <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
      <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Send size={18} style={{ color: "var(--primary)" }} />
        Asignación de Trabajo a Talleres
      </h3>

      <div style={{ marginBottom: "1rem", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "0.65rem 0.85rem", background: "var(--bg-color)", fontSize: "0.8rem", fontWeight: 700 }}>
          Reporte en proceso por servicio
        </div>
        <div style={{ padding: "0.65rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {processReport.map((row) => (
            <div key={row.serviceId} style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
              <span style={{ minWidth: "160px", fontWeight: 600 }}>{row.serviceName}</span>
              <span style={{ color: row.inProcess > 0 ? "orange" : "green", fontWeight: 700 }}>
                En proceso: {row.inProcess}
              </span>
              {row.pendingBySize.length > 0 && (
                <span style={{ color: "var(--text-muted)" }}>
                  · {row.pendingBySize.map(([size, qty]) => `${size}: ${qty}`).join(" · ")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {orderServices.map((svc) => {
          const totalSent = svc.assignments.reduce((a, x) => a + x.sentQty, 0);
          const totalReceived = svc.assignments.reduce(
            (a, x) => a + x.receptions.reduce((b, r) => b + r.receivedQty, 0),
            0
          );
          const pendingReturn = totalSent - totalReceived;
          const pctReceived = svc.requiredQuantity > 0
            ? Math.min(100, Math.round(totalReceived / svc.requiredQuantity * 100))
            : 0;
          const isExpanded = expandedService === svc.id;

          return (
            <div key={svc.id} style={{ border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              {/* Service header */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1rem", background: "var(--bg-color)", cursor: "pointer" }}
                onClick={() => setExpandedService(isExpanded ? null : svc.id)}
              >
                <Truck size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {svc.service.name}
                    {svc.service.trackBySize && (
                      <span style={{ marginLeft: "0.5rem", background: "var(--primary)", color: "white", fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "999px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Ruler size={10} /> Por talla
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {svc.provider?.businessName || "Sin taller asignado"}
                    {" · "}Req: {svc.requiredQuantity}
                    {" · "}En taller: <span style={{ fontWeight: 700, color: "orange" }}>{pendingReturn}</span>
                    {" · "}Recibido: <span style={{ fontWeight: 700, color: "green" }}>{totalReceived}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>{pctReceived}%</div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: "3px", background: "var(--bg-color)" }}>
                <div style={{ height: "100%", width: `${pctReceived}%`, background: pctReceived >= 100 ? "green" : "var(--primary)", transition: "width 0.3s" }} />
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

                  {/* Size split summary */}
                  {svc.service.trackBySize && svc.sizeSplit.length > 0 && (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {svc.sizeSplit.map((sz) => (
                        <div key={sz.size} style={{ background: "var(--bg-color)", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.8rem" }}>
                          <span style={{ fontWeight: 700, color: "var(--primary)" }}>{sz.size}</span>
                          <span style={{ color: "var(--text-muted)" }}>: {sz.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assignments list */}
                  {svc.assignments.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {svc.assignments.map((a) => {
                        const aReceived = a.receptions.reduce((s, r) => s + r.receivedQty, 0);
                        const aPending = a.sentQty - aReceived;
                        return (
                          <div key={a.id} style={{ background: "var(--bg-color)", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                              <Send size={13} style={{ color: "orange", flexShrink: 0 }} />
                              <span style={{ fontWeight: 700 }}>Enviado: {a.sentQty}</span>
                              {a.size && <span style={{ background: "var(--primary)", color: "white", padding: "1px 7px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700 }}>{a.size}</span>}
                              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{new Date(a.sentDate).toLocaleDateString()}</span>
                              <span style={{ color: aPending > 0 ? "orange" : "green", fontSize: "0.8rem", fontWeight: 600, marginLeft: "auto" }}>
                                {aPending > 0 ? `${aPending} pendientes` : "✓ Completo"}
                              </span>
                              {aPending > 0 && (
                                <button
                                  onClick={() => openReceiveForm(svc.id, a.id, aPending)}
                                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "green", color: "white", border: "none", padding: "4px 10px", borderRadius: "var(--radius)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                                >
                                  <PackageCheck size={13} /> Recepcionar
                                </button>
                              )}
                              <button onClick={() => handleDeleteAssignment(a.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {/* Receptions */}
                            {a.receptions.map((r) => (
                              <div key={r.id} style={{ marginTop: "0.4rem", marginLeft: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                <PackageCheck size={12} style={{ color: "green" }} />
                                <span style={{ fontWeight: 600, color: "green" }}>+{r.receivedQty} recibidos</span>
                                <span>{new Date(r.receivedDate).toLocaleDateString()}</span>
                                {r.notes && <span style={{ fontStyle: "italic" }}>{r.notes}</span>}
                                <button onClick={() => handleDeleteReception(r.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", marginLeft: "auto" }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No hay envíos registrados para este servicio.</p>
                  )}

                  {/* Action button */}
                  {activeForm !== "assign" || selectedService !== svc.id ? (
                    <button
                      onClick={() => openAssignForm(svc.id)}
                      style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--primary)", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
                    >
                      <Plus size={15} /> Asignar al taller
                    </button>
                  ) : null}

                  {/* Assign form */}
                  {activeForm === "assign" && selectedService === svc.id && (
                    <form onSubmit={handleAssignSubmit} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <strong style={{ fontSize: "0.85rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Send size={14} /> Nuevo Envío al Taller
                      </strong>
                      {error && <div style={{ color: "red", fontSize: "0.8rem", padding: "0.4rem 0.75rem", background: "#fff0f0", borderRadius: "4px" }}>{error}</div>}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Taller/Proveedor</label>
                          {(() => {
                            const qualified = providers.filter((p) => p.serviceIds.includes(svc.serviceId));
                            const others = providers.filter((p) => !p.serviceIds.includes(svc.serviceId));
                            return (
                              <select value={assignProviderId} onChange={(e) => setAssignProviderId(Number(e.target.value))} required>
                                <option value={0}>— Seleccionar —</option>
                                {qualified.length > 0 && (
                                  <optgroup label={`Con ${svc.service.name} asignado`}>
                                    {qualified.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}
                                  </optgroup>
                                )}
                                {others.length > 0 && (
                                  <optgroup label="Otros proveedores">
                                    {others.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}
                                  </optgroup>
                                )}
                              </select>
                            );
                          })()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Fecha de Envío</label>
                          <input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} required />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: svc.service.trackBySize ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
                        {svc.service.trackBySize && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Talla</label>
                            <select value={assignSize} onChange={(e) => setAssignSize(e.target.value)} required>
                              <option value="">— Seleccionar talla —</option>
                              {svc.sizeSplit.map((sz) => <option key={sz.size} value={sz.size}>{sz.size} (req. {sz.quantity})</option>)}
                            </select>
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Cantidad a Enviar</label>
                          <input type="number" min={1} value={assignQty} onChange={(e) => setAssignQty(Number(e.target.value))} required />
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Notas (opcional)</label>
                        <input type="text" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Ej: Lote inicial..." />
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="submit" disabled={loading} style={{ flex: 1, background: "var(--primary)", color: "white", border: "none", padding: "0.6rem", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                          {loading ? "Guardando..." : "Registrar Envío"}
                        </button>
                        <button type="button" onClick={closeForm} style={{ flex: 1, background: "transparent", border: "1px solid var(--card-border)", color: "var(--text-muted)", padding: "0.6rem", borderRadius: "var(--radius)", cursor: "pointer", fontSize: "0.85rem" }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Receive form */}
                  {activeForm === "receive" && selectedService === svc.id && (
                    <form onSubmit={handleReceiveSubmit} style={{ background: "#e8f5e920", border: "1px solid #4caf5040", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <strong style={{ fontSize: "0.85rem", color: "green", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <PackageCheck size={14} /> Registrar Recepción
                      </strong>
                      {error && <div style={{ color: "red", fontSize: "0.8rem", padding: "0.4rem 0.75rem", background: "#fff0f0", borderRadius: "4px" }}>{error}</div>}

                      {selectedAssignment && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          Lote pendiente por recepcionar:
                          {" "}
                          <strong style={{ color: selectedAssignmentPending > 0 ? "orange" : "green" }}>{selectedAssignmentPending}</strong>
                          {selectedAssignment.size && <span> · Talla: <strong>{selectedAssignment.size}</strong></span>}
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Cantidad Recibida</label>
                          <input type="number" min={1} max={Math.max(1, selectedAssignmentPending)} value={receiveQty} onChange={(e) => setReceiveQty(Number(e.target.value))} required />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Fecha de Recepción</label>
                          <input type="date" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} required />
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Notas (opcional)</label>
                        <input type="text" value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="Ej: Llegaron con observación..." />
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="submit" disabled={loading} style={{ flex: 1, background: "green", color: "white", border: "none", padding: "0.6rem", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                          {loading ? "Guardando..." : "Confirmar Recepción"}
                        </button>
                        <button type="button" onClick={closeForm} style={{ flex: 1, background: "transparent", border: "1px solid var(--card-border)", color: "var(--text-muted)", padding: "0.6rem", borderRadius: "var(--radius)", cursor: "pointer", fontSize: "0.85rem" }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
