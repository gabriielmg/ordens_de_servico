import { useState } from "react";
import type { AppUser, UserRole } from "../types";

interface AdminUsersPanelProps {
  users: AppUser[];
  onCreateUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<void>;
}

export function AdminUsersPanel({ users, onCreateUser }: AdminUsersPanelProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("technician");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <section className="admin-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Administracao</p>
          <h2>Equipe e acessos</h2>
          <p className="section-copy">
            Cadastre colaboradores e mantenha a operacao com permissao clara por perfil.
          </p>
        </div>
      </div>

      <div className="admin-layout">
        <form
          className="admin-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setIsSaving(true);

            try {
              await onCreateUser({ name, email, password, role });
              setName("");
              setEmail("");
              setPassword("");
              setRole("technician");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Erro ao criar usuario.");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <label>
            Nome
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Senha inicial
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          <label>
            Perfil
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="technician">Colaborador</option>
              <option value="admin">Administrador</option>
            </select>
          </label>

          <button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Criar usuario"}
          </button>

          {error ? <p className="form-error">{error}</p> : null}
        </form>

        <div className="users-list">
          {users.map((user) => (
            <article key={user.id} className="user-card">
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <small>{user.role === "admin" ? "Administrador" : "Colaborador"}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
