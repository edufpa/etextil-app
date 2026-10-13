"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { setPedidoItemImage, removePedidoItemImage } from "@/app/actions/pedidoFiles";
import { compressImage } from "@/lib/client-image";
import styles from "./pedidos.module.css";

export default function ItemImage({ itemId, version, label }: { itemId: number; version: number | null; label: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(false);
  const src = version ? `/api/pedidos/items/${itemId}/image?v=${version}` : null;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr("");
    if (!f.type.startsWith("image/")) { setErr("Elige una imagen."); return; }
    setBusy(true);
    const blob = await compressImage(f);
    const fd = new FormData();
    fd.set("itemId", String(itemId));
    fd.set("image", blob, f.name);
    const res = await setPedidoItemImage(fd);
    setBusy(false);
    if (input.current) input.current.value = "";
    if ("error" in res) setErr(res.error);
    else router.refresh();
  };

  const remove = async () => {
    if (!confirm(`¿Quitar la imagen de ${label}?`)) return;
    setBusy(true);
    const res = await removePedidoItemImage(itemId);
    setBusy(false);
    if ("error" in res) setErr(res.error);
    else router.refresh();
  };

  return (
    <div className={styles.thumbWrap}>
      {src ? (
        <button type="button" className={styles.thumb} onClick={() => setZoom(true)} title="Ver imagen" style={{ cursor: "zoom-in" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} loading="lazy" />
          {busy && <div className={styles.thumbBusy}><Loader2 size={18} className={styles.spin} /></div>}
        </button>
      ) : (
        <button type="button" className={`${styles.thumb} ${styles.thumbEmpty}`} onClick={() => input.current?.click()} disabled={busy} title="Subir imagen de la prenda">
          {busy ? <Loader2 size={18} className={styles.spin} /> : <><ImagePlus size={20} /><span>Agregar imagen</span></>}
        </button>
      )}
      {src && (
        <div className={styles.thumbBtns}>
          <button type="button" className={styles.tinyBtn} onClick={() => input.current?.click()} disabled={busy} title="Reemplazar imagen"><RefreshCw size={11} /> Cambiar</button>
          <button type="button" className={`${styles.tinyBtn} ${styles.tinyBtnDanger}`} onClick={remove} disabled={busy} title="Quitar imagen"><Trash2 size={11} /></button>
        </div>
      )}
      {err && <div style={{ fontSize: "0.7rem", color: "var(--danger)", textAlign: "center" }}>{err}</div>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {zoom && src && (
        <div className={styles.lightbox} onClick={() => setZoom(false)} role="dialog" aria-label={label}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} />
        </div>
      )}
    </div>
  );
}
