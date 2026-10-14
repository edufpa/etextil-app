import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Send, Search } from "lucide-react";
import { companyFilter } from "@/lib/company";
import { osStatus } from "@/lib/service-orders";
import { PageHeader, Card, StatGrid, Stat, StatusPill, ProgressBar, EmptyState } from "@/components/ui";
import styles from "../services/services.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ estado?: string; provider?: string; q?: string }>;

const TABS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "abiertas", label: "Abiertas", match: (s) => s === "EMITIDA" || s === "PARCIAL" },
  { key: "completas", label: "Completas", match: (s) => s === "COMPLETA" },
  { key: "anuladas", label: "Anuladas", match: (s) => s === "ANULADA" },
  { key: "todas", label: "Todas", match: () => true },
];

const money = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d: Date) => d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default async function ServiceOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();
  const tab = TABS.find((t) => t.key === params.estado) ?? TABS[0];
  const providerId = params.provider ? parseInt(params.provider, 10) : null;
  const q = (params.q ?? "").trim().toLowerCase();

  const [rowsRaw, providers] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: { provider: { ...filter }, ...(providerId ? { provider_id: providerId } : {}) },
      orderBy: [{ id: "desc" }],
      take: 600,
      include: {
        provider: { select: { businessName: true } },
        orderService: { select: { service: { select: { name: true } }, order: { select: { id: true, orderNumber: true, garment: true, color: true, client: { select: { name: true } } } } } },
        lines: { select: { size: true, quantity: true, unitPrice: true, incomings: { select: { quantity: true } } } },
      },
    }),
    prisma.provider.findMany({ where: { status: true, ...filter }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const all = rowsRaw.map((so) => {
    const sent = so.lines.reduce((a, l) => a + l.quantity, 0);
    const received = so.lines.reduce((a, l) => a + l.incomings.reduce((s, i) => s + i.quantity, 0), 0);
    const priced = so.lines.find((l) => l.unitPrice !== null);
    const price = priced ? Number(priced.unitPrice) : null;
    const status = osStatus(so, so.lines);
    const late = !!so.dueDate && (status === "EMITIDA" || status === "PARCIAL") && so.dueDate.toISOString().slice(0, 10) < today;
    return { so, sent, received, price, status, late, op: so.orderService.order };
  });

  const counts = Object.fromEntries(TABS.map((t) => [t.key, all.filter((r) => t.match(r.status)).length]));
  const rows = all
    .filter((r) => tab.match(r.status))
    .filter((r) => !q || [r.so.osNumber, r.op.orderNumber, r.op.client.name, r.op.garment, r.so.provider.businessName, r.so.orderService.service.name].some((v) => v.toLowerCase().includes(q)));

  const open = all.filter((r) => r.status === "EMITIDA" || r.status === "PARCIAL");
  const inShop = open.reduce((a, r) => a + (r.sent - r.received), 0);
  const late = open.filter((r) => r.late).length;
  const committed = open.reduce((a, r) => a + (r.price ?? 0) * (r.sent - r.received), 0);

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { estado: tab.key, provider: providerId ? String(providerId) : undefined, q: params.q, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/os?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        icon={Send}
        title="Órdenes de Servicio"
        subtitle="Lo que se envía a los talleres: una OS por taller, servicio y OP."
        breadcrumbs={[{ label: "Producción" }, { label: "Órdenes de Servicio" }]}
        actions={<Link href="/admin/orders" className={styles.newButton}>Emitir desde una OP</Link>}
      />

      <StatGrid>
        <Stat label="OS abiertas" value={open.length} tone="primary" hint="emitidas o parciales" />
        <Stat label="Prendas en taller" value={inShop.toLocaleString("es-PE")} tone="info" hint="enviadas, aún sin recibir" />
        <Stat label="Atrasadas" value={late} tone={late > 0 ? "danger" : "success"} hint="pasaron su fecha de entrega" />
        <Stat label="Comprometido" value={money(committed)} tone="warning" hint="por recibir × tarifa" />
      </StatGrid>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href({ estado: t.key })}
              className={tab.key === t.key ? "btn btn-primary" : "btn btn-secondary"}
              style={{ height: 34 }}
            >
              {t.label} <span style={{ opacity: 0.75 }}>{counts[t.key]}</span>
            </Link>
          ))}
        </div>
        <form method="get" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input type="hidden" name="estado" value={tab.key} />
          <select name="provider" defaultValue={providerId ?? ""} aria-label="Taller">
            <option value="">Todos los talleres</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}
          </select>
          <input name="q" defaultValue={params.q ?? ""} placeholder="Buscar OS, OP, cliente…" aria-label="Buscar" />
          <button type="submit" className="btn btn-secondary"><Search size={15} /> Buscar</button>
        </form>
      </div>

      <Card flush>
        {rows.length === 0 ? (
          <EmptyState icon={Send} title="No hay órdenes de servicio aquí">
            Cambia el filtro o emite una nueva OS desde el detalle de una OP.
          </EmptyState>
        ) : (
          <div className={styles.tableContainer} style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>OS</th><th>OP</th><th>Servicio / Taller</th><th>Fechas</th>
                  <th style={{ minWidth: 150 }}>Avance</th><th style={{ textAlign: "right" }}>Total</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ so, sent, received, price, status, late: isLate, op }) => (
                  <tr key={so.id} style={status === "ANULADA" ? { opacity: 0.55 } : undefined}>
                    <td><Link href={`/admin/orders/${op.id}#os-${so.id}`} style={{ fontWeight: 800, color: "var(--primary-700)" }}>{so.osNumber}</Link></td>
                    <td>
                      <Link href={`/admin/orders/${op.id}`} style={{ fontWeight: 700 }}>{op.orderNumber}</Link>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{op.garment} · {op.color}</div>
                    </td>
                    <td>
                      <strong>{so.orderService.service.name}</strong>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{so.provider.businessName}</div>
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {day(so.date)}
                      {so.dueDate && (
                        <div style={{ fontSize: "0.74rem", color: isLate ? "var(--danger)" : "var(--text-muted)", fontWeight: isLate ? 700 : 400 }}>
                          Entrega {day(so.dueDate)}{isLate ? " · atrasada" : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      {status === "ANULADA" ? "—" : (
                        <>
                          <ProgressBar max={sent} segments={[{ value: received, tone: received >= sent ? "success" : "primary" }]} />
                          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>{received} / {sent} u</div>
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {status !== "ANULADA" && price !== null ? money(price * sent) : "—"}
                    </td>
                    <td><StatusPill status={status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
