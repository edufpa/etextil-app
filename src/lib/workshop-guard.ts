import { Prisma } from "@prisma/client";
import { getSessionCompanyId } from "./company";
import { UserError } from "./errors";

type Tx = Prisma.TransactionClient;

async function sessionCompany() {
  return getSessionCompanyId();
}

function checkCompany(sessionCompanyId: number | null, recordCompanyId: number | null | undefined) {
  if (sessionCompanyId !== null && recordCompanyId !== sessionCompanyId) {
    throw new UserError("No tienes acceso a este registro.");
  }
}

/** Loads an OrderService with everything needed to validate deliveries, checking company. */
export async function loadOrderServiceForDelivery(tx: Tx, orderServiceId: number, sessionCompanyId: number | null) {
  const os = await tx.orderService.findUnique({
    where: { id: orderServiceId },
    include: {
      service: { select: { name: true } },
      sizeSplit: true,
      deliveries: { select: { quantity: true, size: true } },
      order: { select: { id: true, orderNumber: true, company_id: true, status: true, sizes: true } },
    },
  });
  if (!os) throw new UserError("Servicio de la OP no encontrado.");
  checkCompany(sessionCompanyId, os.order.company_id);
  return os;
}

/** Required quantity per size for a service (sizeSplit if present, otherwise the OP sizes). */
export function requiredBySize(os: { sizeSplit: { size: string; quantity: number }[]; order: { sizes: { size: string; quantity: number }[] } }) {
  const src = os.sizeSplit.length > 0 ? os.sizeSplit : os.order.sizes;
  const m = new Map<string, number>();
  for (const s of src) m.set(s.size, (m.get(s.size) ?? 0) + s.quantity);
  return m;
}

/**
 * Validates and creates deliveries (salidas al taller) for one service. Must run inside a transaction.
 * sizes with size "" are treated as "sin talla" (only total cap).
 */
export async function createDeliveriesTx(
  tx: Tx,
  sessionCompanyId: number | null,
  data: { orderService_id: number; provider_id: number; date: Date; notes?: string; sizes: { size: string; quantity: number }[] }
) {
  const os = await loadOrderServiceForDelivery(tx, data.orderService_id, sessionCompanyId);
  if (["ENTREGADO", "CERRADO", "CANCELADO"].includes(os.order.status)) {
    throw new UserError(`La OP ${os.order.orderNumber} está ${os.order.status}; no se pueden registrar salidas.`);
  }
  const provider = await tx.provider.findUnique({ where: { id: data.provider_id }, select: { company_id: true, businessName: true } });
  if (!provider) throw new UserError("Selecciona un proveedor válido.");
  checkCompany(sessionCompanyId, provider.company_id);

  const valid = data.sizes.filter((s) => Number.isFinite(s.quantity) && s.quantity > 0);
  if (valid.length === 0) throw new UserError("Ingresa al menos una cantidad mayor a 0.");
  if (valid.some((s) => !Number.isInteger(s.quantity))) throw new UserError("Las cantidades deben ser números enteros.");

  const totalBatch = valid.reduce((a, s) => a + s.quantity, 0);
  const already = os.deliveries.reduce((a, d) => a + d.quantity, 0);
  const remaining = os.requiredQuantity - already;
  if (totalBatch > remaining) {
    throw new UserError(`${os.service.name}: el total (${totalBatch}) supera el saldo por enviar (${remaining}).`);
  }

  const req = requiredBySize(os);
  if (req.size > 0) {
    const sentBySize = new Map<string, number>();
    for (const d of os.deliveries) if (d.size) sentBySize.set(d.size, (sentBySize.get(d.size) ?? 0) + d.quantity);
    const batchBySize = new Map<string, number>();
    for (const s of valid) batchBySize.set(s.size, (batchBySize.get(s.size) ?? 0) + s.quantity);
    for (const [size, qty] of batchBySize) {
      const r = req.get(size);
      if (r === undefined) throw new UserError(`${os.service.name}: la talla "${size}" no pertenece a la OP ${os.order.orderNumber}.`);
      const left = r - (sentBySize.get(size) ?? 0);
      if (qty > left) {
        throw new UserError(`${os.service.name}, talla ${size}: se quiere enviar ${qty} pero el saldo es ${Math.max(0, left)}.`);
      }
    }
  }

  for (const s of valid) {
    await tx.providerDelivery.create({
      data: {
        orderService_id: data.orderService_id,
        provider_id: data.provider_id,
        size: s.size || null,
        date: data.date,
        quantity: s.quantity,
        notes: data.notes,
      },
    });
  }
  return { os, provider, valid, totalBatch };
}

/** Validates and creates one incoming (ingreso) for a delivery. Must run inside a transaction. */
export async function createIncomingTx(
  tx: Tx,
  sessionCompanyId: number | null,
  data: { providerDelivery_id: number; quantity: number; date: Date; notes?: string }
) {
  if (!Number.isInteger(data.quantity) || data.quantity <= 0) throw new UserError("La cantidad debe ser un entero mayor a 0.");
  const delivery = await tx.providerDelivery.findUnique({
    where: { id: data.providerDelivery_id },
    include: {
      incomings: { select: { quantity: true } },
      orderService: { select: { order: { select: { id: true, orderNumber: true, company_id: true } }, service: { select: { name: true } } } },
    },
  });
  if (!delivery) throw new UserError("La salida al taller no existe.");
  checkCompany(sessionCompanyId, delivery.orderService.order.company_id);
  const received = delivery.incomings.reduce((a, i) => a + i.quantity, 0);
  const pending = delivery.quantity - received;
  if (data.quantity > pending) {
    const lbl = `${delivery.orderService.order.orderNumber} · ${delivery.orderService.service.name}${delivery.size ? ` · talla ${delivery.size}` : ""}`;
    throw new UserError(`${lbl}: se quiere recibir ${data.quantity} pero solo hay ${Math.max(0, pending)} pendiente.`);
  }
  await tx.providerIncoming.create({
    data: { providerDelivery_id: data.providerDelivery_id, quantity: data.quantity, date: data.date, notes: data.notes },
  });
  return delivery;
}

export async function getTxCompany() {
  return sessionCompany();
}

export async function assertDeliveryAccess(tx: Tx, deliveryId: number, sessionCompanyId: number | null) {
  const d = await tx.providerDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      incomings: { select: { quantity: true } },
      orderService: {
        select: {
          id: true,
          requiredQuantity: true,
          service: { select: { name: true } },
          sizeSplit: true,
          deliveries: { select: { id: true, quantity: true, size: true } },
          order: { select: { id: true, orderNumber: true, company_id: true, sizes: true } },
        },
      },
    },
  });
  if (!d) throw new UserError("La salida al taller no existe.");
  checkCompany(sessionCompanyId, d.orderService.order.company_id);
  return d;
}

export async function assertIncomingAccess(tx: Tx, incomingId: number, sessionCompanyId: number | null) {
  const i = await tx.providerIncoming.findUnique({
    where: { id: incomingId },
    include: { providerDelivery: { select: { orderService: { select: { order: { select: { id: true, company_id: true } } } } } } },
  });
  if (!i) throw new UserError("El ingreso no existe.");
  checkCompany(sessionCompanyId, i.providerDelivery.orderService.order.company_id);
  return i;
}

export const TX_OPTS = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000, maxWait: 10000 } as const;
