/* ==========================================================
   UI — Helpers de interface (toast, modal, loading)
========================================================== */
export const UI = {
  _toastTimer: null,

  /** Exibe uma mensagem toast */
  toast(msg, type = '', duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = `show ${type}`;
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => { el.className = ''; }, duration);
  },

  /** Abre um modal pelo id */
  openModal(id)  { document.getElementById(id).classList.add('open'); },

  /** Fecha um modal pelo id */
  closeModal(id) { document.getElementById(id).classList.remove('open'); },

  /** Alterna estado de carregamento em um botão */
  setLoading(btnId, loading, text = 'Salvar') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled  = loading;
    btn.innerHTML = loading
      ? '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></span>'
      : text;
  }
};
