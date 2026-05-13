"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Truck } from "lucide-react";
import Link from "next/link";

type ServiceRow = { name: string; sent: number; received: number; pending: number };

type Props = {
  providerId: number;
  businessName: string;
  sent: number;
  received: number;
  pending: number;
  services: ServiceRow[];
};

export default function TallerAccordion({ providerId, businessName, sent, received, pending, services }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--card-bg)" }}>
      {/* Main row */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", padding: "0.9rem 1.25rem", cursor: "pointer", gap: "1rem", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
          <Truck size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <strong style={{ fontSize: "0.95rem" }}>{businessName}</strong>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center", fontSize: "0.9rem" }}>
          <span style={{ color: "var(--primary)", fontWeight: 700, minWidth: "4rem", textAlign: "center" }}>{sent}</span>
          <span style={{ color: "green", fontWeight: 700, minWidth: "4rem", textAlign: "center" }}>{received}</span>
          <span style={{ fontWeight: 800, minWidth: "4rem", textAlign: "center", color: pending > 0 ? "orange" : "var(--text-muted)" }}>
            {pending > 0 ? pending : "✓"}
          </span>
        </div>
        <Link
          href={`/admin/providers/${providerId}/reporte`}
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: "0.78rem", color: "var(--primary)", textDecoration: "none", whiteSpace: "nowrap", padding: "0.3rem 0.75rem", border: "1px solid var(--card-border)", borderRadius: "6px" }}
        >
          Ver detalle
        </Link>
        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>

      {/* Expandable service breakdown */}
      {open && (
        <div style={{ borderTop: "1px solid var(--card-border)", background: "var(--bg-color)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "0.5rem 1.25rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Servicio</th>
                <th style={{ padding: "0.5rem 1rem", textAlign: "center", color: "var(--primary)", fontWeight: 600 }}>Enviado (OP)</th>
                <th style={{ padding: "0.5rem 1rem", textAlign: "center", color: "green", fontWeight: 600 }}>Recibido</th>
                <th style={{ padding: "0.5rem 1rem", textAlign: "center", color: "orange", fontWeight: 600 }}>En Taller</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.name} style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td style={{ padding: "0.55rem 1.25rem", fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "0.55rem 1rem", textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>{s.sent}</td>
                  <td style={{ padding: "0.55rem 1rem", textAlign: "center", color: "green", fontWeight: 700 }}>{s.received}</td>
                  <td style={{ padding: "0.55rem 1rem", textAlign: "center", fontWeight: 800, color: s.pending > 0 ? "orange" : "var(--text-muted)" }}>
                    {s.pending > 0 ? s.pending : "✓"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
