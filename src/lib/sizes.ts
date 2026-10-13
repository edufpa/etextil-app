const ORDER = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL", "STD", "UNICA", "ÚNICA"];

/** Sort sizes in a natural garment order: numeric sizes ascending, then XS..XXL, then the rest alphabetically. */
export function compareSizes(a: string, b: string) {
  const na = Number(a), nb = Number(b);
  const an = a !== "" && !isNaN(na), bn = b !== "" && !isNaN(nb);
  if (an && bn) return na - nb;
  if (an) return -1;
  if (bn) return 1;
  const ia = ORDER.indexOf(a.toUpperCase()), ib = ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b, "es");
}
