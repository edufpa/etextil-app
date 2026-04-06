"use client";

import { createGuide } from "@/app/actions/guides";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Package, Trash } from "lucide-react";

export default function GuideForm({ pendingOrders }: { pendingOrders: any[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // details: order_id, deliveredQuantity
  const [details, setDetails] = useState<{ order_id: number, deliveredQuantity: number }[]>([]);

  const handleAddDetail = () => {
    if (pendingOrders.length === 0) return;
    setDetails([...details, { order_id: pendingOrders[0].id, deliveredQuantity: 1 }]);
  };
  const handleRemoveDetail = (index: number) => setDetails(details.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const sunatNumber = formData.get("sunatNumber") as string;
    const date = new Date(formData.get("date") as string);
    const notes = formData.get("notes") as string;

    const res = await createGuide({ sunatNumber, date, notes, details });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/guides");
    }
  };

  return (
    <div className={styles.container} style={{ maxWidth: "800px" }}>
      <div className={styles.header}>
        <Link href="/admin/guides" className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver
        </Link>
        <h1 className={styles.title}>Registrar Guía SUNAT</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>N° Guía SUNAT *</label>
            <input name="sunatNumber" type="text" required placeholder="Ej: T001-000456" />
          </div>
          <div className={styles.formGroup}>
            <label>Fecha Emisión *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
          </div>
        </div>

        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>Pedidos e Ítems a Entregar</h3>
        
        {pendingOrders.length === 0 ? (
          <div className={styles.error} style={{ background: "var(--bg-color)", color: "var(--text-muted)", border: "none" }}>
            No hay pedidos con saldo pendiente registrados.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {details.map((det, index) => {
              const selectedOrder = pendingOrders.find(o => o.id === det.order_id);
              const maxAllowed = selectedOrder ? selectedOrder.pending : 1;

              return (
                <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", padding: "1rem", background: "var(--bg-color)", borderRadius: "var(--radius)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                     <Package size={20} />
                  </div>
                  
                  <div className={styles.formGroup} style={{ flex: 2 }}>
                    <label>Seleccionar Pedido</label>
                    <select 
                      required 
                      value={det.order_id}
                      onChange={(e) => {
                        const newOrderId = Number(e.target.value);
                        const newOrder = pendingOrders.find(o => o.id === newOrderId);
                        setDetails(details.map((d, i) => i === index ? { ...d, order_id: newOrderId, deliveredQuantity: newOrder ? newOrder.pending : 1 } : d));
                      }}
                    >
                      {pendingOrders.map(po => <option key={po.id} value={po.id}>{po.orderNumber} - {po.garment} {po.color} (Pendientes: {po.pending})</option>)}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Cant. a Entregar</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      max={maxAllowed}
                      value={det.deliveredQuantity}
                      onChange={(e) => setDetails(details.map((d, i) => i === index ? { ...d, deliveredQuantity: Number(e.target.value) } : d))}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Máx: {maxAllowed}</span>
                  </div>

                  <button type="button" onClick={() => handleRemoveDetail(index)} className={styles.deleteBtn} style={{ padding: "0.75rem", marginBottom: "1.25rem" }}>
                    <Trash size={18} />
                  </button>
                </div>
              );
            })}
            
            <button type="button" onClick={handleAddDetail} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, marginTop: "0.5rem" }}>
              <Plus size={16} /> Añadir Ítem a la Guía
            </button>
          </div>
        )}

        <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
          <label>Observaciones</label>
          <textarea name="notes" rows={2} />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading || pendingOrders.length === 0 || details.length === 0} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Grabando..." : "Guardar Guía y Descontar Saldos"}
          </button>
        </div>
      </form>
    </div>
  );
}
