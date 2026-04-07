"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProviderDelivery } from "@/app/actions/providerDeliveries";
import { Trash2 } from "lucide-react";

type Props = {
  deliveryId: number;
  orderId: number;
  hasIncomings: boolean;
};

export default function OpsDeleteButton({ deliveryId, orderId, hasIncomings }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (hasIncomings) {
      alert("No se puede eliminar una OP que ya tiene ingresos registrados. Primero elimina los ingresos desde el pedido.");
      return;
    }
    if (!confirm("¿Eliminar esta OP? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    const res = await deleteProviderDelivery(deliveryId, orderId);
    if (res.error) {
      alert(res.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title={hasIncomings ? "Tiene ingresos registrados" : "Eliminar OP"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: hasIncomings ? "#ccc" : "#e53e3e",
        color: "white",
        border: "none",
        padding: "5px 10px",
        borderRadius: "6px",
        cursor: hasIncomings ? "not-allowed" : "pointer",
        fontSize: "0.75rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Trash2 size={12} /> {loading ? "..." : "Eliminar"}
    </button>
  );
}
