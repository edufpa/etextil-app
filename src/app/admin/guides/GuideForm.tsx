"use client";

import { createGuide } from "@/app/actions/guides";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Package, Trash } from "lucide-react";

type PendingOrder = {
  id: number;
  orderNumber: string;
  garment: string;
  color: string;
  client: { name: string };
  sizes: { size: string; quantity: number; delivered: number }[];
};

export default function GuideForm({ pendingOrders }: { pendingOrders: PendingOrder[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cada ítem: order_id + un array de { size, deliveredQuantity }
  const [items, setItems] = useState<{
    order_id: number;
    sizeDeliveries: { size: string; deliveredQuantity: number; maxAllowed: number }[];
  }[]>([]);

  const handleAddOrder = () => {
    if (pendingOrders.length === 0) return;
    const po = pendingOrders[0];
    setItems([...items, buildItem(po)]);
  };

  const buildItem = (po: PendingOrder) => ({
    order_id: po.id,
    sizeDeliveries: po.sizes.map(s => ({
      size: s.size,
      deliveredQuantity: 0,
      maxAllowed: s.quantity - s.delivered,
    })),
  });

  const handleChangeOrder = (itemIndex: number, newOrderId: number) => {
    const po = pendingOrders.find(o => o.id === newOrderId)!;
    setItems(items.map((it, i) => i === itemIndex ? buildItem(po) : it));
  };

  const handleChangeSizeQty = (itemIndex: number, sizeIndex: number, value: number) => {
    setItems(items.map((it, i) => {
      if (i !== itemIndex) return it;
      return {
        ...it,
        sizeDeliveries: it.sizeDeliveries.map((sd, j) =>
          j === sizeIndex ? { ...sd, deliveredQuantity: value } : sd
        ),
      };
    }));
  };

  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const sunatNumber = formData.get("sunatNumber") as string;
    const date = new Date(formData.get("date") as string);
    const notes = formData.get("notes") as string;

    // Aplanar: un GuideDetail por cada talla con qty > 0
    const details: { order_id: number; size: string; deliveredQuantity: number }[] = [];
    for (const item of items) {
      for (const sd of item.sizeDeliveries) {
        if (sd.deliveredQuantity > 0) {
          details.push({ order_id: item.order_id, size: sd.size, deliveredQuantity: sd.deliveredQuantity });
        }
      }
    }

    if (details.length === 0) {
      setError("Debes entregar al menos 1 prenda en alguna talla.");
      setLoading(false);
      return;
    }

    const res = await createGuide({ sunatNumber, date, notes, details });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/guides");
    }
  };

  return (
    <div className={styles.container} style={{ maxWidth: "900px" }}>
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

        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>
          Pedidos a Incluir (por Talla)
        </h3>

        {pendingOrders.length === 0 ? (
          <div className={styles.error} style={{ background: "var(--bg-color)", color: "var(--text-muted)", border: "none" }}>
            No hay pedidos con saldo pendiente.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {items.map((item, itemIndex) => {
              const selectedOrder = pendingOrders.find(o => o.id === item.order_id)!;
              const totalInItem = item.sizeDeliveries.reduce((a, sd) => a + sd.deliveredQuantity, 0);

              return (
                <div key={itemIndex} style={{ border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem", background: "var(--bg-color)" }}>
                  {/* Selector de pedido */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    <Package size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Pedido</label>
                      <select
                        value={item.order_id}
                        onChange={(e) => handleChangeOrder(itemIndex, Number(e.target.value))}
                        style={{ width: "100%" }}
                      >
                        {pendingOrders.map(po => (
                          <option key={po.id} value={po.id}>
                            {po.orderNumber} — {po.client.name} · {po.garment} {po.color}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(itemIndex)} className={styles.deleteBtn} style={{ padding: "0.5rem" }}>
                      <Trash size={18} />
                    </button>
                  </div>

                  {/* Tabla de tallas */}
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <th style={{ textAlign: "left", padding: "0.5rem" }}>Talla</th>
                        <th style={{ textAlign: "center", padding: "0.5rem" }}>Pedidas</th>
                        <th style={{ textAlign: "center", padding: "0.5rem" }}>Ya entregadas</th>
                        <th style={{ textAlign: "center", padding: "0.5rem" }}>Saldo</th>
                        <th style={{ textAlign: "center", padding: "0.5rem" }}>A entregar ahora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.sizeDeliveries.map((sd, sizeIndex) => {
                        const originalSize = selectedOrder.sizes.find(s => s.size === sd.size);
                        const pedidas = originalSize?.quantity || 0;
                        const yaEntregadas = originalSize?.delivered || 0;
                        return (
                          <tr key={sizeIndex} style={{ borderTop: "1px solid var(--card-border)" }}>
                            <td style={{ padding: "0.5rem", fontWeight: 600 }}>{sd.size}</td>
                            <td style={{ padding: "0.5rem", textAlign: "center" }}>{pedidas}</td>
                            <td style={{ padding: "0.5rem", textAlign: "center", color: "green" }}>{yaEntregadas}</td>
                            <td style={{ padding: "0.5rem", textAlign: "center", color: sd.maxAllowed === 0 ? "#888" : "orange", fontWeight: 600 }}>
                              {sd.maxAllowed}
                            </td>
                            <td style={{ padding: "0.5rem", textAlign: "center" }}>
                              <input
                                type="number"
                                min="0"
                                max={sd.maxAllowed}
                                value={sd.deliveredQuantity}
                                disabled={sd.maxAllowed === 0}
                                onChange={(e) => handleChangeSizeQty(itemIndex, sizeIndex, Number(e.target.value))}
                                style={{ width: "80px", textAlign: "center", opacity: sd.maxAllowed === 0 ? 0.4 : 1 }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--card-border)", fontWeight: 700 }}>
                        <td colSpan={4} style={{ padding: "0.5rem", textAlign: "right", color: "var(--text-muted)" }}>Total a entregar en esta guía:</td>
                        <td style={{ padding: "0.5rem", textAlign: "center", color: totalInItem > 0 ? "var(--primary)" : "var(--text-muted)", fontSize: "1.1rem" }}>
                          {totalInItem}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddOrder}
              style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}
            >
              <Plus size={16} /> Añadir Pedido a la Guía
            </button>
          </div>
        )}

        <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
          <label>Observaciones</label>
          <textarea name="notes" rows={2} />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading || pendingOrders.length === 0 || items.length === 0} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar Guía y Descontar Saldos"}
          </button>
        </div>
      </form>
    </div>
  );
}
