"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompany, createCompanyUser, deleteAppUser, updateUserPassword } from "@/app/actions/globalAdmin";
import { Building2, UserPlus, Trash2, KeyRound, X } from "lucide-react";

type Company = { id: number; name: string };
type AppUser = { id: number; username: string; status: boolean; company: { name: string } | null };

export default function GlobalAdminForms({
  companies,
  users,
}: {
  companies: Company[];
  users: AppUser[];
}) {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [companySuccess, setCompanySuccess] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || 0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  // Edit password modal state
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyLoading(true);
    setCompanyError("");
    setCompanySuccess("");
    const fd = new FormData();
    fd.append("name", companyName);
    const res = await createCompany(fd);
    setCompanyLoading(false);
    if (res?.error) { setCompanyError(res.error); }
    else { setCompanySuccess("Empresa creada."); setCompanyName(""); router.refresh(); }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    setUserError("");
    setUserSuccess("");
    const fd = new FormData();
    fd.append("company_id", String(selectedCompany));
    fd.append("username", username);
    fd.append("password", password);
    const res = await createCompanyUser(fd);
    setUserLoading(false);
    if (res?.error) { setUserError(res.error); }
    else { setUserSuccess("Usuario creado."); setUsername(""); setPassword(""); router.refresh(); }
  };

  const handleDelete = async (id: number, uname: string) => {
    if (!confirm(`¿Eliminar usuario "${uname}"? Esta acción no se puede deshacer.`)) return;
    const res = await deleteAppUser(id);
    if (res?.error) alert(res.error);
    else router.refresh();
  };

  const openEditPassword = (id: number, uname: string) => {
    setEditUserId(id);
    setEditUsername(uname);
    setNewPassword("");
    setEditError("");
    setEditSuccess("");
  };

  const handleEditPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    setEditLoading(true);
    setEditError("");
    setEditSuccess("");
    const fd = new FormData();
    fd.append("user_id", String(editUserId));
    fd.append("new_password", newPassword);
    const res = await updateUserPassword(fd);
    setEditLoading(false);
    if (res?.error) { setEditError(res.error); }
    else { setEditSuccess("Contraseña actualizada."); setNewPassword(""); }
  };

  const card: React.CSSProperties = {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "var(--radius)",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  const btn = (bg = "var(--primary)"): React.CSSProperties => ({
    background: bg,
    color: "white",
    border: "none",
    padding: "0.6rem",
    borderRadius: "var(--radius)",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
  });

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Crear empresa */}
        <form onSubmit={handleCompanySubmit} style={card}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building2 size={18} style={{ color: "var(--primary)" }} /> Crear Empresa
          </h3>
          {companyError && <div style={{ color: "red", fontSize: "0.82rem", background: "#fff0f0", padding: "0.4rem 0.75rem", borderRadius: "4px" }}>{companyError}</div>}
          {companySuccess && <div style={{ color: "green", fontSize: "0.82rem", background: "#f0fff4", padding: "0.4rem 0.75rem", borderRadius: "4px" }}>{companySuccess}</div>}
          <input type="text" placeholder="Nombre de empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          <button type="submit" disabled={companyLoading} style={btn()}>
            {companyLoading ? "Guardando..." : "Guardar empresa"}
          </button>
        </form>

        {/* Crear usuario */}
        <form onSubmit={handleUserSubmit} style={card}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserPlus size={18} style={{ color: "var(--primary)" }} /> Crear Usuario por Empresa
          </h3>
          {userError && <div style={{ color: "red", fontSize: "0.82rem", background: "#fff0f0", padding: "0.4rem 0.75rem", borderRadius: "4px" }}>{userError}</div>}
          {userSuccess && <div style={{ color: "green", fontSize: "0.82rem", background: "#f0fff4", padding: "0.4rem 0.75rem", borderRadius: "4px" }}>{userSuccess}</div>}
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(Number(e.target.value))} required>
            <option value={0}>Selecciona empresa</option>
            {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <button type="submit" disabled={userLoading || companies.length === 0} style={btn()}>
            {userLoading ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      </div>

      {/* Users table with actions */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--card-border)", fontWeight: 700 }}>
          Usuarios por Empresa
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-color)" }}>
              <th style={{ padding: "0.6rem 1rem", textAlign: "left" }}>Empresa</th>
              <th style={{ padding: "0.6rem 1rem", textAlign: "left" }}>Usuario</th>
              <th style={{ padding: "0.6rem 1rem", textAlign: "left" }}>Estado</th>
              <th style={{ padding: "0.6rem 1rem", textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--card-border)" }}>
                <td style={{ padding: "0.65rem 1rem" }}>{u.company?.name || "—"}</td>
                <td style={{ padding: "0.65rem 1rem", fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: "0.65rem 1rem", color: u.status ? "green" : "var(--text-muted)" }}>
                  {u.status ? "Activo" : "Inactivo"}
                </td>
                <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    <button
                      onClick={() => openEditPassword(u.id, u.username)}
                      title="Cambiar contraseña"
                      style={{ background: "var(--primary)", color: "white", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem" }}
                    >
                      <KeyRound size={13} /> Contraseña
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      title="Eliminar usuario"
                      style={{ background: "#ef4444", color: "white", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem" }}
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  No hay usuarios creados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit password modal */}
      {editUserId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card-bg)", borderRadius: "var(--radius)", padding: "1.5rem", width: "100%", maxWidth: "380px", position: "relative", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button onClick={() => setEditUserId(null)} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <X size={18} />
            </button>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <KeyRound size={18} style={{ color: "var(--primary)" }} /> Cambiar contraseña
            </h3>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Usuario: <strong>{editUsername}</strong></div>
            {editError && <div style={{ color: "red", fontSize: "0.82rem", background: "#fff0f0", padding: "0.4rem 0.75rem", borderRadius: "4px" }}>{editError}</div>}
            {editSuccess && <div style={{ color: "green", fontSize: "0.82rem", background: "#f0fff4", padding: "0.4rem 0.75rem", borderRadius: "4px" }}>{editSuccess}</div>}
            <form onSubmit={handleEditPassword} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="password"
                placeholder="Nueva contraseña (mín. 4 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                autoComplete="new-password"
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" disabled={editLoading} style={{ ...btn(), flex: 1 }}>
                  {editLoading ? "Guardando..." : "Actualizar"}
                </button>
                <button type="button" onClick={() => setEditUserId(null)} style={{ flex: 1, background: "transparent", border: "1px solid var(--card-border)", padding: "0.6rem", borderRadius: "var(--radius)", cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
