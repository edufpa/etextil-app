import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { redirect } from "next/navigation";
import styles from "../services/services.module.css";
import GlobalAdminForms from "./GlobalAdminForms";

export const dynamic = "force-dynamic";

export default async function GlobalAdminPage() {
  const session = await getServerSession();
  if (!session?.userId) redirect("/login");
  if (session.role !== "GLOBAL_ADMIN") redirect("/admin");

  const [companies, users] = await Promise.all([
    (prisma as any).company.findMany({ orderBy: { createdAt: "desc" } }) as Promise<
      { id: number; name: string; status: boolean }[]
    >,
    (prisma as any).appUser.findMany({
      where: { role: "COMPANY_ADMIN" },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }) as Promise<{ id: number; username: string; status: boolean; company: { name: string } | null }[]>,
  ]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Administrador General</h1>
      </div>
      <GlobalAdminForms companies={companies} users={users} />
    </div>
  );
}
