/* ==========================================================
   UTILS — Funções utilitárias puras
========================================================== */
import { State }  from './state.js';
import { CFG }    from './config.js';

export const U = {
  /** Escapa HTML para evitar XSS */
  esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  /** Converte string "dd/mm/yyyy" → Date */
  parseData(str) {
    if (!str) return null;
    const part = str.split(' ')[0].trim();
    const [d, m, y] = part.split('/');
    if (!d || !m || !y) return null;
    const dt = new Date(+y, +m - 1, +d);
    return isNaN(dt.getTime()) ? null : dt;
  },

  /** Retorna apenas a parte de data de uma string */
  fmtData(str) { return str ? str.split(' ')[0].trim() : ''; },

  /** Diferença em dias entre uma data e hoje */
  diffDays(dt) {
    const alvo = new Date(dt); alvo.setHours(0, 0, 0, 0);
    return Math.round((alvo - State.hoje) / 864e5);
  },

  /** Verifica se uma data está dentro da semana corrente */
  estaSemanaDaData(dt) {
    const alvo = new Date(dt); alvo.setHours(0, 0, 0, 0);
    return alvo > State.hoje && alvo <= State.fimSemana;
  },

  /** Classifica uma OS em overdue / today / week / future */
  getStatus(diff, dataObj) {
    if (diff < 0)                    return 'overdue';
    if (diff === 0)                  return 'today';
    if (U.estaSemanaDaData(dataObj)) return 'week';
    return 'future';
  },

  /** Label de prazo legível */
  diffLabel(diff) {
    if (diff < 0)   return `Venceu há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}`;
    if (diff === 0) return 'VENCE HOJE';
    if (diff === 1) return 'Falta 1 dia';
    return `Faltam ${diff} dias`;
  },

  statusLabel: { overdue: 'VENCIDA', today: 'VENCE HOJE', week: 'ESTA SEMANA', future: 'NO PRAZO' },
  statusBadge: { overdue: 'badge-red', today: 'badge-orange', week: 'badge-yellow', future: 'badge-green' },

  /** Distância Haversine entre duas coordenadas (metros) */
  calcDist(lat1, lon1, lat2, lon2) {
    const R  = 6371000;
    const dL = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a  = Math.sin(dL / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dl / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  },

  /** Captura e comprime frame do vídeo como JPEG base64 */
  async compressImage(videoEl) {
    const c = document.createElement('canvas');
    c.width  = CFG.imgWidth;
    c.height = CFG.imgHeight;
    c.getContext('2d').drawImage(videoEl, 0, 0, CFG.imgWidth, CFG.imgHeight);
    return c.toDataURL('image/jpeg', CFG.imgQuality);
  },

  /** Converte base64 para Blob (upload) */
  b64toBlob(b64, mime = 'image/jpeg') {
    const bin = atob(b64.split(',')[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  },

  /** Formata ISO string como data/hora em pt-BR */
  fmtHora(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  /** Retorna hoje no formato YYYY-MM-DD usando horário do Brasil (State.hoje) quando disponível */
  hoje() {
    const d = State.hoje ? new Date(State.hoje) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};
