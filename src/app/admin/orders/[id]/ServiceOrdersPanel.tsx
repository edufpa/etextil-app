"use client";

import { voidServiceOrder } from "@/app/actions/serviceOrders";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban } from "lucide-react";

export type ServiceOrderRow = {
  id: number;
  osNumber: string;
  serviceName: string;
  providerName: string;
  date: string;
  dueDate: string | null;
  status: "EMITIDA" | "PARCIAL" | "COMPLETA" | "ANULADA";
  sent: number;
  received: number;
  unitPrice: number | null;
  voidNote: string | null;
  lines: { size: string; quantity: number; received: number }[];
};

const STATUS_COLOR: Record<ServiceOrderRow["status"], string> = {
  EMITIDA: "#2563eb",
  PARCIAL: "#d97706",
  COMPLETA: "#16a34a",
  ANULADA: "#94a3b8",
};

const money = (n: number) => `S/ ${n.toFixed(2)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function ServiceOrdersPanel({ rows }: { rows: ServiceOrderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleVoid = async (r: ServiceOrderRow) => {
    const reason = window.prompt(`Anular ${r.osNumber}. Se liberan las ${r.sent} u enviadas. Motivo (opcional):`);
    if (reason === null) return;
    setBusy(r.id);
    setError("");
    const res = await voidServiceOrder(r.id, reason);
    setBusy(null);
    if (!res.success) setError(res.error);
    else router.refresh();
  };

  const active = rows.filter((r) => r.status !== "ANULADA");
  const totalValue = active.reduce((a, r) => a + (r.unitPrice ?? 0) * r.sent, 0);
  const payable = active.reduce((a, r) => a + (r.unitPrice ?? 0) * r.received, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {error && <div style={{ color: "red", fontSize: "0.875rem", padding: "0.5rem", background: "#fff0f0", borderRadius: "4px", marginBottom: "0.75rem" }}>{error}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ padding: "0.4rem" }}>OS</th>
              <th style={{ padding: "0.4rem" }}>Servicio / Taller</th>
              <th style={{ padding: "0.4rem" }}>Emisión</th>
              <th style={{ padding: "0.4rem", textAlign: "center" }}>Enviado</th>
              <th style={{ padding: "0.4rem", textAlign: "center" }}>Recibido</th>
              <th style={{ padding: "0.4rem", textAlign: "right" }}>Total</th>
              <th style={{ padding: "0.4rem" }}>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const late = r.dueDate && r.status !== "COMPLETA" && r.status !== "ANULADA" && r.dueDate.slice(0, 10) < today;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid var(--card-border)", opacity: r.status === "ANULADA" ? 0.55 : 1 }}>
                  <td style={{ padding: "0.5rem 0.4rem", fontWeight: 800 }}>{r.osNumber}</td>
                  <td style={{ padding: "0.5rem 0.4rem" }}>
                    <strong>{r.serviceName}</strong>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{r.providerName}</div>
                    {r.lines.length > 0 && (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        {r.lines.map((l) => `${l.size || "s/t"}: ${l.received}/${l.quantity}`).join(" · ")}
                      </div>
                    )}
                    {r.voidNote && <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{r.voidNote}</div>}
                  </td>
                  <td style={{ padding: "0.5rem 0.4rem" }}>
                    {day(r.date)}
                    {r.dueDate && (
                      <div style={{ fontSize: "0.72rem", color: late ? "#dc2626" : "var(--text-muted)", fontWeight: late ? 700 : 400 }}>
                        Entrega {day(r.dueDate)}{late ? " · atrasada" : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.5rem 0.4rem", textAlign: "center" }}>{r.status === "ANULADA" ? "—" : r.sent}</td>
                  <td style={{ padding: "0.5rem 0.4rem", textAlign: "center", color: "green", fontWeight: 600 }}>{r.status === "ANULADA" ? "—" : r.received}</td>
                  <td style={{ padding: "0.5rem 0.4rem", textAlign: "right" }}>
                    {r.status !== "ANULADA" && r.unitPrice !== null ? (
                      <>
                        {money(r.unitPrice * r.sent)}
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{money(r.unitPrice)} c/u</div>
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.4rem" }}>
                    <span style={{ background: STATUS_COLOR[r.status], color: "white", borderRadius: "999px", padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem 0.4rem", textAlign: "right" }}>
                    {r.status === "EMITIDA" && (
                      <button
                        onClick={() => handleVoid(r)}
                        disabled={busy === r.id}
                        title="Anular OS"
                        style={{ background: "transparent", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#dc2626" }}
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {totalValue > 0 && (
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--card-border)", fontWeight: 700 }}>
                <td colSpan={5} style={{ padding: "0.5rem 0.4rem", textAlign: "right" }}>Total en OS (por pagar a talleres: {money(payable)})</td>
                <td style={{ padding: "0.5rem 0.4rem", textAlign: "right" }}>{money(totalValue)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
