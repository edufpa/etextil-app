import { Prisma } from "@prisma/client";

export const DEFAULT_OP_SERVICE_NAMES = [
  "Corte",
  "Confección",
  "Estampado",
] as const;

type ServiceRow = { id: number; name: string; trackBySize?: boolean };

export function findServiceByDefaultName(
  allServices: ServiceRow[],
  defaultName: string
): ServiceRow | undefined {
  const lower = defaultName.toLowerCase();
  return (
    allServices.find((s) => s.name.toLowerCase() === lower) ??
    allServices.find((s) => s.name.toLowerCase().includes(lower))
  );
}

/** Asigna Corte, Confección y Estampado a una OP (crea servicios faltantes si createMissing). */
export async function attachDefaultServicesToOrder(
  tx: Prisma.TransactionClient,
  orderId: number,
  totalQuantity: number,
  options?: { createMissing?: boolean }
) {
  const allServices = await tx.service.findMany({
    where: { status: true },
    select: { id: true, name: true, trackBySize: true },
  });

  const existing = await tx.orderService.findMany({
    where: { order_id: orderId },
    select: { service_id: true },
  });
  const existingIds = new Set(existing.map((e) => e.service_id));

  for (const [stageIdx, defaultName] of DEFAULT_OP_SERVICE_NAMES.entries()) {
    let service = findServiceByDefaultName(allServices, defaultName);

    if (!service && options?.createMissing) {
      const created = await tx.service.create({
        data: {
          name: defaultName,
          type: "externo",
          trackBySize: false,
          status: true,
        },
        select: { id: true, name: true, trackBySize: true },
      });
      allServices.push(created);
      service = created;
    }

    if (!service || existingIds.has(service.id)) continue;

    await tx.orderService.create({
      data: {
        order_id: orderId,
        service_id: service.id,
        requiredQuantity: totalQuantity,
        sequence: stageIdx + 1,
      },
    });
    existingIds.add(service.id);
  }
}

/** IDs de servicios del catálogo que coinciden con los nombres por defecto. */
export function getDefaultServiceIds(allServices: { id: number; name: string }[]): number[] {
  const ids: number[] = [];
  for (const defaultName of DEFAULT_OP_SERVICE_NAMES) {
    const s = findServiceByDefaultName(allServices, defaultName);
    if (s) ids.push(s.id);
  }
  return ids;
}
