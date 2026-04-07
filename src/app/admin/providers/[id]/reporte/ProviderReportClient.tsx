"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProviderIncoming } from "@/app/actions/providerIncoming";
import { Send, PackageCheck, Plus, Check } from "lucide-react";
import Link from "next/link";

type Incoming = { id: number; quantity: number; date: string | Date };

type DeliveryRow = {
  id: number;
  size: string | null;
  date: string | Date;
  notes: string | null;
  sentQty: number;
  received: number;
  pending: number;
  orderId: number;
  orderNumber: string;
  serviceName: string;
  incomings: Incoming[];
};

type OrderGroup = {
  orderId: number;
  order: { orderNumber: string; clientName: string; garment: string; color: string };
  rows: DeliveryRow[];
};

type Props = {
  providerId: number;
  orderGroups: OrderGroup[];
  byService: { serviceName: string; sent: number; received: number; pending: number }[];
};

export default function ProviderReportClient({ providerId, orderGroups, byService }: Props) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [activeRow, setActiveRow] = useState<number | null>(null); // delivery id
  const [inQty, setInQty] = useState(1);
  const [inDate, setInDate] = useState(new Date().toISOString().split("T")[0]);
  const [inNotes, setInNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openForm = (row: DeliveryRow) => {
    setActiveRow(row.id);
    setInQty(row.pending);
    setInDate(new Date().toISOString().split("T")[0]);
    setInNotes("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent, deliveryId: number, orderId: number) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createProviderIncoming({
      providerDelivery_id: deliveryId,
      orderId,
      quantity: inQty,
      date: new Date(inDate + "T12:00:00"),
      notes: inNotes,
    });
    setLoading(false);
    if (res.error) { setError(res.error); }
    else { setActiveRow(null); router.refresh(); }
  };

  // Filter groups: if showAll=false, only show groups with pending rows
  const filteredGroups = orderGroups.filter((g) =>
    showAll || g.rows.some((r) => r.pending > 0)
  );

  const totalPendingAll = orderGroups.reduce((s, g) => s + g.rows.reduce((a, r) => a + r.pending, 0), 0);

  return (
    <div>
      {/* Service summary table */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ padding: "0.9rem 1.25rem", background: "var(--bg-color)", borderBottom: "1px solid var(--card-border)", fontWeight: 700 }}>
          Reporte en proceso por servicio
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-color)", borderBottom: "1px solid var(--card-border)" }}>
              <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)" }}>Servicio</th>
              <th style={{ padding: "0.6rem 1rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>Enviado (OP)</th>
              <th style={{ padding: "0.6rem 1rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>Recibido (Ingreso)</th>
              <th style={{ padding: "0.6rem 1rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>En Taller</th>
            </tr>
          </thead>
          <tbody>
            {byService.map((row) => (
              <tr key={row.serviceName} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.6rem 1rem", fontWeight: 700 }}>{row.serviceName}</td>
                <td style={{ padding: "0.6rem 1rem", textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>{row.sent}</td>
                <td style={{ padding: "0.6rem 1rem", textAlign: "center", color: "green", fontWeight: 700 }}>{row.received}</td>
                <td style={{ padding: "0.6rem 1rem", textAlign: "center", fontWeight: 700, color: row.pending > 0 ? "orange" : "var(--text-muted)" }}>
                  {row.pending > 0 ? row.pending : "✓"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Filter toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {showAll ? `Mostrando todos los pedidos` : `Mostrando solo pedidos con pendientes`}
        </span>
        <button
          onClick={() => setShowAll(!showAll)}
          style={{ padding: "0.35rem 0.85rem", background: showAll ? "var(--primary)" : "transparent", color: showAll ? "white" : "var(--primary)", border: "1px solid var(--primary)", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
        >
          {showAll ? "Ver solo activos" : "Ver todos"}
        </button>
        {totalPendingAll > 0 && (
          <span style={{ background: "#fff3e0", color: "orange", border: "1px solid orange", borderRadius: "999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
            {totalPendingAll} en taller
          </span>
        )}
      </div>

      {/* Order groups */}
      {filteredGroups.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          No hay OPs con trabajo pendiente.{" "}
          <button onClick={() => setShowAll(true)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>Ver historial completo</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {filteredGroups.map(({ orderId, order, rows }) => {
            const orderPending = rows.reduce((s, r) => s + r.pending, 0);
            const displayedRows = showAll ? rows : rows.filter((r) => r.pending > 0);
            return (
              <div key={orderId} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <div style={{ padding: "0.9rem 1.25rem", background: "var(--bg-color)", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <Link href={`/admin/orders/${orderId}`} style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>
                      Pedido {order.orderNumber}
                    </Link>
                    <span style={{ color: "var(--text-muted)", marginLeft: "0.75rem", fontSize: "0.875rem" }}>
                      {order.clientName} · {order.garment} · {order.color}
                    </span>
                  </div>
                  {orderPending > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#fff3e0", color: "orange", border: "1px solid orange", borderRadius: "999px", padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700 }}>
                      {orderPending} en taller
                    </span>
                  )}
                  {orderPending === 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#e8f5e9", color: "green", border: "1px solid green", borderRadius: "999px", padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700 }}>
                      <Check size={12} /> Completo
                    </span>
                  )}
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-color)", borderBottom: "1px solid var(--card-border)" }}>
                      <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "var(--text-muted)" }}>Servicio</th>
                      <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "var(--text-muted)" }}>Talla</th>
                      <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "var(--text-muted)" }}>Fecha OP</th>
                      <th style={{ padding: "0.5rem 1rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>Enviado</th>
                      <th style={{ padding: "0.5rem 1rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>Ingresado</th>
                      <th style={{ padding: "0.5rem 1rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>En Taller</th>
                      <th style={{ padding: "0.5rem 1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((row) => (
                      <>
                        <tr key={row.id} style={{ borderBottom: activeRow === row.id ? "none" : "1px solid var(--card-border)", background: row.pending > 0 ? "#fff8f0" : undefined }}>
                          <td style={{ padding: "0.6rem 1rem", fontWeight: 700 }}>{row.serviceName}</td>
                          <td style={{ padding: "0.6rem 1rem" }}>
                            {row.size ? (
                              <span style={{ background: "var(--primary)", color: "white", padding: "2px 8px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700 }}>{row.size}</span>
                            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "0.6rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            {new Date(row.date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "0.6rem 1rem", textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", fontWeight: 700 }}>
                              <Send size={12} /> {row.sentQty}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem 1rem", textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "green", fontWeight: 700 }}>
                              <PackageCheck size={12} /> {row.received}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem 1rem", textAlign: "center", fontWeight: 700, color: row.pending > 0 ? "orange" : "var(--text-muted)" }}>
                            {row.pending > 0 ? row.pending : "✓"}
                          </td>
                          <td style={{ padding: "0.6rem 1rem" }}>
                            {row.pending > 0 && activeRow !== row.id && (
                              <button
                                onClick={() => openForm(row)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "green", color: "white", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }}
                              >
                                <PackageCheck size={13} /> Ingresar
                              </button>
                            )}
                          </td>
                        </tr>
                        {activeRow === row.id && (
                          <tr key={`form-${row.id}`} style={{ borderBottom: "1px solid var(--card-border)", background: "#f0fff4" }}>
                            <td colSpan={7} style={{ padding: "0.75rem 1rem" }}>
                              <form onSubmit={(e) => handleSubmit(e, row.id, row.orderId)} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Cant. (máx {row.pending})</label>
                                  <input type="number" min={1} max={row.pending} value={inQty} onChange={(e) => setInQty(Number(e.target.value))} style={{ width: "80px" }} required />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Fecha</label>
                                  <input type="date" value={inDate} onChange={(e) => setInDate(e.target.value)} required />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1 }}>
                                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Notas</label>
                                  <input type="text" value={inNotes} onChange={(e) => setInNotes(e.target.value)} placeholder="Opcional..." style={{ minWidth: "150px" }} />
                                </div>
                                {error && <div style={{ color: "red", fontSize: "0.75rem", padding: "0.3rem 0.5rem", background: "#fff0f0", borderRadius: "4px" }}>{error}</div>}
                                <button type="submit" disabled={loading} style={{ background: "green", color: "white", border: "none", padding: "0.45rem 1rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                                  <Plus size={13} /> {loading ? "Guardando..." : "Confirmar"}
                                </button>
                                <button type="button" onClick={() => setActiveRow(null)} style={{ background: "transparent", border: "1px solid var(--card-border)", padding: "0.45rem 0.75rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                  Cancelar
                                </button>
                              </form>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
