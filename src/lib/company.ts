import { getServerSession } from "@/lib/server-session";

/** Returns companyId from session, or null if global admin (no company filter). */
export async function getSessionCompanyId(): Promise<number | null> {
  const session = await getServerSession();
  if (!session?.companyId) return null;
  return Number(session.companyId);
}

/** Returns a Prisma `where` fragment to filter by company, or {} for global admin. */
export async function companyFilter(): Promise<{ company_id?: number }> {
  const id = await getSessionCompanyId();
  if (id === null) return {};
  return { company_id: id };
}

/** True if the session can access a record belonging to `recordCompanyId` (global admin sees all). */
export async function canAccessCompany(recordCompanyId: number | null | undefined): Promise<boolean> {
  const id = await getSessionCompanyId();
  if (id === null) return true;
  return recordCompanyId === id;
}
