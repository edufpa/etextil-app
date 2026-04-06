import { getOrderSummary } from "@/app/actions/orders";
import Link from "next/link";
import { ArrowLeft, Scissors, Package, CheckCircle } from "lucide-react";
import styles from "../../services/services.module.css";
import { notFound } from "next/navigation";
import CloseOrderButton from "./CloseOrderButton";

export const dynamic = 'force-dynamic';
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const orderId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(orderId)) return notFound();

  const order = await getOrderSummary(orderId);
  if (!order) return notFound();

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/orders" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className={styles.title}>Pedido: {order.orderNumber}</h1>
        </div>
        
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span className={styles.badge} style={{ fontSize: "1rem", padding: "0.5rem 1rem", background: order.status === 'CERRADO' ? '#333' : 'var(--primary)', color: 'white' }}>
            {order.status}
          </span>
          {order.status !== 'CERRADO' && order.status !== 'CANCELADO' && order.totalDelivered >= order.totalQuantity && (
            <CloseOrderButton id={order.id} />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginTop: "2rem" }}>
        {/* PANEL IZQUIERDO */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Datos Generales */}
          <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
            <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>Datos Generales</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Cliente:</strong><br/>{order.client.name}</div>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Fecha:</strong><br/>{order.date.toLocaleDateString()}</div>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Prenda:</strong><br/>{order.garment}</div>
              <div><strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Color:</strong><br/>{order.color}</div>
              <div style={{ gridColumn: "span 2" }}><strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Observaciones:</strong><br/>{order.notes || "—"}</div>
            </div>
          </div>

          {/* Tallas */}
          <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
            <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>Desglose de Tallas</h3>
            <table className={styles.table}>
              <thead><tr><th>Talla</th><th>Cantidad</th></tr></thead>
              <tbody>
                {order.sizes.map((s: any) => (
                  <tr key={s.id}>
                    <td><strong>{s.size}</strong></td>
                    <td>{s.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Servicios */}
          <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
            <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>Servicios de Producción</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {order.services.map((svc: any) => (
                <div key={svc.id} style={{ display: "flex", alignItems: "center", gap: "1rem", background: "var(--bg-color)", padding: "1rem", borderRadius: "var(--radius)" }}>
                  <div style={{ color: "var(--primary)" }}><Scissors size={24} /></div>
                  <div style={{ flex: 1 }}><strong>{svc.service.name}</strong> <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>({svc.service.type})</span></div>
                  <div style={{ fontWeight: 600, fontSize: "1.25rem" }}>× {svc.requiredQuantity}</div>
                </div>
              ))}
              {order.services.length === 0 && <span style={{ color: "var(--text-muted)" }}>No hay servicios asignados.</span>}
            </div>
          </div>

        </div>

        {/* PANEL DERECHO (Resumen de Entregas) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
            <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>Entregas y Saldos</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.125rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Solicitado:</span>
                <strong>{order.totalQuantity}</strong>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.125rem", color: "green" }}>
                <span>Total Entregado:</span>
                <strong>{order.totalDelivered}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", borderTop: "1px dashed var(--card-border)", paddingTop: "1rem", color: order.pending > 0 ? "orange" : "var(--text-muted)" }}>
                <span>Saldo Pendiente:</span>
                <strong>{order.pending}</strong>
              </div>

            </div>
          </div>

          {/* Historial de Guías */}
          <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
            <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>Guías SUNAT Asociadas</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {order.guides.map((gdetail: any) => (
                <div key={gdetail.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--card-border)" }}>
                  <Link href={`/admin/guides/${gdetail.guide.id}`} style={{ fontWeight: 600, color: "var(--primary)" }}>
                     Guía {gdetail.guide.sunatNumber}
                  </Link>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{gdetail.guide.date.toLocaleDateString()}</div>
                  <div style={{ fontWeight: 600, color: "green" }}>+ {gdetail.deliveredQuantity} entregados</div>
                </div>
              ))}
              {order.guides.length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No se han registrado entregas parciales.</span>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
