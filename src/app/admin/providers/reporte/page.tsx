import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BarChart2, Truck } from "lucide-react";
import styles from "../../services/services.module.css";
import { companyFilter } from "@/lib/company";

export const dynamic = "force-dynamic";

type ServiceTotals = {
  sent: number;
  received: number;
  pending: number;
};

type ProviderRow = {
  providerId: number;
  businessName: string;
  sent: number;
  received: number;
  pending: number;
  services: Record<string, ServiceTotals>;
};

export default async function ProvidersGlobalReportPage() {
  const filter = await companyFilter();
  const [deliveries, openServicesByProvider] = await Promise.all([
    prisma.providerDelivery.findMany({
      include: {
        provider: { select: { id: true, businessName: true } },
        orderService: {
          include: {
            service: { select: { name: true, trackBySize: true } },
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
      where: { provider: { ...filter } },
      orderBy: { date: "desc" },
    }),
    prisma.orderService.findMany({
      where: { provider_id: { not: null }, provider: { ...filter } },
      include: {
        provider: { select: { businessName: true } },
        service: { select: { name: true } },
        deliveries: { select: { quantity: true } },
      },
    }),
  ]);

  const byProvider = new Map<number, ProviderRow>();

  for (const delivery of deliveries) {
    const providerId = delivery.provider.id as number;
    const serviceName = delivery.orderService.service.name as string;

    if (!byProvider.has(providerId)) {
      byProvider.set(providerId, {
        providerId,
        businessName: delivery.provider.businessName as string,
        sent: 0,
        received: 0,
        pending: 0,
        services: {},
      });
    }

    const providerRow = byProvider.get(providerId)!;
    providerRow.sent += delivery.quantity;
    providerRow.received += delivery.quantity;
    providerRow.pending += 0;

    if (!providerRow.services[serviceName]) {
      providerRow.services[serviceName] = { sent: 0, received: 0, pending: 0 };
    }
    providerRow.services[serviceName].sent += delivery.quantity;
    providerRow.services[serviceName].received += delivery.quantity;
    providerRow.services[serviceName].pending += 0;
  }

  for (const svc of openServicesByProvider) {
    if (!svc.provider_id) continue;
    if (!byProvider.has(svc.provider_id)) {
      byProvider.set(svc.provider_id, {
        providerId: svc.provider_id,
        businessName: svc.provider?.businessName || "Taller",
        sent: 0,
        received: 0,
        pending: 0,
        services: {},
      });
    }
    const delivered = svc.deliveries.reduce((sum, d) => sum + d.quantity, 0);
    const pending = Math.max(0, svc.requiredQuantity - delivered);
    const row = byProvider.get(svc.provider_id)!;
    row.pending += pending;
    const serviceName = svc.service.name;
    if (!row.services[serviceName]) {
      row.services[serviceName] = { sent: 0, received: 0, pending: 0 };
    }
    row.services[serviceName].pending += pending;
  }

  const reportRows = [...byProvider.values()].sort((a, b) => b.pending - a.pending);

  const totalSent = reportRows.reduce((sum, row) => sum + row.sent, 0);
  const totalReceived = reportRows.reduce((sum, row) => sum + row.received, 0);
  const totalPending = reportRows.reduce((sum, row) => sum + row.pending, 0);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/providers" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>
            <BarChart2 size={22} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "var(--primary)" }} />
            Reporte Global por Taller
          </h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "1.5rem 0" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Enviado</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.25rem" }}>{totalSent}</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Recibido</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "green", marginTop: "0.25rem" }}>{totalReceived}</div>
        </div>
        <div style={{ background: totalPending > 0 ? "#fff3e0" : "var(--card-bg)", border: `1px solid ${totalPending > 0 ? "orange" : "var(--card-border)"}`, borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>En Proceso</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: totalPending > 0 ? "orange" : "var(--text-muted)", marginTop: "0.25rem" }}>{totalPending}</div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {reportRows.length === 0 ? (
          <div className={styles.emptyState}>No hay trabajos registrados en talleres.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Taller</th>
                <th style={{ textAlign: "center" }}>Enviado</th>
                <th style={{ textAlign: "center" }}>Recibido</th>
                <th style={{ textAlign: "center" }}>En Proceso</th>
                <th>Servicios / Detalle</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => {
                const servicesSummary = Object.entries(row.services).sort((a, b) => b[1].received - a[1].received);
                const providerDeliveries = deliveries
                  .filter((d) => d.provider_id === row.providerId)
                  .slice(0, 5);

                return (
                  <tr key={row.providerId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Truck size={16} style={{ color: "var(--primary)" }} />
                        <strong>{row.businessName}</strong>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>{row.sent}</td>
                    <td style={{ textAlign: "center", color: "green", fontWeight: 700 }}>{row.received}</td>
                    <td style={{ textAlign: "center", color: row.pending > 0 ? "orange" : "var(--text-muted)", fontWeight: 800 }}>{row.pending}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <div>
                          {servicesSummary.map(([name, data]) => `${name}: ${data.received}`).join(" · ")}
                        </div>
                        {providerDeliveries.map((d) => (
                          <div key={d.id}>
                            Pedido {d.orderService.order.orderNumber} · {d.orderService.service.name} · {d.quantity} u.
                            {d.size ? ` · ${d.size}` : ""} · {new Date(d.date).toLocaleDateString()}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/providers/${row.providerId}/reporte`} className={styles.editBtn} style={{ fontSize: "0.8rem" }}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
