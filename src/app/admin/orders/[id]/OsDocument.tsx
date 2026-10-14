"use client";

import { Printer, X } from "lucide-react";

export type OsDocumentData = {
  osNumber: string;
  opNumber: string;
  clientName: string;
  garment: string;
  color: string;
  serviceName: string;
  providerName: string;
  /** ISO o yyyy-mm-dd */
  date: string;
  dueDate?: string | null;
  lines: { size: string; quantity: number }[];
  unitPrice: number | null;
  notes?: string | null;
  voided?: boolean;
};

const fmtDate = (d: string) =>
  new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });

const label = { color: "#888", fontSize: "0.72rem", display: "block", textTransform: "uppercase", fontWeight: 600 } as const;
const cell = { padding: "0.5rem 0.75rem", border: "1px solid #dde" } as const;

/** Documento imprimible de una Orden de Servicio. Al imprimir solo sale la OS (no el resto de la página). */
export default function OsDocument({ data, onClose }: { data: OsDocumentData; onClose: () => void }) {
  const total = data.lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", overflowY: "auto" }}>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #os-printable, #os-printable * { visibility: visible !important; }
        #os-printable { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; }
        .os-no-print { display: none !important; }
      }`}</style>
      <div id="os-printable" style={{ background: "white", color: "#111", borderRadius: "var(--radius)", padding: "2rem", width: "100%", maxWidth: "560px", position: "relative" }}>
        <button className="os-no-print" onClick={onClose} aria-label="Cerrar" style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#666" }}>
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "1.5rem", borderBottom: "2px solid #333", paddingBottom: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#666", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Orden de Servicio {data.voided && "· ANULADA"}
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "0.25rem" }}>{data.osNumber}</div>
          <div style={{ fontSize: "0.85rem", color: "#333", marginTop: "0.15rem", fontWeight: 600 }}>OP {data.opNumber}</div>
          <div style={{ fontSize: "0.8rem", color: "#555", marginTop: "0.25rem" }}>
            Emitida: {fmtDate(data.date)}
            {data.dueDate && ` · Entrega: ${fmtDate(data.dueDate)}`}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          <div><span style={label}>Cliente</span>{data.clientName}</div>
          <div><span style={label}>Prenda</span>{data.garment}</div>
          <div><span style={label}>Color</span>{data.color}</div>
          <div><span style={label}>Servicio</span><strong>{data.serviceName}</strong></div>
          <div style={{ gridColumn: "span 2" }}>
            <span style={label}>Taller / Proveedor</span>
            <strong style={{ fontSize: "1rem" }}>{data.providerName}</strong>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginBottom: "1rem" }}>
          <thead>
            <tr style={{ background: "#f0f4ff" }}>
              <th style={{ ...cell, textAlign: "left", fontWeight: 700 }}>Talla</th>
              <th style={{ ...cell, textAlign: "center", fontWeight: 700 }}>Cantidad</th>
              {data.unitPrice !== null && <th style={{ ...cell, textAlign: "right", fontWeight: 700 }}>Importe</th>}
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={`${l.size}-${i}`}>
                <td style={{ ...cell, fontWeight: 600 }}>{l.size || "—"}</td>
                <td style={{ ...cell, textAlign: "center", fontWeight: 800, fontSize: "1.05rem" }}>{l.quantity}</td>
                {data.unitPrice !== null && <td style={{ ...cell, textAlign: "right" }}>S/ {(l.quantity * data.unitPrice).toFixed(2)}</td>}
              </tr>
            ))}
            <tr style={{ background: "#f8f8f8" }}>
              <td style={{ ...cell, fontWeight: 700 }}>TOTAL</td>
              <td style={{ ...cell, textAlign: "center", fontWeight: 900, fontSize: "1.1rem" }}>{total}</td>
              {data.unitPrice !== null && <td style={{ ...cell, textAlign: "right", fontWeight: 900 }}>S/ {(total * data.unitPrice).toFixed(2)}</td>}
            </tr>
          </tbody>
        </table>
        {data.unitPrice !== null && (
          <div style={{ fontSize: "0.8rem", color: "#555", marginBottom: "0.75rem" }}>Precio por prenda: S/ {data.unitPrice.toFixed(2)}</div>
        )}

        {data.notes && (
          <div style={{ fontSize: "0.8rem", color: "#666", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
            <strong>Notas:</strong> {data.notes}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2.5rem" }}>
          <div style={{ borderTop: "1px solid #999", paddingTop: "0.4rem", fontSize: "0.72rem", color: "#777", textAlign: "center" }}>Entregado por</div>
          <div style={{ borderTop: "1px solid #999", paddingTop: "0.4rem", fontSize: "0.72rem", color: "#777", textAlign: "center" }}>Recibido por (taller)</div>
        </div>

        <div className="os-no-print" style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <button onClick={() => window.print()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#111", color: "white", border: "none", padding: "0.7rem", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 600 }}>
            <Printer size={16} /> Imprimir OS
          </button>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--card-border)", padding: "0.7rem", borderRadius: "var(--radius)", cursor: "pointer" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
