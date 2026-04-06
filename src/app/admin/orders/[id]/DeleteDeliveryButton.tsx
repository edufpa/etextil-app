"use client";

import { deleteProviderDelivery } from "@/app/actions/providerDeliveries";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export default function DeleteDeliveryButton({ id, orderId }: { id: number; orderId: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este registro de entrega?")) return;
    setLoading(true);
    await deleteProviderDelivery(id, orderId);
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar entrega"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#e53e3e", opacity: loading ? 0.4 : 1, padding: "0.25rem",
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}
