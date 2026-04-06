import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import styles from "../../services/services.module.css";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export default async function GuideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const guideId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(guideId)) return notFound();

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: {
      details: {
        include: { order: true }
      }
    }
  });

  if (!guide) return notFound();

  const totalLines = guide.details.length;
  const totalItemsDelivered = guide.details.reduce((acc: number, det: any) => acc + det.deliveredQuantity, 0);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/guides" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className={styles.title}>Guía SUNAT: {guide.sunatNumber}</h1>
        </div>
        
        <div>
          <span className={styles.badge} style={{ fontSize: "1rem", padding: "0.5rem 1rem", background: guide.status === 'ANULADA' ? 'var(--danger)' : 'var(--primary)', color: 'white' }}>
            {guide.status}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", marginTop: "2rem" }}>
        
        {/* PANEL IZQUIERDO: Info Guía */}
        <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)", height: "fit-content" }}>
          <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>Información del Documento</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Número de Guía:</strong>
              <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>{guide.sunatNumber}</div>
            </div>
            <div>
              <strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Fecha de Emisión:</strong>
              <div>{guide.date.toLocaleDateString()}</div>
            </div>
            <div>
              <strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Líneas / Pedidos afectados:</strong>
              <div>{totalLines} líneas de pedido</div>
            </div>
            <div>
              <strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Total Prendas Registradas:</strong>
              <div style={{ fontWeight: 600, color: "green" }}>{totalItemsDelivered} unid.</div>
            </div>
            <div>
              <strong style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Observaciones Generales:</strong>
              <div>{guide.notes || "—"}</div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Detalle de pedidos entregados */}
        <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
          <h3 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>Ítems Entregados</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {guide.details.map((det: any) => (
              <div key={det.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", border: "1px solid var(--card-border)", borderRadius: "var(--radius)" }}>
                <div style={{ color: "var(--primary)" }}><Package size={24} /></div>
                
                <div style={{ flex: 1 }}>
                  <Link href={`/admin/orders/${det.order.id}`} style={{ fontWeight: 600, color: "var(--foreground)" }}>
                    {det.order.orderNumber}
                  </Link>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {det.order.garment} ({det.order.color})
                  </div>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Cantidad entregada</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "green" }}>
                    + {det.deliveredQuantity}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
