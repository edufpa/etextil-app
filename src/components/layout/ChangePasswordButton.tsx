"use client";

import { useState } from "react";
import { KeyRound, X, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setError(""); setSuccess(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (data.success) { setSuccess(true); reset(); }
      else setError(data.message || "Error al cambiar contraseña");
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px",
    border: "1px solid var(--card-border)", background: "var(--bg-color)",
    fontSize: "0.875rem", boxSizing: "border-box",
  };

  return (
    <>
      <button
        title="Cambiar contraseña"
        onClick={() => { setOpen(true); reset(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: "0.35rem" }}
      >
        <KeyRound size={17} />
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: "1.75rem", width: 360, boxShadow: "var(--shadow-lg)", position: "relative" }}>
            <button onClick={() => setOpen(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Cambiar contraseña</h2>

            {success ? (
              <p style={{ color: "green", fontWeight: 600, textAlign: "center", padding: "1rem 0" }}>¡Contraseña actualizada correctamente!</p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0.6rem 0.75rem", color: "#dc2626", fontSize: "0.83rem" }}>{error}</div>}
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Contraseña actual</label>
                  <input type={showPw ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} required style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Nueva contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPw ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} required style={{ ...inp, paddingRight: "2.5rem" }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Confirmar nueva contraseña</label>
                  <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={inp} />
                </div>
                <button type="submit" disabled={loading} style={{ padding: "0.6rem", borderRadius: "8px", background: "var(--primary)", color: "white", border: "none", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
