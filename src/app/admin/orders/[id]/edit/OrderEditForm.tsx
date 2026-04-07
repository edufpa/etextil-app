"use client";

import { updateOrder } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash } from "lucide-react";

type OrderEditFormProps = {
  order: any;
  allSizes: any[];
  allColors: any[];
};

export default function OrderEditForm({ order, allSizes, allColors }: OrderEditFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState(order.totalQuantity);
  const [sizes, setSizes] = useState<{ size: string; quantity: number }[]>(
    order.sizes.map((s: any) => ({ size: s.size, quantity: s.quantity }))
  );

  const handleAddSize = () => setSizes([...sizes, { size: allSizes[0]?.name || "", quantity: 1 }]);
  const handleRemoveSize = (index: number) => setSizes(sizes.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const date = new Date(formData.get("date") as string);
    const garment = formData.get("garment") as string;
    const color = formData.get("color") as string;
    const notes = formData.get("notes") as string;

    const currentSum = sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (currentSum !== totalQuantity) {
      setError(`La suma de las tallas (${currentSum}) no coincide con la cantidad total (${totalQuantity}).`);
      setLoading(false);
      return;
    }

    const res = await updateOrder(order.id, {
      date, garment, color, totalQuantity, notes, sizes,
      services: order.services.map((s: any) => ({
        service_id: s.service_id,
        requiredQuantity: s.requiredQuantity,
        notes: s.notes || "",
        provider_id: s.provider_id ?? null,
      })),
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push(`/admin/orders/${order.id}`);
    }
  };

  return (
    <div className={styles.container} style={{ maxWidth: "700px" }}>
      <div className={styles.header}>
        <Link href={`/admin/orders/${order.id}`} className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver al Pedido
        </Link>
        <h1 className={styles.title}>Editar Pedido: {order.orderNumber}</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>1. Datos Generales</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Fecha *</label>
            <input name="date" type="date" required defaultValue={new Date(order.date).toISOString().split("T")[0]} />
          </div>
          <div className={styles.formGroup}>
            <label>Cantidad Total *</label>
            <input name="totalQuantity" type="number" required min="1" value={totalQuantity}
              onChange={(e) => setTotalQuantity(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Prenda *</label>
            <input name="garment" type="text" required defaultValue={order.garment} placeholder="Ej: Polo Básico" />
          </div>
          <div className={styles.formGroup}>
            <label>Color *</label>
            {allColors.length > 0 ? (
              <select name="color" required defaultValue={order.color}>
                {allColors.map((c: any) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input name="color" type="text" required defaultValue={order.color} />
            )}
          </div>
        </div>

        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>2. Desglose de Tallas</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sizes.map((s, index) => (
            <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Talla</label>
                {allSizes.length > 0 ? (
                  <select required value={s.size}
                    onChange={(e) => setSizes(sizes.map((sz, i) => i === index ? { ...sz, size: e.target.value } : sz))}>
                    {allSizes.map((sz: any) => (
                      <option key={sz.id} value={sz.name}>{sz.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" required value={s.size}
                    onChange={(e) => setSizes(sizes.map((sz, i) => i === index ? { ...sz, size: e.target.value } : sz))} />
                )}
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Cantidad</label>
                <input type="number" required min="1" value={s.quantity}
                  onChange={(e) => setSizes(sizes.map((sz, i) => i === index ? { ...sz, quantity: Number(e.target.value) } : sz))} />
              </div>
              {sizes.length > 1 && (
                <button type="button" onClick={() => handleRemoveSize(index)} className={styles.deleteBtn} style={{ padding: "0.75rem" }}>
                  <Trash size={18} />
                </button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
            <button type="button" onClick={handleAddSize} style={{ background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
              <Plus size={16} /> Agregar talla
            </button>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: sizes.reduce((a, s) => a + s.quantity, 0) === totalQuantity ? "green" : "orange" }}>
              Suma: {sizes.reduce((a, s) => a + s.quantity, 0)} / {totalQuantity}
            </span>
          </div>
        </div>

        <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
          <label>Observaciones</label>
          <textarea name="notes" rows={2} defaultValue={order.notes || ""} />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
