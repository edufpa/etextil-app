import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../../services/services.module.css";
import MoldForm from "../MoldForm";

export const dynamic = "force-dynamic";

export default async function EditMoldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mold = await prisma.mold.findUnique({ where: { id: Number(id) } });
  if (!mold) return notFound();

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/molds" style={{ color: "var(--text-muted)" }}><ArrowLeft size={20} /></Link>
          <h1 className={styles.title}>Editar Molde: {mold.code}</h1>
        </div>
      </div>
      <MoldForm mold={mold} />
    </div>
  );
}
