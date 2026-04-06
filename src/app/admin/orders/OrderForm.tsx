"use client";

import { createOrder } from "@/app/actions/orders";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "../services/form.module.css";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Scissors, Trash } from "lucide-react";

type ServiceEntry = {
  checked: boolean;
  quantity: number;
  manuallyEdited: boolean;
};

export default function OrderForm({
  clients,
  allServices,
  defaultServices,
  configuredSizes,
  configuredColors,
}: {
  clients: any[];
  allServices: any[];
  defaultServices: any[];
  configuredSizes: string[];
  configuredColors: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState([{ size: "", quantity: 1 }]);
  const [totalQuantity, setTotalQuantity] = useState(0);

  // Service map: service_id -> { checked, quantity, manuallyEdited }
  const [serviceMap, setServiceMap] = useState<Record<number, ServiceEntry>>(() => {
    const initial: Record<number, ServiceEntry> = {};
    allServices.forEach((s) => {
      initial[s.id] = {
        checked: false,  // all unchecked by default
        quantity: 1,
        manuallyEdited: false,
      };
    });
    return initial;
  });

  // When totalQuantity changes, update quantity of all non-manually-edited checked services
  useEffect(() => {
    if (totalQuantity <= 0) return;
    setServiceMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((idStr) => {
        const id = Number(idStr);
        if (!next[id].manuallyEdited) {
          next[id] = { ...next[id], quantity: totalQuantity };
        }
      });
      return next;
    });
  }, [totalQuantity]);

  const toggleService = (serviceId: number) => {
    setServiceMap((prev) => {
      const entry = prev[serviceId];
      const willCheck = !entry.checked;
      return {
        ...prev,
        [serviceId]: {
          ...entry,
          checked: willCheck,
          // When checking for the first time and not manually edited, set to totalQuantity
          quantity: willCheck && !entry.manuallyEdited && totalQuantity > 0
            ? totalQuantity
            : entry.quantity,
        },
      };
    });
  };

  const updateServiceQty = (serviceId: number, qty: number) => {
    setServiceMap((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], quantity: qty, manuallyEdited: true },
    }));
  };

  const handleAddSize = () => setSizes([...sizes, { size: "", quantity: 1 }]);
  const handleRemoveSize = (i: number) => setSizes(sizes.filter((_, idx) => idx !== i));

  const handleSizeChange = (index: number, field: "size" | "quantity", val: string | number) => {
    setSizes(sizes.map((sz, i) =>
      i === index ? { ...sz, [field]: field === "quantity" ? Number(val) : val } : sz
    ));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const client_id = Number(formData.get("client_id"));
    const date = new Date(formData.get("date") as string);
    const garment = formData.get("garment") as string;
    const color = formData.get("color") as string;
    const totalQ = Number(formData.get("totalQuantity"));
    const notes = formData.get("notes") as string;

    const currentSum = sizes.reduce((acc, curr) => acc + curr.quantity, 0);
    if (currentSum !== totalQ) {
      setError(`La suma de las tallas (${currentSum}) no coincide con la cantidad total (${totalQ}).`);
      setLoading(false);
      return;
    }

    const checkedServices = Object.entries(serviceMap)
      .filter(([, entry]) => entry.checked)
      .map(([idStr, entry]) => ({
        service_id: Number(idStr),
        requiredQuantity: entry.quantity,
        notes: "",
        sizeSplit: [],
      }));

    const res = await createOrder({
      client_id,
      date,
      garment,
      color,
      totalQuantity: totalQ,
      notes,
      sizes,
      services: checkedServices,
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
        <h1 className={styles.title}>Nuevo Pedido</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
          1. Datos Generales
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Número de Pedido</label>
            <input type="text" value="Se genera automáticamente (NP correlativo)" disabled />
          </div>
          <div className={styles.formGroup}>
            <label>Fecha *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Cliente *</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select name="client_id" required style={{ flex: 1 }}>
              <option value="">Selecciona un cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Link
              href="/admin/clients/new"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.backBtn}
              style={{ whiteSpace: "nowrap", padding: "0.6rem 0.75rem" }}
            >
              <Plus size={16} />
              Nuevo cliente
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label>Prenda *</label>
            <input name="garment" type="text" required placeholder="Ej: Polo Básico" />
          </div>
          <div className={styles.formGroup}>
            <label>Color *</label>
            <select name="color" required>
              <option value="">Selecciona color</option>
              {configuredColors.map((colorName) => (
                <option key={colorName} value={colorName}>{colorName}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Cantidad Total *</label>
            <input
              name="totalQuantity"
              type="number"
              required
              min="1"
              value={totalQuantity || ""}
              onChange={(e) => setTotalQuantity(Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>

        {/* TALLAS */}
        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>
          2. Desglose de Tallas{" "}
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
            (suma = cantidad total)
          </span>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sizes.map((s, index) => (
            <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Talla</label>
                <select
                  required
                  value={s.size}
                  onChange={(e) => handleSizeChange(index, "size", e.target.value)}
                >
                  <option value="">Selecciona talla</option>
                  {configuredSizes.map((sizeName) => (
                    <option key={sizeName} value={sizeName}>{sizeName}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Cantidad</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={s.quantity}
                  onChange={(e) => handleSizeChange(index, "quantity", Number(e.target.value))}
                />
              </div>
              {sizes.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSize(index)}
                  className={styles.deleteBtn}
                  style={{ padding: "0.75rem" }}
                >
                  <Trash size={18} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddSize}
            style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, marginTop: "0.5rem" }}
          >
            <Plus size={16} /> Agregar otra talla
          </button>
        </div>

        {/* SERVICIOS — checkboxes */}
        <h3 style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", marginTop: "1rem" }}>
          3. Servicios de Producción
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400, marginLeft: "0.5rem" }}>
            (activa los que aplican)
          </span>
        </h3>

        {allServices.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No hay servicios configurados.{" "}
            <Link href="/admin/services/new" style={{ color: "var(--primary)" }}>Crear servicio</Link>
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {allServices.map((svc) => {
              const entry = serviceMap[svc.id] ?? { checked: false, quantity: totalQuantity || 1, manuallyEdited: false };
              return (
                <label
                  key={svc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.65rem 0.9rem",
                    borderRadius: "var(--radius)",
                    border: `1px solid ${entry.checked ? "var(--primary)" : "var(--card-border)"}`,
                    background: entry.checked ? "rgba(99,102,241,0.06)" : "var(--bg-color)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={entry.checked}
                    onChange={() => toggleService(svc.id)}
                    style={{ accentColor: "var(--primary)", width: "16px", height: "16px", flexShrink: 0 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                    <Scissors size={14} style={{ color: entry.checked ? "var(--primary)" : "var(--text-muted)", flexShrink: 0 }} />
                    <span style={{ fontWeight: entry.checked ? 700 : 400, fontSize: "0.9rem" }}>
                      {svc.name}
                    </span>
                    {svc.type && (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "var(--card-bg)", padding: "1px 6px", borderRadius: "999px", border: "1px solid var(--card-border)" }}>
                        {svc.type}
                      </span>
                    )}
                  </div>
                  {entry.checked && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        Cant.:
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={entry.quantity}
                        onChange={(e) => updateServiceQty(svc.id, Number(e.target.value))}
                        style={{ width: "72px", textAlign: "center", fontWeight: 700 }}
                      />
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        )}

        <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
          <label>Observaciones del Pedido</label>
          <textarea name="notes" rows={2} />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            <Save size={18} />
            {loading ? "Guardando..." : "Crear Pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
