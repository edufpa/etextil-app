import { prisma } from "@/lib/prisma";
import { companyFilter } from "@/lib/company";
import NuevoPedidoForm from "./NuevoPedidoForm";

export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  const filter = await companyFilter();
  const [clients, sizes, garments, colors] = await Promise.all([
    prisma.client.findMany({ where: { status: true, ...filter }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.size.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.garment.findMany({ where: { status: true, ...filter }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.color.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return <NuevoPedidoForm clients={clients} sizes={sizes} garments={garments} colors={colors} />;
}
