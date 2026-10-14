/** Reintenta operaciones que chocan con otra simultánea: P2034 (serialización) o P2002 (número ya usado). */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (i >= attempts || (code !== "P2034" && code !== "P2002")) throw e;
      await new Promise((r) => setTimeout(r, 25 * i + Math.random() * 50));
    }
  }
}
