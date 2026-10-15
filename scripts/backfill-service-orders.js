/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Convierte las salidas al taller existentes (ProviderDelivery sin OS) en Órdenes de Servicio.
 * Agrupa por servicio de la OP + taller + día. Es idempotente: solo toca salidas con serviceOrder_id nulo,
 * así que puede correr en cada deploy. No cambia cantidades ni borra nada.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const pad = (n) => `OS-${String(n).padStart(4, "0")}`;
const parse = (s) => {
  const m = /^OS-?0*(\d+)$/i.exec(s || "");
  return m ? Number(m[1]) : 0;
};

async function main() {
  const orphans = await prisma.providerDelivery.findMany({
    where: { serviceOrder_id: null },
    select: {
      id: true,
      orderService_id: true,
      provider_id: true,
      date: true,
      notes: true,
      orderService: { select: { order: { select: { company_id: true } } } },
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
  if (orphans.length === 0) {
    console.log("[backfill-os] nada que migrar");
    return;
  }

  // company -> groupKey -> { lines, first }
  const byCompany = new Map();
  for (const d of orphans) {
    const company = d.orderService.order.company_id ?? null;
    const key = `${d.orderService_id}|${d.provider_id}|${d.date.toISOString().slice(0, 10)}`;
    if (!byCompany.has(company)) byCompany.set(company, new Map());
    const groups = byCompany.get(company);
    if (!groups.has(key)) groups.set(key, { orderService_id: d.orderService_id, provider_id: d.provider_id, date: d.date, notes: d.notes, ids: [] });
    groups.get(key).ids.push(d.id);
  }

  let created = 0;
  for (const [company, groups] of byCompany) {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001::int, 1::int)`;
        const existing = await tx.serviceOrder.findMany({ where: { company_id: company }, select: { osNumber: true } });
        let n = existing.reduce((m, r) => Math.max(m, parse(r.osNumber)), 0);
        for (const g of groups.values()) {
          n += 1;
          const so = await tx.serviceOrder.create({
            data: {
              osNumber: pad(n),
              company_id: company,
              orderService_id: g.orderService_id,
              provider_id: g.provider_id,
              date: g.date,
              notes: g.notes,
            },
            select: { id: true },
          });
          await tx.providerDelivery.updateMany({ where: { id: { in: g.ids } }, data: { serviceOrder_id: so.id } });
          created += 1;
        }
      },
      { timeout: 60000, maxWait: 20000 }
    );
  }
  console.log(`[backfill-os] ${created} OS creadas a partir de ${orphans.length} salidas`);
}

main()
  .catch((e) => {
    // No debe impedir el deploy: las salidas sin OS siguen funcionando y se migran en el próximo intento.
    console.error("[backfill-os] falló:", e);
  })
  .finally(() => prisma.$disconnect());
