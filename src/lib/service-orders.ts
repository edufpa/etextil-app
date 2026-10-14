/**
 * Reglas puras de las Órdenes de Servicio (OS) y de la secuencia de etapas de una OP.
 * Sin acceso a BD: se alimentan con datos ya cargados para poder usarlas igual en
 * transacciones, páginas y formularios.
 */

export type StageDelivery = { size: string | null; quantity: number; incomings?: { quantity: number }[] };

export type Stage = {
  id: number;
  sequence: number;
  requiredQuantity: number;
  deliveries: StageDelivery[];
};

export type SizeQty = { size: string; quantity: number };

/** Cantidad requerida por talla de una etapa: su desglose propio si existe, si no las tallas de la OP. */
export function requiredBySizeMap(sizeSplit: SizeQty[], opSizes: SizeQty[]) {
  const src = sizeSplit.length > 0 ? sizeSplit : opSizes;
  const m = new Map<string, number>();
  for (const s of src) m.set(s.size, (m.get(s.size) ?? 0) + s.quantity);
  return m;
}

/** Etapa inmediatamente anterior (mayor `sequence` menor a la actual). Sequence 0 = sin secuencia. */
export function previousStage<T extends { id: number; sequence: number }>(stages: T[], current: { id: number; sequence: number }): T | null {
  if (!current.sequence || current.sequence <= 0) return null;
  let prev: T | null = null;
  for (const s of stages) {
    if (s.id === current.id || s.sequence <= 0 || s.sequence >= current.sequence) continue;
    if (!prev || s.sequence > prev.sequence) prev = s;
  }
  return prev;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Lo recibido (ingresos) de una etapa, por talla ("" = sin talla) y en total. */
export function receivedByStage(stage: { deliveries: StageDelivery[] }) {
  const bySize = new Map<string, number>();
  let total = 0;
  let hasSized = false;
  for (const d of stage.deliveries) {
    const rec = sum((d.incomings ?? []).map((i) => i.quantity));
    if (d.size) hasSized = true;
    const k = d.size ?? "";
    bySize.set(k, (bySize.get(k) ?? 0) + rec);
    total += rec;
  }
  return { bySize, total, hasSized };
}

export type Availability = {
  /** Cuánto más se puede enviar en total a esta etapa. */
  total: number;
  /** Cuánto más se puede enviar por talla. */
  bySize: Record<string, number>;
  /** true si el tope lo fija la etapa anterior (secuencia). */
  gated: boolean;
};

/**
 * Cuánto se puede enviar todavía a una etapa.
 * - Tope por talla = min(requerido de la etapa, recibido de la etapa anterior) - ya enviado.
 * - La primera etapa (o una sin secuencia) solo está limitada por lo requerido.
 * - `excludeDeliveryId` permite recalcular al editar una salida existente.
 */
export function computeAvailability(
  stage: Stage & { sizeSplit: SizeQty[] },
  opSizes: SizeQty[],
  prev: { deliveries: StageDelivery[] } | null,
  exclude?: StageDelivery
): Availability {
  const deliveries = exclude ? stage.deliveries.filter((d) => d !== exclude) : stage.deliveries;
  const req = requiredBySizeMap(stage.sizeSplit, opSizes);
  const sentBySize = new Map<string, number>();
  for (const d of deliveries) {
    const k = d.size ?? "";
    sentBySize.set(k, (sentBySize.get(k) ?? 0) + d.quantity);
  }
  const sentTotal = sum(deliveries.map((d) => d.quantity));

  const prevRec = prev ? receivedByStage(prev) : null;
  const bySize: Record<string, number> = {};
  for (const [size, r] of req) {
    let cap = r;
    if (prevRec && prevRec.hasSized) cap = Math.min(cap, prevRec.bySize.get(size) ?? 0);
    bySize[size] = Math.max(0, cap - (sentBySize.get(size) ?? 0));
  }
  let total = stage.requiredQuantity - sentTotal;
  if (prevRec) total = Math.min(total, prevRec.total - sentTotal);
  return { total: Math.max(0, total), bySize, gated: !!prev };
}

export type OsStatus = "EMITIDA" | "PARCIAL" | "COMPLETA" | "ANULADA";

/** Estado derivado de una OS a partir de sus líneas. */
export function osStatus(os: { voidedAt: Date | null }, lines: StageDelivery[]): OsStatus {
  if (os.voidedAt) return "ANULADA";
  const sent = sum(lines.map((l) => l.quantity));
  const received = sum(lines.flatMap((l) => (l.incomings ?? []).map((i) => i.quantity)));
  if (received <= 0) return "EMITIDA";
  return received >= sent ? "COMPLETA" : "PARCIAL";
}

export function formatOsNumber(n: number) {
  return `OS-${String(n).padStart(4, "0")}`;
}

export function parseOsNumber(osNumber: string | null | undefined) {
  const m = /^OS-?0*(\d+)$/i.exec(osNumber || "");
  return m ? Number(m[1]) : 0;
}

/** Orden por defecto de las etapas (Corte → Confección → Estampado → Acabados). */
export const DEFAULT_STAGE_ORDER = ["corte", "confecci", "estampad", "acabad"];

export function defaultSequenceFor(serviceName: string): number {
  const n = serviceName.toLowerCase();
  const i = DEFAULT_STAGE_ORDER.findIndex((k) => n.includes(k));
  return i >= 0 ? i + 1 : 0;
}
