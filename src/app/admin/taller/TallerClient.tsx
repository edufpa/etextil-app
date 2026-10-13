"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PackageCheck, Search, CheckCheck, Eraser, ExternalLink, Loader2 } from "lucide-react";
import { receiveFromProviderBatch } from "@/app/actions/taller";
import styles from "./taller.module.css";

export type TallerCell = { size: string; sent: number; received: number };
export type TallerRow = {
  orderServiceId: number;
  orderId: number;
  orderNumber: string;
  garment: string;
  color: string;
  client: string;
  service: string;
  cells: TallerCell[];
};

type Props = {
  providers: { id: number; businessName: string }[];
  providerId: number | null;
  providerName: string;
  rows: TallerRow[];
};

const key = (osId: number, size: string) => `${osId}|${size}`;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function TallerClient({ providers, providerId, providerName, rows }: Props) {
  const router = useRouter();
  const [navPending, startNav] = useTransition();
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.type === "ok" ? 4000 : 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.orderNumber, r.client, r.garment, r.color, r.service].some((v) => v?.toLowerCase().includes(term))
    );
  }, [rows, q]);

  const totalToReceive = Object.values(qty).reduce((a, b) => a + (b || 0), 0);
  const totalPending = visible.reduce((a, r) => a + r.cells.reduce((s, c) => s + Math.max(0, c.sent - c.received), 0), 0);

  const setCell = (osId: number, c: TallerCell, raw: string) => {
    const pending = Math.max(0, c.sent - c.received);
    let n = raw === "" ? 0 : Math.floor(Number(raw));
    if (isNaN(n) || n < 0) n = 0;
    if (n > pending) n = pending;
    setQty((prev) => ({ ...prev, [key(osId, c.size)]: n }));
  };

  const fillRow = (r: TallerRow) =>
    setQty((prev) => {
      const next = { ...prev };
      for (const c of r.cells) next[key(r.orderServiceId, c.size)] = Math.max(0, c.sent - c.received);
      return next;
    });

  const fillAll = () =>
    setQty((prev) => {
      const next = { ...prev };
      for (const r of visible) for (const c of r.cells) next[key(r.orderServiceId, c.size)] = Math.max(0, c.sent - c.received);
      return next;
    });

  const save = async () => {
    if (!providerId) return;
    const items = Object.entries(qty)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => {
        const [os, ...rest] = k.split("|");
        return { orderServiceId: Number(os), size: rest.join("|"), quantity: v };
      });
    if (items.length === 0) { setToast({ type: "error", text: "Ingresa al menos una cantidad a recibir." }); return; }
    setSaving(true);
    const res = await receiveFromProviderBatch({ providerId, date, notes, items });
    setSaving(false);
    if ("error" in res && res.error) {
      setToast({ type: "error", text: res.error });
    } else {
      setToast({ type: "ok", text: `Ingreso registrado: ${(res as any).total} u en ${(res as any).count} línea(s).` });
      setQty({});
      setNotes("");
      router.refresh();
    }
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>Proveedor / taller</span>
          <select
            value={providerId ?? ""}
            onChange={(e) => startNav(() => router.push(e.target.value ? `/admin/taller?provider=${e.target.value}` : "/admin/taller"))}
          >
            <option value="">— Selecciona —</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}
          </select>
        </label>
        {providerId && (
          <>
            <label className={styles.field}>
              <span>Buscar OP / cliente / prenda</span>
              <div className={styles.searchBox}>
                <Search size={15} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: OP-0012" />
              </div>
            </label>
            <label className={styles.field}>
              <span>Fecha de ingreso</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className={`${styles.field} ${styles.grow}`}>
              <span>Nota (opcional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: guía del taller 123" />
            </label>
          </>
        )}
      </div>

      {navPending && <div className={styles.info}><Loader2 size={16} className={styles.spin} /> Cargando…</div>}

      {!providerId && !navPending && (
        <div className={styles.empty}>Elige un proveedor para ver lo que tiene pendiente de devolver.</div>
      )}

      {providerId && !navPending && rows.length === 0 && (
        <div className={styles.empty}>{providerName || "Este proveedor"} no tiene trabajo pendiente de devolver. 🎉</div>
      )}

      {providerId && !navPending && rows.length > 0 && (
        <>
          <div className={styles.summary}>
            <span><strong>{visible.length}</strong> fila(s) · <strong>{totalPending}</strong> u pendientes</span>
            <div className={styles.summaryBtns}>
              <button type="button" className={styles.btnSecondary} onClick={() => setQty({})} disabled={saving}><Eraser size={15} /> Limpiar</button>
              <button type="button" className={styles.btnSecondary} onClick={fillAll} disabled={saving}><CheckCheck size={15} /> Recibir todo el pendiente</button>
            </div>
          </div>

          <div className={styles.rows}>
            {visible.map((r) => {
              const rowPending = r.cells.reduce((s, c) => s + Math.max(0, c.sent - c.received), 0);
              return (
                <div key={r.orderServiceId} className={styles.row}>
                  <div className={styles.rowHead}>
                    <div>
                      <div className={styles.rowTitle}>
                        <Link href={`/admin/orders/${r.orderId}`} className={styles.opLink}>{r.orderNumber} <ExternalLink size={12} /></Link>
                        <span className={styles.badge}>{r.service}</span>
                      </div>
                      <div className={styles.rowSub}>{[r.client, r.garment, r.color].filter(Boolean).join(" · ")}</div>
                    </div>
                    <button type="button" className={styles.btnSmall} onClick={() => fillRow(r)} disabled={saving}>
                      <CheckCheck size={14} /> Todo ({rowPending})
                    </button>
                  </div>
                  <div className={styles.cells}>
                    {r.cells.map((c) => {
                      const pending = Math.max(0, c.sent - c.received);
                      const k = key(r.orderServiceId, c.size);
                      return (
                        <div key={k} className={`${styles.cell} ${pending === 0 ? styles.cellDone : ""}`}>
                          <div className={styles.cellSize}>{c.size || "Sin talla"}</div>
                          <div className={styles.cellNums}>
                            <span title="Enviado">Env {c.sent}</span>
                            <span title="Recibido">Rec {c.received}</span>
                            <span title="Pendiente" className={pending > 0 ? styles.pend : ""}>Pend {pending}</span>
                          </div>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={pending}
                            disabled={pending === 0 || saving}
                            value={qty[k] ? qty[k] : ""}
                            placeholder="0"
                            onChange={(e) => setCell(r.orderServiceId, c, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            aria-label={`Recibir ${r.orderNumber} ${r.service} talla ${c.size}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.saveBar}>
            <span>A recibir: <strong>{totalToReceive}</strong> u</span>
            <button type="button" className={styles.btnPrimary} onClick={save} disabled={saving || totalToReceive === 0}>
              {saving ? <Loader2 size={16} className={styles.spin} /> : <PackageCheck size={16} />}
              {saving ? "Guardando…" : "Guardar ingresos"}
            </button>
          </div>
        </>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "ok" ? styles.toastOk : styles.toastErr}`} role="status" onClick={() => setToast(null)}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
