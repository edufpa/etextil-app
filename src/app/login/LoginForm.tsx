"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { Loader2 } from "lucide-react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(data.redirect);
      } else {
        setError(data.message || "Credenciales incorrectas");
      }
    } catch (err) {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.inputGroup}>
        <label>Usuario</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
          className={styles.input}
          placeholder="admin"
        />
      </div>
      <div className={styles.inputGroup}>
        <label>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
          placeholder="••••••••"
        />
      </div>
      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? <Loader2 className={styles.spinner} /> : "Ingresar al Panel"}
      </button>
    </form>
  );
}
