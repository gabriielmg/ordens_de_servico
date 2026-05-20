/* ==========================================================
   OS — Integração com Google Sheets (Ordens de Serviço)
========================================================== */
import { CFG }    from './config.js';
import { State }  from './state.js';
import { U }      from './utils.js';
import { UI }     from './ui.js';

export const OS = {
  /** Carrega OS do Google Sheets com cache de 5 minutos */
  async load() {
    const now = Date.now();
    if (State.osCache && (now - State.osCacheAt) < CFG.cacheMS) {
      OS._finalize(State.osCache);
      return;
    }

    let rows = [], abaUsada = null;

    // Tenta cada aba configurada
    for (const name of CFG.sheets.names) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.sheets.id}/values/${encodeURIComponent(name)}!${CFG.sheets.cols}?key=${CFG.sheets.key}`;
        const r   = await fetch(url);
        if (!r.ok) continue;
        const d = await r.json();
        if (d.values && d.values.length > 1) { rows = d.values.slice(1); abaUsada = name; break; }
      } catch { continue; }
    }

    // Fallback: tenta sem nome de aba
    if (!abaUsada) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CFG.sheets.id}/values/${CFG.sheets.cols}?key=${CFG.sheets.key}`;
        const r   = await fetch(url);
        if (r.ok) { const d = await r.json(); rows = (d.values || []).slice(1); abaUsada = 'aba1'; }
      } catch {}
    }

    if (!abaUsada) { OS._error(); return; }

    const list = rows
      .map(r => ({
        capela:    (r[0] || '').trim(),
        numeroOS:  (r[1] || '').trim(),
        dataStr:   U.fmtData((r[2] || '').trim()),
        assunto:   (r[3] || '').trim(),
        descricao: (r[4] || '').trim(),
        dataObj:   U.parseData((r[2] || '').trim())
      }))
      .filter(os => os.capela && os.dataObj)
      .sort((a, b) => a.dataObj - b.dataObj);

    State.osCache   = list;
    State.osCacheAt = Date.now();
    OS._finalize(list);
  },

  _finalize(list) {
    State.allOS = list;
    OS.updateKPIs();
    OS.updateChapelSelect();
    OS.render();
    OS.renderAdmin();
  },

  _error() {
    const html = `<div class="state-box">
      <span class="material-icons-round">cloud_off</span>
      <p>Não foi possível carregar as OS.</p>
    </div>`;
    const osList = document.getElementById('osList');
    const aList  = document.getElementById('adminOsList');
    if (osList) osList.innerHTML = html;
    if (aList)  aList.innerHTML  = html;
  },

  async reload() {
    State.osCache = null;
    const icon = document.querySelector('#reloadBtn .material-icons-round');
    if (icon) icon.classList.add('spinning');
    await OS.load();
    if (icon) icon.classList.remove('spinning');
    UI.toast('Dados atualizados', 'success');
  },

  setFilter(f, isAdmin = false) {
    if (isAdmin) State.adminFilter = f;
    else         State.osFilter    = f;

    document.querySelectorAll(isAdmin ? '[data-af]' : '[data-f]').forEach(p => {
      p.classList.toggle('active', p.dataset[isAdmin ? 'af' : 'f'] === f);
    });
    document.querySelectorAll('.kpi-card[data-kpi]').forEach(c => {
      c.classList.toggle('selected', c.dataset.kpi === f);
    });

    isAdmin ? OS.renderAdmin() : OS.render();
  },

  _filtered(adminMode = false) {
    const f      = adminMode ? State.adminFilter : State.osFilter;
    const search = (document.getElementById(adminMode ? 'adminOsSearch' : 'osSearch')?.value || '').toLowerCase().trim();
    const chapel = adminMode ? '' : (document.getElementById('chapelSelect')?.value || '');
    let list     = State.allOS;

    if (f !== 'all') list = list.filter(os => {
      const d = U.diffDays(os.dataObj);
      if (f === 'overdue')   return d < 0;
      if (f === 'today')     return d === 0;
      if (f === 'week')      return U.estaSemanaDaData(os.dataObj);
      if (f === 'fortnight') return d > 0 && d <= 14;
      return true;
    });
    if (chapel) list = list.filter(os => os.capela === chapel);
    if (search) list = list.filter(os =>
      os.capela.toLowerCase().includes(search)   ||
      os.numeroOS.toLowerCase().includes(search) ||
      os.assunto.toLowerCase().includes(search)
    );
    return list;
  },

  _cardHTML(os, i) {
    const diff   = U.diffDays(os.dataObj);
    const status = U.getStatus(diff, os.dataObj);
    return `<div class="os-card ${status}" role="listitem" style="animation-delay:${Math.min(i * .04, .3)}s">
      <div class="os-card-inner">
        <div class="os-top">
          <div class="os-chapel">${U.esc(os.capela)}</div>
          <span class="badge ${U.statusBadge[status]}">${U.statusLabel[status]}</span>
        </div>
        <div class="os-subject">${U.esc(os.assunto) || 'Sem assunto'}</div>
        <div class="os-footer">
          ${os.numeroOS ? `<span class="os-num">OS ${U.esc(os.numeroOS)}</span>` : ''}
          <span class="os-date">
            <span class="material-icons-round">event</span>${U.esc(os.dataStr)}
          </span>
          <span class="os-days">${U.diffLabel(diff)}</span>
        </div>
        ${os.descricao ? `<div class="os-desc">${U.esc(os.descricao)}</div>` : ''}
      </div>
    </div>`;
  },

  render() {
    const list   = OS._filtered(false);
    const cnt    = document.getElementById('osCount');
    const osList = document.getElementById('osList');
    if (!osList) return;
    if (cnt) cnt.textContent = `${list.length} OS`;
    osList.innerHTML = list.length
      ? list.map((os, i) => OS._cardHTML(os, i)).join('')
      : `<div class="state-box"><span class="material-icons-round">inbox</span><p>Nenhuma OS encontrada</p></div>`;
  },

  renderAdmin() {
    const list = OS._filtered(true);
    const el   = document.getElementById('adminOsList');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((os, i) => OS._cardHTML(os, i)).join('')
      : `<div class="state-box"><span class="material-icons-round">inbox</span><p>Nenhuma OS encontrada</p></div>`;
    const v = document.getElementById('aDashVencidas');
    if (v) v.textContent = State.allOS.filter(os => U.diffDays(os.dataObj) < 0).length;
  },

  updateKPIs() {
    const t = State.allOS.length;
    const o = State.allOS.filter(os => U.diffDays(os.dataObj) < 0).length;
    const d = State.allOS.filter(os => U.diffDays(os.dataObj) === 0).length;
    const w = State.allOS.filter(os => U.estaSemanaDaData(os.dataObj)).length;
    const f = State.allOS.filter(os => { const x = U.diffDays(os.dataObj); return x > 0 && x <= 14; }).length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('kpiTotal', t); set('kpiOverdue', o); set('kpiToday', d); set('kpiWeek', w); set('kpiFort', f);
    set('aDashVencidas', o);
  },

  updateChapelSelect() {
    const sel = document.getElementById('chapelSelect');
    if (!sel) return;
    const names = [...new Set(State.allOS.map(os => os.capela))].sort();
    sel.innerHTML = '<option value="">Todas as Capelas</option>' +
      names.map(n => `<option value="${U.esc(n)}">${U.esc(n)}</option>`).join('');
  }
};
