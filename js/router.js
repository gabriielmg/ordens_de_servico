/* ==========================================================
   ROUTER — Navegação entre telas
========================================================== */
import { State } from './state.js';

export const Router = {
  current: null,

  /** Navega para uma tela pelo id (sem o prefixo 'screen-') */
  go(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const next = document.getElementById(`screen-${screenId}`);
    if (next) next.classList.add('active');
    Router.current = screenId;

    // Bottom nav: visível apenas nas telas de colaborador (não na tela de ponto)
    const isColab  = ['colab-home', 'os'].includes(screenId);
    const bottomNav = document.getElementById('bottomNav');
    bottomNav.classList.toggle('visible', isColab && State.role !== 'admin');

    // Atualiza estado ativo dos botões da bottom nav
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === screenId);
    });

    // Botão voltar da tela OS
    const osBtnBack = document.getElementById('osBtnBack');
    if (osBtnBack) osBtnBack.onclick = () => Router.goHome();
  },

  /** Navega para a home correta de acordo com o role */
  goHome() {
    if (State.role === 'admin') Router.go('admin-home');
    else Router.go('colab-home');
  }
};
