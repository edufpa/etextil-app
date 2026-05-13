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
    prisma.appUser.findMany({
      where: { role: "COMPANY_ADMIN" },
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, status: true, company: { select: { name: true } } },
    }),
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
