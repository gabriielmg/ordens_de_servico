/* ==========================================================
   AUTH — Autenticação, sessão e inicialização de telas
========================================================== */
import { State }  from './state.js';
import { Router } from './router.js';
import { UI }     from './ui.js';
import { sb }     from './supabase.js';
import { OS }     from './os.js';
import { Ponto }  from './ponto.js';

/* ----------------------------------------------------------
   TIME — Obtém data/hora real via API (evita fuso errado)
---------------------------------------------------------- */
const CFG_WORLDTIME = 'https://worldtimeapi.org/api/timezone/America/Sao_Paulo';

export const Time = {
  async init() {
    try {
      const r    = await fetch(CFG_WORLDTIME);
      const data = await r.json();
      State.hoje = new Date(data.datetime);
    } catch {
      State.hoje = new Date();
    }
    State.hoje.setHours(0, 0, 0, 0);

    State.fimSemana = new Date(State.hoje);
    State.fimSemana.setDate(State.hoje.getDate() + (6 - State.hoje.getDay()));
    State.fimSemana.setHours(0, 0, 0, 0);
  }
};

/* ----------------------------------------------------------
   UI_COLAB — Inicializa tela home do colaborador
---------------------------------------------------------- */
export const UI_Colab = {
  init() {
    const nome = State.perfil?.nome || 'Colaborador';
    document.getElementById('greetingMsg').textContent  = `Olá, ${nome.split(' ')[0]}!`;
    document.getElementById('greetingDate').textContent =
      State.hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Aplica permissões — oculta módulos não autorizados
    const perms   = State.permissoes || [];
    const btnOS    = document.getElementById('colabBtnOS');
    const btnPonto = document.getElementById('colabBtnPonto');
    if (btnOS)    btnOS.style.display    = perms.includes('os')    ? '' : 'none';
    if (btnPonto) btnPonto.style.display = perms.includes('ponto') ? '' : 'none';
  }
};

/* ----------------------------------------------------------
   UI_ADMIN — Inicializa tela home do admin
---------------------------------------------------------- */
export const UI_Admin = {
  init() {
    const nome = State.perfil?.nome || 'Admin';
    document.getElementById('adminGreetingMsg').textContent  = `Olá, ${nome.split(' ')[0]}!`;
    document.getElementById('adminGreetingDate').textContent =
      State.hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
};

/* ----------------------------------------------------------
   AUTH — Login / logout / sessão
---------------------------------------------------------- */
export const Auth = {
  async init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) await Auth.onLogin(session.user);
    else Router.go('login');

    sb.auth.onAuthStateChange(async (event, session) => {
      /* Evita dupla chamada: getSession já executou onLogin para sessão existente.
         Só chama onLogin para SIGNED_IN se ainda não há usuário no estado (login novo). */
      if (event === 'SIGNED_IN' && session?.user && !State.user) {
        await Auth.onLogin(session.user);
      }
      if (event === 'SIGNED_OUT') {
        State.user   = null;
        State.perfil = null;
        /* Reabilita o botão de login — fica desabilitado se o login
           foi bem-sucedido e o usuário fez logout logo depois. */
        const btn = document.getElementById('loginBtn');
        if (btn) {
          btn.disabled  = false;
          btn.innerHTML = '<span class="material-icons-round">login</span> Entrar';
        }
        Router.go('login');
      }
    });
  },

  async onLogin(user) {
    State.user = user;
    await Time.init();

    const { data: perfil, error: perfilErr } = await sb
      .from('colaboradores')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (perfilErr) console.error('[Auth] erro ao buscar perfil:', perfilErr);

    State.perfil     = perfil;
    State.role       = perfil?.role       ?? 'colaborador';
    State.permissoes = perfil?.permissoes ?? ['os', 'ponto'];

    if (State.role === 'admin') {
      UI_Admin.init();
      Router.go('admin-home');
    } else {
      UI_Colab.init();
      Router.go('colab-home');
    }

    OS.load();
  },

  async logout() {
    Ponto.stopCamera();
    await sb.auth.signOut();
  }
};
