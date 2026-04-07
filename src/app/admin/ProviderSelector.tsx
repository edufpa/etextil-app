"use client";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  providers: { id: number; businessName: string }[];
};

export default function ProviderSelector({ providers }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("provider") || "";

  const select = (value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set("provider", value);
    else p.delete("provider");
    router.push(`/admin?${p.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={(e) => select(e.target.value)}
      style={{
        padding: "0.3rem 0.6rem",
        borderRadius: "6px",
        border: "1px solid var(--card-border)",
        background: current ? "var(--primary)" : "transparent",
        color: current ? "white" : "var(--text-muted)",
        fontSize: "0.82rem",
        fontWeight: current ? 700 : 400,
        cursor: "pointer",
        outline: "none",
      }}
    >
      <option value="" style={{ background: "white", color: "#333" }}>Todos los talleres</option>
      {providers.map((p) => (
        <option key={p.id} value={String(p.id)} style={{ background: "white", color: "#333" }}>
          {p.businessName}
        </option>
      ))}
    </select>
  );
}
