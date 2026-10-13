"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, Upload, Download, Trash2, ExternalLink, Paperclip, Loader2 } from "lucide-react";
import { uploadPedidoFileChunk, deletePedidoFile } from "@/app/actions/pedidoFiles";
import { formatBytes } from "@/lib/client-image";
import styles from "./pedidos.module.css";

export type PedidoFileRow = { id: number; name: string; mimeType: string; size: number; createdAt: string };

const CHUNK = 3 * 1024 * 1024;
const MAX = 10 * 1024 * 1024;

export default function PedidoFilesPanel({ pedidoId, files }: { pedidoId: number; files: PedidoFileRow[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState<{ name: string; pct: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const uploadOne = async (file: File) => {
    const type = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    if (!(type === "application/pdf" || type.startsWith("image/"))) throw new Error(`"${file.name}": solo se permiten PDF o imágenes.`);
    if (file.size > MAX) throw new Error(`"${file.name}" supera el máximo de 10 MB.`);
    let fileId: number | null = null;
    for (let off = 0; off < file.size; off += CHUNK) {
      const fd = new FormData();
      fd.set("pedidoId", String(pedidoId));
      fd.set("name", file.name);
      fd.set("mimeType", type);
      fd.set("totalSize", String(file.size));
      if (fileId) fd.set("fileId", String(fileId));
      if (off + CHUNK >= file.size) fd.set("last", "1");
      fd.set("chunk", file.slice(off, off + CHUNK));
      const res = await uploadPedidoFileChunk(fd);
      if ("error" in res) {
        if (fileId) await deletePedidoFile(fileId);
        throw new Error(res.error);
      }
      fileId = res.fileId;
      setBusy({ name: file.name, pct: Math.min(100, Math.round(((off + CHUNK) / file.size) * 100)) });
    }
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setMsg(null);
    let ok = 0;
    try {
      for (const f of Array.from(list)) {
        setBusy({ name: f.name, pct: 0 });
        await uploadOne(f);
        ok++;
      }
      setMsg({ ok: true, text: ok === 1 ? "Archivo subido." : `${ok} archivos subidos.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "No se pudo subir el archivo." });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
      router.refresh();
    }
  };

  const remove = async (f: PedidoFileRow) => {
    if (!confirm(`¿Eliminar el archivo "${f.name}"?`)) return;
    setDeleting(f.id);
    const res = await deletePedidoFile(f.id);
    setDeleting(null);
    if ("error" in res) setMsg({ ok: false, text: res.error });
    else { setMsg({ ok: true, text: "Archivo eliminado." }); router.refresh(); }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}><Paperclip size={14} /> Archivos ({files.length})</h2>
      </div>

      <div
        className={`${styles.drop} ${drag ? styles.dropActive : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !busy) input.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) handleFiles(e.dataTransfer.files); }}
        aria-disabled={!!busy}
      >
        {busy ? (
          <div style={{ width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <Loader2 size={16} className={styles.spin} /> Subiendo {busy.name}… {busy.pct}%
            </div>
            <div className={styles.progress}><div style={{ width: `${busy.pct}%` }} /></div>
          </div>
        ) : (
          <>
            <Upload size={18} />
            <span>Arrastra aquí PDF o imágenes, o <strong>haz clic para elegir</strong> · máx. 10 MB</span>
          </>
        )}
        <input ref={input} type="file" hidden multiple accept="application/pdf,image/*" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {msg && <div className={msg.ok ? styles.msgOk : styles.msgErr} role="status">{msg.text}</div>}

      {files.length > 0 && (
        <div className={styles.list}>
          {files.map((f) => {
            const isImg = f.mimeType.startsWith("image/");
            const url = `/api/pedidos/files/${f.id}`;
            return (
              <div key={f.id} className={styles.file}>
                <div className={`${styles.fileIcon} ${isImg ? styles.fileIconImg : ""}`}>
                  {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
                </div>
                <div className={styles.fileMeta}>
                  <a href={url} target="_blank" rel="noopener" className={styles.fileName} title={f.name}>{f.name}</a>
                  <div className={styles.fileSub}>
                    {isImg ? "Imagen" : "PDF"} · {formatBytes(f.size)} · {new Date(f.createdAt).toLocaleDateString("es-PE")}
                  </div>
                </div>
                <div className={styles.fileActions}>
                  <a href={url} target="_blank" rel="noopener" className={styles.iconBtn} title="Abrir"><ExternalLink size={16} /></a>
                  <a href={`${url}?download=1`} className={styles.iconBtn} title="Descargar"><Download size={16} /></a>
                  <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Eliminar" onClick={() => remove(f)} disabled={deleting === f.id}>
                    {deleting === f.id ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
