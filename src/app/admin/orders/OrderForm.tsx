"use client";

import { createOrder } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Scissors, Trash } from "lucide-react";

export default function OrderForm({ clients, allServices, defaultServices }: { clients: any[], allServices: any[], defaultServices: any[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [sizes, setSizes] = useState([{ size: "", quantity: 1 }]);
  const [services, setServices] = useState(
    defaultServices.map(s => ({ service_id: s.id, requiredQuantity: 1, notes: "" }))
  );
  
  const [totalQuantity, setTotalQuantity] = useState(0);

  const handleAddSize = () => setSizes([...sizes, { size: "", quantity: 1 }]);
  const handleRemoveSize = (index: number) => setSizes(sizes.filter((_, i) => i !== index));

  const handleAddService = () => setServices([...services, { service_id: allServices[0]?.id || 0, requiredQuantity: 1, notes: "" }]);
  const handleRemoveService = (index: number) => setServices(services.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const client_id = Number(formData.get("client_id"));
    const orderNumber = formData.get("orderNumber") as string;
    const date = new Date(formData.get("date") as string);
    const garment = formData.get("garment") as string;
    const color = formData.get("color") as string;
    const totalQ = Number(formData.get("totalQuantity"));
    const notes = formData.get("notes") as string;

    const currentSum = sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (currentSum !== totalQ) {
      setError(`La suma de las tallas (${currentSum}) no coincide con la cantidad total pedida (${totalQ}).`);
      setLoading(false);
      return;
    }

    const res = await createOrder({
      client_id, orderNumber, date, garment, color, totalQuantity: totalQ, notes,
      sizes, services
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin/orders");
    }
  };

  return (
    <div className={styles.container} style={{ maxWidth: "800px" }}>
      <div className={styles.header}>
        <Link href="/admin/orders" className={styles.backBtn}>
          <ArrowLeft size={18} />
          Volver
        </Link>
        <h1 className={styles.title}>Nuevo Pedido (Prenda/Color)</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        
        {/* BLOQUE 1: DATOS GENERALES */}
        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>1. Datos Generales</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Número de Pedido *</label>
            <input name="orderNumber" type="text" required placeholder="Ej: PED-2024-001" />
          </div>
          <div className={styles.formGroup}>
            <label>Fecha *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Cliente *</label>
          <select name="client_id" required>
            <option value="">Selecciona un cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Prenda *</label>
            <input name="garment" type="text" required placeholder="Ej: Polo Básico" />
          </div>
          <div className={styles.formGroup}>
            <label>Color *</label>
            <input name="color" type="text" required placeholder="Ej: Negro" />
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

        {/* BLOQUE 2: TALLAS */}
        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>2. Desglose de Tallas</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sizes.map((s, index) => (
            <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Talla</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: M"
                  value={s.size}
                  onChange={(e) => setSizes(sizes.map((sz, i) => i === index ? { ...sz, size: e.target.value } : sz))}
                />
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
          <button type="button" onClick={handleAddSize} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, marginTop: "0.5rem" }}>
            <Plus size={16} /> Agregar otra talla
          </button>
        </div>

        {/* BLOQUE 3: SERVICIOS */}
        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>3. Servicios de Producción Req.</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {services.map((svc, index) => (
            <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.75rem", background: "var(--primary-light)", color: "var(--primary)", borderRadius: "var(--radius)" }}>
                 <Scissors size={20} />
              </div>
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label>Servicio</label>
                <select 
                  required 
                  value={svc.service_id}
                  onChange={(e) => setServices(services.map((s, i) => i === index ? { ...s, service_id: Number(e.target.value) } : s))}
                >
                  {allServices.map(as => <option key={as.id} value={as.id}>{as.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Multiplicador</label>
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
          ))}
          <button type="button" onClick={handleAddService} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, marginTop: "0.5rem" }}>
            <Plus size={16} /> Agregar otro servicio
          </button>
        </div>

        <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
          <label>Observaciones del Pedido</label>
          <textarea name="notes" rows={2} />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Generando..." : "Crear Pedido Seguro"}
          </button>
        </div>
      </form>
    </div>
  );
}
