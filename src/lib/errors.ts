/** Errores de negocio con mensaje para el usuario. */
export class UserError extends Error {}

/** Convierte cualquier error (incluido Prisma) en un mensaje en español para el usuario. */
export function friendlyError(e: unknown, fallback = "Ocurrió un error inesperado. Intenta de nuevo."): string {
  if (e instanceof UserError) return e.message;
  const code = (e as any)?.code;
  if (code === "P2002") return "Ya existe un registro con esos datos (duplicado).";
  if (code === "P2003") return "No se puede completar: hay registros relacionados.";
  if (code === "P2025") return "El registro no existe o ya fue eliminado.";
  if (code === "P2034") return "Otro usuario registró movimientos al mismo tiempo. Vuelve a intentarlo.";
  return fallback;
}
