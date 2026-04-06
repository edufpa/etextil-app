"use client";

import { updateOrder } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Scissors, Trash } from "lucide-react";

type OrderEditFormProps = {
  order: any;
  allServices: any[];
  allSizes: any[];
  allColors: any[];
  allProviders: any[];
};

export default function OrderEditForm({ order, allServices, allSizes, allColors, allProviders }: OrderEditFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [sizes, setSizes] = useState<{ size: string; quantity: number }[]>(
    order.sizes.map((s: any) => ({ size: s.size, quantity: s.quantity }))
  );
  const [services, setServices] = useState<{ service_id: number; requiredQuantity: number; notes: string; provider_id: number | null }[]>(
    order.services.map((s: any) => ({ service_id: s.service_id, requiredQuantity: s.requiredQuantity, notes: s.notes || "", provider_id: s.provider_id ?? null }))
  );
  const [totalQuantity, setTotalQuantity] = useState(order.totalQuantity);

  const handleAddSize = () => setSizes([...sizes, { size: allSizes[0]?.name || "", quantity: 1 }]);
  const handleRemoveSize = (index: number) => setSizes(sizes.filter((_, i) => i !== index));
  const handleAddService = () => setServices([...services, { service_id: allServices[0]?.id || 0, requiredQuantity: 1, notes: "", provider_id: null }]);
  const handleRemoveService = (index: number) => setServices(services.filter((_, i) => i !== index));

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
      date, garment, color, totalQuantity, notes, sizes, services,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push(`/admin/orders/${order.id}`);
    }
  };

  return (
    <div className={styles.container} style={{ maxWidth: "800px" }}>
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
            <input
              name="totalQuantity"
              type="number"
              required
              min="1"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(Number(e.target.value))}
            />
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
              <input name="color" type="text" required defaultValue={order.color} placeholder="Ej: Negro" />
            )}
          </div>
        </div>

        {/* TALLAS */}
        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>2. Desglose de Tallas</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sizes.map((s, index) => (
            <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Talla</label>
                {allSizes.length > 0 ? (
                  <select
                    required
                    value={s.size}
                    onChange={(e) => setSizes(sizes.map((sz, i) => i === index ? { ...sz, size: e.target.value } : sz))}
                  >
                    {allSizes.map((sz: any) => (
                      <option key={sz.id} value={sz.name}>{sz.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ej: M"
                    value={s.size}
                    onChange={(e) => setSizes(sizes.map((sz, i) => i === index ? { ...sz, size: e.target.value } : sz))}
                  />
                )}
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Cantidad</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={s.quantity}
                  onChange={(e) => setSizes(sizes.map((sz, i) => i === index ? { ...sz, quantity: Number(e.target.value) } : sz))}
                />
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
            <span style={{ fontSize: "0.875rem", color: sizes.reduce((a, s) => a + s.quantity, 0) === totalQuantity ? "green" : "orange", fontWeight: 600 }}>
              Suma: {sizes.reduce((a, s) => a + s.quantity, 0)} / {totalQuantity}
            </span>
          </div>
        </div>

        {/* SERVICIOS */}
        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>3. Servicios de Producción</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {services.map((svc, index) => (
            <div key={index} style={{ background: "var(--bg-color)", padding: "1rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.75rem", background: "var(--primary-light)", color: "var(--primary)", borderRadius: "var(--radius)" }}>
                  <Scissors size={20} />
                </div>
                <div className={styles.formGroup} style={{ flex: 2, minWidth: "160px" }}>
                  <label>Servicio</label>
                  <select
                    required
                    value={svc.service_id}
                    onChange={(e) => setServices(services.map((s, i) => i === index ? { ...s, service_id: Number(e.target.value) } : s))}
                  >
                    {allServices.map((as: any) => (
                      <option key={as.id} value={as.id}>{as.name} ({as.type})</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup} style={{ flex: 1, minWidth: "80px" }}>
                  <label>Cantidad</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={svc.requiredQuantity}
                    onChange={(e) => setServices(services.map((s, i) => i === index ? { ...s, requiredQuantity: Number(e.target.value) } : s))}
                  />
                </div>
                <button type="button" onClick={() => handleRemoveService(index)} className={styles.deleteBtn} style={{ padding: "0.75rem" }}>
                  <Trash size={18} />
                </button>
              </div>
              <div className={styles.formGroup} style={{ marginTop: "0.75rem" }}>
                <label>Proveedor asignado (opcional)</label>
                <select
                  value={svc.provider_id ?? ""}
                  onChange={(e) => setServices(services.map((s, i) => i === index ? { ...s, provider_id: e.target.value ? Number(e.target.value) : null } : s))}
                >
                  <option value="">— Sin proveedor —</option>
                  {allProviders.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.businessName}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <button type="button" onClick={handleAddService} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, marginTop: "0.5rem" }}>
            <Plus size={16} /> Agregar servicio
          </button>
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
