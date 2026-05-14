"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, PlusCircle, ShoppingBag, X } from "lucide-react";
import { createPedido } from "@/app/actions/pedidos";
import { quickCreateClient } from "@/app/actions/clients";
import { quickCreateGarment } from "@/app/actions/garments";
import { quickCreateColor } from "@/app/actions/colors";
import { quickCreateSize } from "@/app/actions/sizes";

type Option = { id: number; name: string };
type SizeRow = { size: string; quantity: number; precio: string };
type ItemRow = { garment: string; color: string; sku: string; moneda: string; notes: string; sizes: SizeRow[] };

type ModalTarget =
  | { type: "client" }
  | { type: "garment"; itemIdx: number }
  | { type: "color"; itemIdx: number }
  | { type: "size"; itemIdx: number; sizeIdx: number };

const emptySize = (defaultPrecio = ""): SizeRow => ({ size: "", quantity: 0, precio: defaultPrecio });
const emptyItem = (): ItemRow => ({ garment: "", color: "", sku: "", moneda: "PEN", notes: "", sizes: [emptySize()] });

const inp: React.CSSProperties = {
  padding: "0.48rem 0.6rem", borderRadius: "6px",
  border: "1px solid var(--card-border)", background: "var(--bg-color)",
  fontSize: "0.875rem", width: "100%", boxSizing: "border-box",
};
const hdr: React.CSSProperties = {
  fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.05em", color: "var(--primary)",
};
const plusBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 22, height: 22, borderRadius: "50%",
  border: "1px solid var(--primary)", background: "transparent",
  color: "var(--primary)", cursor: "pointer", padding: 0, flexShrink: 0,
};

// ── Quick-create modal ──────────────────────────────────────────────────────
function QuickModal({
  title, onSave, onClose,
}: {
  title: string;
  onSave: (name: string) => Promise<string | null>; // returns error string or null
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError("Ingresa un nombre"); return; }
    setSaving(true);
    const err = await onSave(name.trim());
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--card-bg)", borderRadius: "10px", padding: "1.5rem",
        width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        border: "1px solid var(--card-border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
            <X size={18} />
          </button>
        </div>
        <input
          ref={inputRef}
          style={{ ...inp, marginBottom: "0.5rem" }}
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="Nombre..."
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
        />
        {error && (
          <div style={{ fontSize: "0.8rem", color: "#dc2626", marginBottom: "0.5rem" }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.75rem" }}>
          <button onClick={onClose} style={{
            padding: "0.42rem 1rem", borderRadius: "6px", fontSize: "0.84rem",
            border: "1px solid var(--card-border)", background: "transparent",
            color: "var(--text-muted)", cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "0.42rem 1.1rem", borderRadius: "6px", fontSize: "0.84rem", fontWeight: 700,
            background: "var(--primary)", color: "white", border: "none",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Label with + button ─────────────────────────────────────────────────────
function LabelWithAdd({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
      <span style={{ ...hdr, color: "var(--text-muted)" }}>{label}</span>
      <button type="button" onClick={onAdd} style={plusBtn} title={`Nuevo ${label}`}>
        <Plus size={12} />
      </button>
    </div>
  );
}

// ── Main form ───────────────────────────────────────────────────────────────
export default function NuevoPedidoForm({
  clients: initClients, sizes: initSizes, garments: initGarments, colors: initColors,
}: { clients: Option[]; sizes: Option[]; garments: Option[]; colors: Option[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Local option lists (mutable without page reload)
  const [clientOpts, setClientOpts] = useState<Option[]>(initClients);
  const [garmentOpts, setGarmentOpts] = useState<Option[]>(initGarments);
  const [colorOpts, setColorOpts] = useState<Option[]>(initColors);
  const [sizeOpts, setSizeOpts] = useState<Option[]>(initSizes);

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

  // Modal state
  const [modal, setModal] = useState<ModalTarget | null>(null);

  const updateItem = (idx: number, field: keyof Omit<ItemRow, "sizes">, value: string) =>
    setItems((p) => p.map((it, i) => i !== idx ? it : { ...it, [field]: value }));
  const addItem = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateSize = (ii: number, si: number, field: keyof SizeRow, value: string | number) =>
    setItems((p) => p.map((it, i) => i !== ii ? it : {
      ...it,
      sizes: it.sizes.map((s, j) => j !== si ? s : {
        ...s, [field]: field === "quantity" ? Number(value) : value,
      }),
    }));
  const addSize = (ii: number) =>
    setItems((p) => p.map((it, i) => {
      if (i !== ii) return it;
      const lastPrecio = it.sizes.length > 0 ? it.sizes[it.sizes.length - 1].precio : "";
      return { ...it, sizes: [...it.sizes, emptySize(lastPrecio)] };
    }));
  const removeSize = (ii: number, si: number) =>
    setItems((p) => p.map((it, i) => i !== ii ? it : { ...it, sizes: it.sizes.filter((_, j) => j !== si) }));

  // Totals
  const byMoneda: Record<string, number> = {};
  let totalUnits = 0;
  const itemSummaries = items.map((it) => {
    let qty = 0, subtotal = 0;
    it.sizes.forEach((s) => {
      const q = s.quantity || 0; const p = parseFloat(s.precio) || 0;
      qty += q; subtotal += q * p;
    });
    totalUnits += qty;
    if (subtotal > 0) byMoneda[it.moneda] = (byMoneda[it.moneda] || 0) + subtotal;
    return { qty, subtotal, sym: it.moneda === "USD" ? "$" : "S/" };
  });

  // Modal save handlers
  const handleModalSave = async (name: string): Promise<string | null> => {
    if (!modal) return null;
    if (modal.type === "client") {
      const res = await quickCreateClient(name);
      if ("error" in res) return res.error;
      setClientOpts((p) => [...p, res].sort((a, b) => a.name.localeCompare(b.name)));
      setClientId(String(res.id));
      setModal(null);
      return null;
    }
    if (modal.type === "garment") {
      const res = await quickCreateGarment(name);
      if ("error" in res) return res.error;
      setGarmentOpts((p) => [...p, res].sort((a, b) => a.name.localeCompare(b.name)));
      updateItem(modal.itemIdx, "garment", res.name);
      setModal(null);
      return null;
    }
    if (modal.type === "color") {
      const res = await quickCreateColor(name);
      if ("error" in res) return res.error;
      setColorOpts((p) => [...p, res].sort((a, b) => a.name.localeCompare(b.name)));
      updateItem(modal.itemIdx, "color", res.name);
      setModal(null);
      return null;
    }
    if (modal.type === "size") {
      const res = await quickCreateSize(name);
      if ("error" in res) return res.error;
      setSizeOpts((p) => [...p, res].sort((a, b) => a.name.localeCompare(b.name)));
      updateSize(modal.itemIdx, modal.sizeIdx, "size", res.name);
      setModal(null);
      return null;
    }
    return null;
  };

  const modalTitle = () => {
    if (!modal) return "";
    if (modal.type === "client") return "Nuevo Cliente";
    if (modal.type === "garment") return "Nueva Prenda";
    if (modal.type === "color") return "Nuevo Color";
    if (modal.type === "size") return "Nueva Talla";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!clientId) { setError("Seleccioná un cliente"); return; }
    if (items.some((it) => !it.garment || !it.color)) { setError("Completá prenda y color en todos los ítems"); return; }
    if (items.some((it) => it.sizes.some((s) => !s.size || s.quantity <= 0))) {
      setError("Completá talla y cantidad en todas las filas"); return;
    }
    setLoading(true);
    try {
      const pedido = await createPedido({
        client_id: Number(clientId),
        date: new Date(date),
        notes: notes || undefined,
        items: items.map((it) => ({
          garment: it.garment, color: it.color,
          sku: it.sku || undefined, moneda: it.moneda,
          notes: it.notes || undefined,
          sizes: it.sizes.map((s) => ({
            size: s.size, quantity: s.quantity,
            precioUnitario: parseFloat(s.precio) || undefined,
          })),
        })),
      });
      router.push(`/admin/pedidos/${pedido.id}`);
    } catch (err: any) {
      setError(err.message || "Error al crear pedido");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Modal */}
      {modal && (
        <QuickModal
          title={modalTitle()}
          onSave={handleModalSave}
          onClose={() => setModal(null)}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Link href="/admin/pedidos" style={{ color: "var(--text-muted)", display: "flex" }}><ArrowLeft size={20} /></Link>
        <ShoppingBag size={20} color="var(--primary)" />
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Nuevo Pedido</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Datos del pedido */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.1rem 1.25rem", marginBottom: "1rem" }}>
          <div style={{ ...hdr, marginBottom: "0.75rem" }}>Datos del Pedido</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 160px 2fr", gap: "1rem" }}>
            <div>
              <LabelWithAdd label="Cliente *" onAdd={() => setModal({ type: "client" })} />
              <select style={inp} value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ ...hdr, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Fecha *</div>
              <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <div style={{ ...hdr, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Notas generales</div>
              <input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del pedido..." />
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 1.25rem", borderBottom: "1px solid var(--card-border)", background: "var(--bg-color)" }}>
            <span style={hdr}>Ítems del Pedido</span>
            <button type="button" onClick={addItem} style={{
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
              padding: "0.32rem 0.8rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600,
              border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", cursor: "pointer",
            }}>
              <PlusCircle size={13} /> Agregar ítem
            </button>
          </div>

          {items.map((item, ii) => {
            const { qty, subtotal, sym } = itemSummaries[ii];
            return (
              <div key={ii} style={{ borderBottom: ii < items.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                {/* Item header: prenda | sku | color | moneda | [X] */}
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 0.8fr 90px 28px", gap: "0.75rem", padding: "0.9rem 1.25rem 0.5rem", alignItems: "end" }}>
                  <div>
                    {ii === 0 && <LabelWithAdd label="Prenda" onAdd={() => setModal({ type: "garment", itemIdx: ii })} />}
                    {ii > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
                        <button type="button" onClick={() => setModal({ type: "garment", itemIdx: ii })} style={plusBtn} title="Nueva Prenda">
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                    <select style={inp} value={item.garment} onChange={(e) => updateItem(ii, "garment", e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      {garmentOpts.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    {ii === 0 && <div style={{ ...hdr, color: "var(--text-muted)", marginBottom: "0.3rem" }}>SKU</div>}
                    <input style={inp} value={item.sku} onChange={(e) => updateItem(ii, "sku", e.target.value)} placeholder="SKU-001" />
                  </div>
                  <div>
                    {ii === 0 && <LabelWithAdd label="Color" onAdd={() => setModal({ type: "color", itemIdx: ii })} />}
                    {ii > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
                        <button type="button" onClick={() => setModal({ type: "color", itemIdx: ii })} style={plusBtn} title="Nuevo Color">
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                    <select style={inp} value={item.color} onChange={(e) => updateItem(ii, "color", e.target.value)} required>
                      <option value="">Color</option>
                      {colorOpts.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    {ii === 0 && <div style={{ ...hdr, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Moneda</div>}
                    <select style={inp} value={item.moneda} onChange={(e) => updateItem(ii, "moneda", e.target.value)}>
                      <option value="PEN">S/ Soles</option>
                      <option value="USD">$ USD</option>
                    </select>
                  </div>
                  <div style={{ paddingBottom: "0.1rem" }}>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(ii)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 0 }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tallas sub-table */}
                <div style={{ padding: "0 1.25rem 0.5rem 1.25rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "110px 80px 100px 24px", gap: "0.5rem", marginBottom: "0.3rem", paddingLeft: "0.1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ ...hdr, color: "var(--text-muted)" }}>Talla</span>
                      <button type="button" onClick={() => setModal({ type: "size", itemIdx: ii, sizeIdx: 0 })} style={{ ...plusBtn, width: 18, height: 18 }} title="Nueva Talla">
                        <Plus size={10} />
                      </button>
                    </div>
                    <span style={{ ...hdr, color: "var(--text-muted)" }}>Cantidad</span>
                    <span style={{ ...hdr, color: "var(--text-muted)" }}>Precio unit. (s/IGV)</span>
                    <span />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {item.sizes.map((sr, si) => (
                      <div key={si} style={{ display: "grid", gridTemplateColumns: "110px 80px 100px 24px", gap: "0.5rem", alignItems: "center" }}>
                        <select value={sr.size} onChange={(e) => updateSize(ii, si, "size", e.target.value)}
                          style={{ ...inp, fontSize: "0.83rem" }} required>
                          <option value="">Talla...</option>
                          {sizeOpts.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <input type="number" min={1} value={sr.quantity || ""}
                          onChange={(e) => updateSize(ii, si, "quantity", e.target.value)}
                          placeholder="0" style={{ ...inp, fontSize: "0.83rem" }} required />
                        <input type="number" min={0} step="0.01" value={sr.precio}
                          onChange={(e) => updateSize(ii, si, "precio", e.target.value)}
                          placeholder="0.00" style={{ ...inp, fontSize: "0.83rem" }} />
                        {item.sizes.length > 1 && (
                          <button type="button" onClick={() => removeSize(ii, si)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 0 }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                    <button type="button" onClick={() => addSize(ii)} style={{
                      display: "inline-flex", alignItems: "center", gap: "0.2rem",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--primary)", fontSize: "0.75rem", fontWeight: 600, padding: 0,
                    }}>
                      <Plus size={12} /> Agregar talla
                    </button>
                    {qty > 0 && (
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
                        {qty} u.{subtotal > 0 && <span style={{ color: "green", marginLeft: "0.4rem" }}>{sym} {subtotal.toFixed(2)}</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* Nota */}
                <div style={{ padding: "0 1.25rem 0.9rem" }}>
                  <input value={item.notes} onChange={(e) => updateItem(ii, "notes", e.target.value)}
                    placeholder="Nota del ítem (opcional)..."
                    style={{ ...inp, fontSize: "0.8rem", color: "var(--text-muted)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--card-bg)", border: "1px solid var(--card-border)",
          borderRadius: "var(--radius)", padding: "1rem 1.5rem", marginBottom: "1.25rem",
          flexWrap: "wrap", gap: "1rem",
        }}>
          <div style={{ display: "flex", gap: "2.5rem" }}>
            <div>
              <div style={{ ...hdr, color: "var(--text-muted)" }}>Ítems</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.2 }}>{items.length}</div>
            </div>
            <div>
              <div style={{ ...hdr, color: "var(--text-muted)" }}>Total Unidades</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.2 }}>{totalUnits}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...hdr, color: "var(--text-muted)", marginBottom: "0.25rem" }}>Monto de Venta (sin IGV)</div>
            {Object.keys(byMoneda).length === 0 ? (
              <div style={{ fontSize: "1.1rem", color: "var(--text-muted)", fontWeight: 600 }}>—</div>
            ) : (
              <div style={{ display: "flex", gap: "1.5rem", justifyContent: "flex-end" }}>
                {Object.entries(byMoneda).map(([mon, monto]) => (
                  <div key={mon} style={{ fontSize: "1.5rem", fontWeight: 800, color: "green" }}>
                    {mon === "USD" ? "$" : "S/"} {monto.toFixed(2)}
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "0.3rem" }}>{mon}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0.7rem 1rem", color: "#dc2626", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="submit" disabled={loading} style={{
            padding: "0.6rem 1.5rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 700,
            background: "var(--primary)", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Guardando..." : "Crear Pedido"}
          </button>
          <Link href="/admin/pedidos" style={{
            padding: "0.6rem 1.2rem", borderRadius: "8px", border: "1px solid var(--card-border)",
            fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none",
            display: "inline-flex", alignItems: "center",
          }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
