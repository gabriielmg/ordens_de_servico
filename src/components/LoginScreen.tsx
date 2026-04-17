import { useState } from "react";

interface LoginScreenProps {
  isLoading: boolean;
  error: string;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ isLoading, error, onSubmit }: LoginScreenProps) {
  const [email, setEmail] = useState("admin@ordemfacil.app");
  const [password, setPassword] = useState("123456");

  return (
    <section className="login-shell">
      <div className="login-card">
        <div className="login-badge">Operacao em campo</div>
        <p className="eyebrow">Sistema de Ordens de Servico</p>
        <h1>OrdemFacil Pro</h1>
        <p className="login-copy">
          Uma experiencia com cara de aplicativo para acompanhar, validar e fechar OS com
          fluidez em qualquer tela.
        </p>

        <form
          className="login-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit(email, password);
          }}
        >
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Acessar sistema"}
          </button>
        </form>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="login-hint">
          <strong>Modo demonstracao</strong>
          <span>`admin@ordemfacil.app` / `123456`</span>
          <span>`tecnico@ordemfacil.app` / `123456`</span>
        </div>
      </div>
    </section>
  );
}
