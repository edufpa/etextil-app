import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Wallet } from "lucide-react";
import styles from "../../services/services.module.css";
import { companyFilter } from "@/lib/company";
import { osStatus } from "@/lib/service-orders";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ provider?: string; saldo?: string; saldo_form?: string }>;

const money = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type OsRow = {
  id: number;
  osNumber: string;
  orderId: number;
  orderNumber: string;
  service: string;
  date: Date;
  status: string;
  sent: number;
  received: number;
  price: number | null;
};

export default async function CuentasPorPagarPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();
  const providerId = params.provider ? parseInt(params.provider, 10) : null;
  // Por defecto solo talleres con saldo; si se envió el filtro, manda el checkbox.
  const onlyWithBalance = params.saldo_form ? params.saldo === "1" : true;

  const [orders, providers] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: { voidedAt: null, provider: { ...filter }, ...(providerId ? { provider_id: providerId } : {}) },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      include: {
        provider: { select: { id: true, businessName: true } },
        orderService: { select: { service: { select: { name: true } }, order: { select: { id: true, orderNumber: true } } } },
        lines: { select: { size: true, quantity: true, unitPrice: true, incomings: { select: { quantity: true } } } },
      },
    }),
    prisma.provider.findMany({ where: { status: true, ...filter }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
  ]);

  const byProvider = new Map<number, { name: string; rows: OsRow[] }>();
  for (const so of orders) {
    const sent = so.lines.reduce((a, l) => a + l.quantity, 0);
    const received = so.lines.reduce((a, l) => a + l.incomings.reduce((s, i) => s + i.quantity, 0), 0);
    const priced = so.lines.find((l) => l.unitPrice !== null);
    const row: OsRow = {
      id: so.id,
      osNumber: so.osNumber,
      orderId: so.orderService.order.id,
      orderNumber: so.orderService.order.orderNumber,
      service: so.orderService.service.name,
      date: so.date,
      status: osStatus(so, so.lines),
      sent,
      received,
      price: priced ? Number(priced.unitPrice) : null,
    };
    if (!byProvider.has(so.provider.id)) byProvider.set(so.provider.id, { name: so.provider.businessName, rows: [] });
    byProvider.get(so.provider.id)!.rows.push(row);
  }

  const val = (r: OsRow, qty: number) => (r.price ?? 0) * qty;
  const groups = [...byProvider.entries()]
    .map(([id, g]) => ({
      id,
      name: g.name,
      rows: g.rows,
      earned: g.rows.reduce((a, r) => a + val(r, r.received), 0),
      toReceive: g.rows.reduce((a, r) => a + val(r, r.sent - r.received), 0),
      total: g.rows.reduce((a, r) => a + val(r, r.sent), 0),
      noPrice: g.rows.filter((r) => r.price === null).length,
    }))
    .filter((g) => !onlyWithBalance || g.earned > 0 || g.toReceive > 0 || g.noPrice > 0)
    .sort((a, b) => b.earned - a.earned || a.name.localeCompare(b.name, "es"));

  const totalEarned = groups.reduce((a, g) => a + g.earned, 0);
  const totalToReceive = groups.reduce((a, g) => a + g.toReceive, 0);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Wallet size={22} /> Cuentas por pagar a talleres
        </h1>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.25rem 0 1rem" }}>
        Por pagar = lo ya recibido del taller × el precio de cada Orden de Servicio. Lo aún no recibido se muestra aparte como compromiso.
      </p>

      <form method="get" style={{ display: "flex", gap: "0.75rem", alignItems: "end", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Taller
          <select name="provider" defaultValue={providerId ?? ""}>
            <option value="">Todos</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.businessName}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
          <input type="checkbox" name="saldo" value="1" defaultChecked={onlyWithBalance} /> Solo con saldo
        </label>
        <input type="hidden" name="saldo_form" value="1" />
        <button type="submit" style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius)", border: "none", background: "var(--primary)", color: "white", fontWeight: 600, cursor: "pointer" }}>
          Filtrar
        </button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>POR PAGAR (recibido)</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{money(totalEarned)}</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>COMPROMETIDO (en taller)</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "orange" }}>{money(totalToReceive)}</div>
        </div>
      </div>

      {groups.length === 0 && <div style={{ color: "var(--text-muted)" }}>No hay órdenes de servicio con saldo.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {groups.map((g) => (
          <details key={g.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)" }}>
            <summary style={{ cursor: "pointer", padding: "0.9rem 1.1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ flex: 1, minWidth: "160px" }}>{g.name}</strong>
              {g.noPrice > 0 && <span style={{ fontSize: "0.72rem", background: "#fef3c7", color: "#92400e", borderRadius: "999px", padding: "2px 8px", fontWeight: 700 }}>{g.noPrice} OS sin tarifa</span>}
              <span style={{ fontSize: "0.85rem" }}>Por pagar: <strong>{money(g.earned)}</strong></span>
              <span style={{ fontSize: "0.85rem", color: "orange" }}>Comprometido: <strong>{money(g.toReceive)}</strong></span>
            </summary>
            <div style={{ overflowX: "auto", padding: "0 1.1rem 1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.4rem" }}>OS</th><th style={{ padding: "0.4rem" }}>OP</th><th style={{ padding: "0.4rem" }}>Servicio</th>
                    <th style={{ padding: "0.4rem", textAlign: "center" }}>Enviado</th><th style={{ padding: "0.4rem", textAlign: "center" }}>Recibido</th>
                    <th style={{ padding: "0.4rem", textAlign: "right" }}>Precio</th><th style={{ padding: "0.4rem", textAlign: "right" }}>Por pagar</th><th style={{ padding: "0.4rem" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "0.45rem 0.4rem", fontWeight: 700 }}>{r.osNumber}</td>
                      <td style={{ padding: "0.45rem 0.4rem" }}><Link href={`/admin/orders/${r.orderId}`} style={{ color: "var(--primary)" }}>{r.orderNumber}</Link></td>
                      <td style={{ padding: "0.45rem 0.4rem" }}>{r.service}</td>
                      <td style={{ padding: "0.45rem 0.4rem", textAlign: "center" }}>{r.sent}</td>
                      <td style={{ padding: "0.45rem 0.4rem", textAlign: "center", color: "green", fontWeight: 600 }}>{r.received}</td>
                      <td style={{ padding: "0.45rem 0.4rem", textAlign: "right" }}>{r.price !== null ? money(r.price) : "—"}</td>
                      <td style={{ padding: "0.45rem 0.4rem", textAlign: "right", fontWeight: 700 }}>{r.price !== null ? money(val(r, r.received)) : "—"}</td>
                      <td style={{ padding: "0.45rem 0.4rem" }}>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
