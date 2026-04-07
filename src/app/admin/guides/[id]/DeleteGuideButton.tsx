"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGuide } from "@/app/actions/guides";
import { Trash2 } from "lucide-react";

export default function DeleteGuideButton({ guideId, sunatNumber }: { guideId: number; sunatNumber: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la guía ${sunatNumber}? Esta acción revertirá las cantidades entregadas en los pedidos afectados.`)) return;
    setLoading(true);
    const res = await deleteGuide(guideId);
    if (res.error) {
      alert(res.error);
      setLoading(false);
    } else {
      router.push("/admin/guides");
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        background: "#e53e3e",
        color: "white",
        border: "none",
        padding: "0.5rem 1rem",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.875rem",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Trash2 size={16} />
      {loading ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
