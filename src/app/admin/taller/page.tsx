import { prisma } from "@/lib/prisma";
import { companyFilter, canAccessCompany } from "@/lib/company";
import { compareSizes } from "@/lib/sizes";
import TallerClient, { TallerRow } from "./TallerClient";
import styles from "./taller.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ provider?: string }>;

export default async function TallerPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = await companyFilter();
  const providerId = params.provider ? parseInt(params.provider, 10) : null;

  const providers = await prisma.provider.findMany({
    where: { status: true, ...filter },
    orderBy: { businessName: "asc" },
    select: { id: true, businessName: true },
  });

  let rows: TallerRow[] = [];
  let providerName = "";
  if (providerId && !isNaN(providerId)) {
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { businessName: true, company_id: true } });
    if (provider && (await canAccessCompany(provider.company_id))) {
      providerName = provider.businessName;
      const deliveries = await prisma.providerDelivery.findMany({
        where: { provider_id: providerId, orderService: { order: { ...filter, status: { notIn: ["CANCELADO"] } } } },
        select: {
          size: true,
          quantity: true,
          orderService_id: true,
          serviceOrder: { select: { osNumber: true, voidedAt: true } },
          incomings: { select: { quantity: true } },
          orderService: {
            select: {
              service: { select: { name: true } },
              order: { select: { id: true, orderNumber: true, garment: true, color: true, client: { select: { name: true } } } },
            },
          },
        },
      });

      const map = new Map<number, TallerRow>();
      for (const d of deliveries) {
        let row = map.get(d.orderService_id);
        if (!row) {
          const o = d.orderService.order;
          row = {
            orderServiceId: d.orderService_id,
            orderId: o.id,
            orderNumber: o.orderNumber,
            garment: o.garment,
            color: o.color,
            client: o.client?.name ?? "",
            service: d.orderService.service.name,
            osNumbers: [],
            cells: [],
          };
          map.set(d.orderService_id, row);
        }
        const osn = d.serviceOrder?.osNumber;
        if (osn && !row.osNumbers.includes(osn)) row.osNumbers.push(osn);
        const size = d.size ?? "";
        let cell = row.cells.find((c) => c.size === size);
        if (!cell) { cell = { size, sent: 0, received: 0 }; row.cells.push(cell); }
        cell.sent += d.quantity;
        cell.received += d.incomings.reduce((a, i) => a + i.quantity, 0);
      }
      rows = [...map.values()]
        .filter((r) => r.cells.some((c) => c.sent - c.received > 0))
        .map((r) => ({ ...r, cells: r.cells.sort((a, b) => compareSizes(a.size, b.size)) }))
        .sort((a, b) => b.orderNumber.localeCompare(a.orderNumber, "es", { numeric: true }) || a.service.localeCompare(b.service, "es"));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Taller por proveedor</h1>
        <p className={styles.subtitle}>Registra en un solo paso todo lo que devolvió el taller.</p>
      </div>
      <TallerClient
        key={providerId ?? 0}
        providers={providers}
        providerId={providerId}
        providerName={providerName}
        rows={rows}
      />
    </div>
  );
}
