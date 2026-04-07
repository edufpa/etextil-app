import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/company";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../../services/services.module.css";
import GarmentForm from "../GarmentForm";

export const dynamic = "force-dynamic";

export default async function EditGarmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = await getSessionCompanyId();

  const [garment, molds] = await Promise.all([
    prisma.garment.findUnique({ where: { id: Number(id) } }),
    prisma.mold.findMany({
      where: { status: true, ...(companyId ? { company_id: companyId } : {}) },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  if (!garment) return notFound();

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/garments" style={{ color: "var(--text-muted)" }}><ArrowLeft size={20} /></Link>
          <h1 className={styles.title}>Editar: {garment.name}</h1>
        </div>
      </div>
      <GarmentForm garment={garment} molds={molds} />
    </div>
  );
}
