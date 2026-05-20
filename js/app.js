/* ==========================================================
   APP — Ponto de entrada: conecta módulos e inicializa o app
========================================================== */
import { Auth }   from './auth.js';
import { Admin }  from './admin.js';
import { OS }     from './os.js';
import { Ponto }  from './ponto.js';
import { Router } from './router.js';
import { UI }     from './ui.js';
import { sb }     from './supabase.js';

/* ----------------------------------------------------------
   Expõe módulos globalmente para os handlers onclick do HTML.
   ES modules têm escopo isolado; os atributos onclick="X.y()"
   precisam de X no window para funcionar.
---------------------------------------------------------- */
window.Auth   = Auth;
window.Admin  = Admin;
window.OS     = OS;
window.Ponto  = Ponto;
window.Router = Router;
window.UI     = UI;

/* ----------------------------------------------------------
   Formulário de login
---------------------------------------------------------- */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const msg   = document.getElementById('authMsg');
  const btn   = document.getElementById('loginBtn');

  msg.textContent = '';
  btn.disabled    = true;
  btn.innerHTML   = '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></span>';

  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    msg.textContent = 'E-mail ou senha incorretos.';
    btn.disabled    = false;
    btn.innerHTML   = '<span class="material-icons-round">login</span> Entrar';
  }
});

/* ----------------------------------------------------------
   Fecha modais ao clicar fora (no overlay)
---------------------------------------------------------- */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

/* ----------------------------------------------------------
   Inicia o app
---------------------------------------------------------- */
Auth.init();
