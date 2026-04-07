import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/company";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../../services/services.module.css";
import GarmentForm from "../GarmentForm";

export const dynamic = "force-dynamic";

export default async function NewGarmentPage() {
  const companyId = await getSessionCompanyId();
  const molds = await prisma.mold.findMany({
    where: { status: true, ...(companyId ? { company_id: companyId } : {}) },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/garments" style={{ color: "var(--text-muted)" }}><ArrowLeft size={20} /></Link>
          <h1 className={styles.title}>Nueva Prenda</h1>
        </div>
      </div>
      <GarmentForm molds={molds} />
    </div>
  );
}
