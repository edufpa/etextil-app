"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../login/login.module.css";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.message || "Error al enviar el correo");
      }
    } catch {
      setError("Error de conexión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>eTextil</h1>
          <p className={styles.subtitle}>Recuperar contraseña</p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <CheckCircle2 size={48} color="green" style={{ margin: "0 auto 1rem" }} />
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>¡Correo enviado!</p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.
            </p>
            <Link href="/login" style={{ color: "var(--primary)", fontSize: "0.875rem", fontWeight: 600 }}>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 0 }}>
              Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <div className={styles.inputGroup}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className={styles.input}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? <Loader2 className={styles.spinner} /> : "Enviar enlace de recuperación"}
            </button>
            <div style={{ textAlign: "center" }}>
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)", textDecoration: "none" }}>
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
