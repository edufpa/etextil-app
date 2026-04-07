"use client";
import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [7, 14, 30];

export default function DaysSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parseInt(searchParams.get("days") || "14", 10);

  const select = (n: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("days", String(n));
    router.push(`/admin?${p.toString()}`);
  };

  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      {OPTIONS.map((n) => (
        <button
          key={n}
          onClick={() => select(n)}
          style={{
            padding: "0.3rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid var(--card-border)",
            cursor: "pointer",
            fontWeight: current === n ? 700 : 400,
            fontSize: "0.82rem",
            background: current === n ? "var(--primary)" : "transparent",
            color: current === n ? "white" : "var(--text-muted)",
            transition: "all 0.15s",
          }}
        >
          {n}d
        </button>
      ))}
    </div>
  );
}
