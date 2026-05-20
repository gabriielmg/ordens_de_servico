/* ==========================================================
   ADMIN — Painel de gestão (dashboard, pontos, colaboradores, locais)
========================================================== */
import { State }                    from './state.js';
import { U }                        from './utils.js';
import { UI }                       from './ui.js';
import { sb, sbAdmin }              from './supabase.js';
import { TIPOS_PONTO, ORDEM_TIPOS } from './ponto.js';

export const Admin = {
  _listenersAdded: false,
  _pontosDoDia:    [],

  /** Inicializa o painel de gestão */
  init() {
    Admin.loadDashboard();
    Admin.loadPontos();
    Admin.loadColaboradores();
    Admin.loadLocais();

    if (!Admin._listenersAdded) {
      document.getElementById('localForm').addEventListener('submit', Admin.saveLocal);
      document.getElementById('colabForm').addEventListener('submit', Admin.saveColab);
      Admin._listenersAdded = true;
    }

    const pf = document.getElementById('pontoFiltroData');
    if (pf) pf.value = U.hoje();
  },

  /** Alterna aba do painel admin */
  tab(id) {
    document.querySelectorAll('.admin-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === id)
    );
    document.querySelectorAll('.admin-section').forEach(s =>
      s.classList.toggle('active', s.id === `tab-${id}`)
    );
  },

  /* --------------------------------------------------------
     DASHBOARD
  -------------------------------------------------------- */
  async loadDashboard() {
    const { count: colabs, error: eColabs } = await sb
      .from('colaboradores')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    const today = U.hoje();
    const { count: pontos, error: ePontos } = await sb
      .from('pontos')
      .select('*', { count: 'exact', head: true })
      .gte('registrado_em', `${today}T00:00:00`)
      .lte('registrado_em', `${today}T23:59:59`);

    if (eColabs) console.error('[Admin.loadDashboard] colaboradores:', eColabs.message);
    if (ePontos) console.error('[Admin.loadDashboard] pontos:', ePontos.message);

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? 0; };
    set('aDashColabs', colabs);
    set('aDashPontos', pontos);

    const { data: recent, error: eRecent } = await sb
      .from('pontos')
      .select('*')
      .order('registrado_em', { ascending: false })
      .limit(10);
    if (eRecent) console.error('[Admin.loadDashboard] recent pontos:', eRecent.message);
    await Admin._renderPontos('adminRecentPontos', recent || []);
  },

  /* --------------------------------------------------------
     PONTOS
  -------------------------------------------------------- */
  async loadPontos() {
    const date = document.getElementById('pontoFiltroData')?.value || U.hoje();
    const { data, error } = await sb
      .from('pontos')
      .select('*')
      .gte('registrado_em', `${date}T00:00:00`)
      .lte('registrado_em', `${date}T23:59:59`)
      .order('registrado_em', { ascending: true });

    if (error) console.error('[Admin.loadPontos]', error.message);
    Admin._pontosDoDia = data || [];
    const busca = document.getElementById('pontoFiltroNome')?.value || '';
    await Admin._renderPontos('adminPontosList', Admin._filtrarPorNome(Admin._pontosDoDia, busca));
  },

  _filtrarPorNome(pontos, busca) {
    if (!busca.trim()) return pontos;
    const q = busca.trim().toLowerCase();
    return pontos.filter(p => (p.colaborador_nome || '').toLowerCase().includes(q));
  },

  async filtrarPontos() {
    const busca = document.getElementById('pontoFiltroNome')?.value || '';
    await Admin._renderPontos('adminPontosList', Admin._filtrarPorNome(Admin._pontosDoDia, busca));
  },

  /** Renderiza lista de pontos agrupada por colaborador + dia (collapsível) */
  async _renderPontos(containerId, pontos) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!pontos.length) {
      el.innerHTML = `<div class="state-box">
        <span class="material-icons-round">fingerprint</span>
        <p>Nenhum ponto registrado</p>
      </div>`;
      return;
    }

    // Gera signed URLs para fotos (bucket privado)
    const signedUrls = {};
    await Promise.all(pontos.filter(p => p.foto_url).map(async p => {
      try {
        const { data } = await sb.storage.from('fotos-ponto').createSignedUrl(p.foto_url, 3600);
        if (data?.signedUrl) signedUrls[p.id] = data.signedUrl;
      } catch {}
    }));

    const fmt = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Agrupa por colaborador + dia
    const grupos = {};
    for (const p of pontos) {
      const dia   = p.registrado_em.split('T')[0];
      const chave = `${dia}__${p.colaborador_id}`;
      if (!grupos[chave]) grupos[chave] = { dia, nome: p.colaborador_nome || 'Colaborador', pontos: [] };
      grupos[chave].pontos.push(p);
    }

    // Agrupa por data
    const porDia = {};
    for (const g of Object.values(grupos)) {
      if (!porDia[g.dia]) porDia[g.dia] = [];
      porDia[g.dia].push(g);
    }

    const diasOrdenados = Object.keys(porDia).sort().reverse();

    el.innerHTML = diasOrdenados.map(dia => {
      const grpsDia  = porDia[dia];
      const dataFmt  = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long'
      });

      return `<div class="ponto-day-group">
        <div class="ponto-day-header">${dataFmt}</div>
        ${grpsDia.map(g => {
          const ps  = g.pontos.sort((a, b) => new Date(a.registrado_em) - new Date(b.registrado_em));
          const get = t => ps.find(p => p.tipo === t);
          const ent = get('entrada'), ini = get('intervalo');
          const vol = get('volta_intervalo'), sai = get('saida');

          // Total de horas
          let totalMins = 0, temTotal = false;
          if (ent && sai) {
            temTotal = true;
            if (ini && vol) {
              totalMins = (new Date(ini.registrado_em) - new Date(ent.registrado_em)) / 60000
                        + (new Date(sai.registrado_em) - new Date(vol.registrado_em)) / 60000;
            } else {
              totalMins = (new Date(sai.registrado_em) - new Date(ent.registrado_em)) / 60000;
            }
          }
          const th = Math.floor(totalMins / 60), tm = Math.round(totalMins % 60);
          const totalStr = temTotal ? `${th}h${tm.toString().padStart(2, '0')}min` : null;

          // Linha resumo colapsada
          const partes = [];
          if (ent) partes.push(`Entrada ${fmt(ent.registrado_em)}`);
          if (ini) partes.push(`Intervalo ${fmt(ini.registrado_em)}`);
          if (vol) partes.push(`Volta ${fmt(vol.registrado_em)}`);
          if (sai) partes.push(`Saída ${fmt(sai.registrado_em)}`);
          const resumo = partes.join(' → ') || 'Sem registros';

          // Avatar (primeiro ponto com foto)
          const primFoto = ps.find(p => p.foto_url && signedUrls[p.id]);
          const avatarHtml = primFoto
            ? `<img src="${signedUrls[primFoto.id]}" class="ponto-foto" alt="foto"
                style="width:42px;height:42px;object-fit:cover;border-radius:10px;">`
            : `<div class="ponto-foto"><span class="material-icons-round">person</span></div>`;

          // Timeline detalhada (oculta por padrão)
          const timelineHtml = ORDEM_TIPOS.map(tipo => {
            const p   = ps.find(pt => pt.tipo === tipo);
            const cfg = TIPOS_PONTO[tipo];
            if (!p) return `<div class="timeline-item" style="opacity:0.3">
              <div class="timeline-dot" style="background:#e2e8f0">
                <span class="material-icons-round" style="color:#94a3b8;font-size:1rem;">${cfg.icon}</span>
              </div>
              <div class="timeline-line"></div>
              <div class="timeline-info">
                <div class="timeline-label" style="color:var(--muted)">${cfg.label}</div>
                <div style="font-size:0.8rem;color:var(--muted)">—</div>
              </div>
            </div>`;
            const url = signedUrls[p.id];
            return `<div class="timeline-item">
              <div class="timeline-dot" style="background:${cfg.color}">
                <span class="material-icons-round" style="font-size:1rem;">${cfg.icon}</span>
              </div>
              <div class="timeline-line"></div>
              <div class="timeline-info">
                <div class="timeline-label">${cfg.label}
                  <span style="font-weight:400;color:var(--muted)">${fmt(p.registrado_em)}</span>
                </div>
                ${p.local_nome ? `<div class="timeline-local">${U.esc(p.local_nome)}</div>` : ''}
                <span class="ponto-geo ${p.dentro_do_raio ? 'ok' : 'nok'}">
                  ${p.dentro_do_raio ? '✓ Dentro do raio' : `✗ Fora — ${p.distancia_metros}m`}
                </span>
                ${url ? `<br><img src="${url}" alt="foto"
                  style="margin-top:0.5rem;width:72px;height:72px;border-radius:8px;object-fit:cover;cursor:pointer;"
                  onclick="this.style.cssText=this.style.width==='72px'
                    ?'margin-top:.5rem;width:100%;border-radius:8px;object-fit:cover;cursor:pointer'
                    :'margin-top:.5rem;width:72px;height:72px;border-radius:8px;object-fit:cover;cursor:pointer'">` : ''}
              </div>
            </div>`;
          }).join('');

          return `<div class="ponto-colab-group" id="pcg-${g.dia}-${g.nome.replace(/\s/g, '')}">
            <div class="ponto-colab-summary"
                 onclick="this.closest('.ponto-colab-group').classList.toggle('expanded')">
              ${avatarHtml}
              <div class="ponto-summary-info">
                <div class="ponto-nome">${U.esc(g.nome)}</div>
                <div class="ponto-summary-line">${U.esc(resumo)}</div>
              </div>
              ${totalStr ? `<span class="ponto-horas-pill">
                <span class="material-icons-round" style="font-size:0.9rem">schedule</span>${totalStr}
              </span>` : ''}
              <span class="material-icons-round ponto-chevron">expand_more</span>
            </div>
            <div class="ponto-colab-detail">
              <div class="timeline" style="margin-top:0.25rem;">${timelineHtml}</div>
              ${temTotal ? `<div class="total-horas-card" style="margin-top:0.75rem;">
                <span class="material-icons-round">schedule</span>
                <div>
                  <div class="total-horas-num">${th}h${tm.toString().padStart(2, '0')}min</div>
                  <div class="total-horas-lbl">Total trabalhado</div>
                </div>
              </div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  },

  /* --------------------------------------------------------
     COLABORADORES
  -------------------------------------------------------- */
  async loadColaboradores() {
    const { data } = await sb.from('colaboradores').select('*').order('nome');
    const el = document.getElementById('adminColabList');
    if (!el) return;

    if (!data?.length) {
      el.innerHTML = `<div class="state-box">
        <span class="material-icons-round">group</span><p>Nenhum colaborador</p>
      </div>`;
      return;
    }

    const PERM_LABELS = { os: 'OS', ponto: 'Ponto' };
    const PERM_COLORS = { os: 'badge-blue', ponto: 'badge-green' };

    el.innerHTML = data.map(c => {
      const perms = Array.isArray(c.permissoes) ? c.permissoes : ['os', 'ponto'];
      const permBadges = perms.map(p =>
        `<span class="badge ${PERM_COLORS[p] || 'badge-gray'}" style="margin-left:2px">${PERM_LABELS[p] || p}</span>`
      ).join('');
      return `<div class="data-item">
        <div class="data-item-icon" style="background:var(--blue-bg);color:var(--blue)">
          <span class="material-icons-round">${c.role === 'admin' ? 'admin_panel_settings' : 'person'}</span>
        </div>
        <div class="data-item-info">
          <div class="data-item-title">${U.esc(c.nome)}</div>
          <div class="data-item-sub">
            ${c.cargo ? U.esc(c.cargo) + ' &nbsp;' : ''}
            <span class="badge ${c.role === 'admin' ? 'badge-blue' : 'badge-gray'}">
              ${c.role === 'admin' ? 'admin' : 'colaborador'}
            </span>
            ${!c.ativo ? `<span class="badge badge-red" style="margin-left:4px">Inativo</span>` : ''}
          </div>
          <div style="margin-top:0.3rem;font-size:0.78rem;color:var(--muted);">
            Acesso: ${permBadges || '<span style="color:var(--muted)">Nenhum</span>'}
          </div>
        </div>
        <div class="data-item-actions">
          <button class="action-btn action-btn--edit"
                  onclick="Admin.editColab(${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Editar">
            <span class="material-icons-round">edit</span>
          </button>
        </div>
      </div>`;
    }).join('');
  },

  openColabModal() {
    if (!sbAdmin) {
      UI.toast('Configure o serviceKey no CFG para criar colaboradores', 'error', 5000);
      return;
    }
    document.getElementById('colabId').value     = '';
    document.getElementById('colabEmail').value  = '';
    document.getElementById('colabSenha').value  = '';
    document.getElementById('colabNome').value   = '';
    document.getElementById('colabCargo').value  = '';
    document.getElementById('colabRole').value   = 'colaborador';
    document.getElementById('colabAtivo').value  = 'true';
    document.getElementById('permOS').checked    = true;
    document.getElementById('permPonto').checked = true;
    document.getElementById('colabContaFields').style.display = '';
    document.getElementById('colabAtivoGroup').style.display  = 'none';
    document.getElementById('colabModalTitle').textContent    = 'Novo Colaborador';
    document.getElementById('colabSubmitBtn').innerHTML =
      '<span class="material-icons-round">person_add</span> Criar';
    document.getElementById('colabEmail').required = true;
    document.getElementById('colabSenha').required = true;
    UI.openModal('modalColab');
  },

  editColab(c) {
    const perms = Array.isArray(c.permissoes) ? c.permissoes : ['os', 'ponto'];
    document.getElementById('colabId').value     = c.id;
    document.getElementById('colabNome').value   = c.nome;
    document.getElementById('colabCargo').value  = c.cargo || '';
    document.getElementById('colabRole').value   = c.role;
    document.getElementById('colabAtivo').value  = String(c.ativo);
    document.getElementById('permOS').checked    = perms.includes('os');
    document.getElementById('permPonto').checked = perms.includes('ponto');
    document.getElementById('colabContaFields').style.display = 'none';
    document.getElementById('colabAtivoGroup').style.display  = '';
    document.getElementById('colabModalTitle').textContent    = 'Editar Colaborador';
    document.getElementById('colabSubmitBtn').innerHTML =
      '<span class="material-icons-round">save</span> Salvar';
    document.getElementById('colabEmail').required = false;
    document.getElementById('colabSenha').required = false;
    UI.openModal('modalColab');
  },

  async saveColab(e) {
    e.preventDefault();
    const id    = document.getElementById('colabId').value;
    const nome  = document.getElementById('colabNome').value.trim();
    const cargo = document.getElementById('colabCargo').value.trim();
    const role  = document.getElementById('colabRole').value;
    const ativo = document.getElementById('colabAtivo').value === 'true';
    const permissoes = [];
    if (document.getElementById('permOS').checked)    permissoes.push('os');
    if (document.getElementById('permPonto').checked) permissoes.push('ponto');

    const btn = document.getElementById('colabSubmitBtn');
    btn.disabled = true;

    if (!id) {
      // CRIAR novo colaborador
      const email = document.getElementById('colabEmail').value.trim();
      const senha = document.getElementById('colabSenha').value;

      if (!sbAdmin) {
        UI.toast('serviceKey não configurado', 'error');
        btn.disabled = false; return;
      }

      const { data: authData, error: authErr } = await sbAdmin.auth.admin.createUser({
        email, password: senha,
        email_confirm: true,
        user_metadata: { nome }
      });

      if (authErr) {
        UI.toast(`Erro: ${authErr.message}`, 'error', 5000);
        btn.disabled = false; return;
      }

      // O trigger handle_new_user cria o registro base; completamos com os dados do formulário
      const { error: upErr } = await sb
        .from('colaboradores')
        .update({ nome, cargo, role, permissoes, updated_at: new Date().toISOString() })
        .eq('id', authData.user.id);

      if (upErr) console.warn('[saveColab] update perfil:', upErr.message);
      UI.closeModal('modalColab');
      UI.toast(`${nome} criado com sucesso!`, 'success');
    } else {
      // EDITAR colaborador existente
      const { error } = await sb
        .from('colaboradores')
        .update({ nome, cargo, role, ativo, permissoes, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) { UI.toast('Erro ao salvar', 'error'); btn.disabled = false; return; }
      UI.closeModal('modalColab');
      UI.toast('Colaborador atualizado', 'success');
    }

    btn.disabled = false;
    Admin.loadColaboradores();
  },

  /* --------------------------------------------------------
     LOCAIS PERMITIDOS
  -------------------------------------------------------- */
  async loadLocais() {
    const { data } = await sb.from('locais_permitidos').select('*').order('nome');
    const el = document.getElementById('adminLocaisList');
    if (!el) return;

    if (!data?.length) {
      el.innerHTML = `<div class="state-box">
        <span class="material-icons-round">location_off</span><p>Nenhum local cadastrado</p>
      </div>`;
      return;
    }

    el.innerHTML = data.map(l => `
      <div class="data-item">
        <div class="data-item-icon" style="background:var(--green-bg);color:var(--green)">
          <span class="material-icons-round">location_on</span>
        </div>
        <div class="data-item-info">
          <div class="data-item-title">${U.esc(l.nome)}</div>
          <div class="data-item-sub">
            Raio: ${l.raio_metros}m &nbsp;
            <span class="badge ${l.ativo ? 'badge-green' : 'badge-red'}">${l.ativo ? 'Ativo' : 'Inativo'}</span>
          </div>
        </div>
        <div class="data-item-actions">
          <button class="action-btn action-btn--edit"
                  onclick="Admin.editLocal(${JSON.stringify(l).replace(/"/g, '&quot;')})" title="Editar">
            <span class="material-icons-round">edit</span>
          </button>
          <button class="action-btn action-btn--delete"
                  onclick="Admin.deleteLocal('${l.id}')" title="Remover">
            <span class="material-icons-round">delete</span>
          </button>
        </div>
      </div>`).join('');
  },

  openLocalModal() {
    document.getElementById('localId').value          = '';
    document.getElementById('localLat').value         = '';
    document.getElementById('localLon').value         = '';
    document.getElementById('localLogradouro').value  = '';
    document.getElementById('localCidade').value      = '';
    document.getElementById('localUf').value          = '';
    document.getElementById('localForm').reset();
    document.getElementById('localRaioKm').value      = '0.5';
    document.getElementById('raioHint').textContent   = '= 500 metros';
    document.getElementById('cepStatus').textContent  = '';
    document.getElementById('gpsStatus').textContent  = '';
    document.getElementById('modalLocalTitle').textContent = 'Novo Local';
    UI.openModal('modalLocal');
  },

  editLocal(l) {
    document.getElementById('localId').value    = l.id;
    document.getElementById('localNome').value  = l.nome;
    document.getElementById('localRua').value   = l.endereco || '';
    document.getElementById('localLat').value   = l.latitude;
    document.getElementById('localLon').value   = l.longitude;
    const km = (l.raio_metros / 1000).toFixed(2);
    document.getElementById('localRaioKm').value      = km;
    document.getElementById('raioHint').textContent   = `= ${l.raio_metros} metros`;
    document.getElementById('cepStatus').textContent  = '';
    document.getElementById('gpsStatus').textContent  = l.latitude
      ? `📍 ${parseFloat(l.latitude).toFixed(4)}, ${parseFloat(l.longitude).toFixed(4)}`
      : '';
    document.getElementById('modalLocalTitle').textContent = 'Editar Local';
    UI.openModal('modalLocal');
  },

  formatCep(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    input.value = v;
  },

  async buscarCep() {
    const cep = document.getElementById('localCep').value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    const status = document.getElementById('cepStatus');
    status.textContent = 'Buscando…';
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (d.erro) { status.textContent = 'CEP não encontrado.'; return; }
      const rua = [d.logradouro, d.bairro].filter(Boolean).join(', ');
      document.getElementById('localRua').value        = rua;
      document.getElementById('localLogradouro').value = d.logradouro || '';
      document.getElementById('localCidade').value     = d.localidade || '';
      document.getElementById('localUf').value         = d.uf || '';
      document.getElementById('localLat').value        = '';
      document.getElementById('localLon').value        = '';
      document.getElementById('gpsStatus').textContent = '';
      status.textContent = `${d.localidade}/${d.uf}`;
    } catch {
      status.textContent = 'Erro ao buscar CEP.';
    }
  },

  updateRaioHint(val) {
    const m = Math.round(parseFloat(val || 0) * 1000);
    document.getElementById('raioHint').textContent = isNaN(m) ? '' : `= ${m} metros`;
  },

  async saveLocal(e) {
    e.preventDefault();
    const id     = document.getElementById('localId').value;
    const nome   = document.getElementById('localNome').value.trim();
    const rua    = document.getElementById('localRua').value.trim();
    const numero = document.getElementById('localNumero').value.trim();
    const cidade = document.getElementById('localCidade').value.trim();
    const uf     = document.getElementById('localUf').value.trim();
    const raioKm = parseFloat(document.getElementById('localRaioKm').value);
    let lat      = parseFloat(document.getElementById('localLat').value);
    let lon      = parseFloat(document.getElementById('localLon').value);

    const partes  = [rua, numero, cidade, uf].filter(Boolean);
    const endereco = partes.join(', ') || null;

    if (!lat || !lon) {
      if (!rua) { UI.toast('Busque um CEP ou use o GPS', 'error'); return; }
      UI.toast('Buscando coordenadas…');
      try {
        const q = encodeURIComponent([rua, numero, cidade, uf, 'Brasil'].filter(Boolean).join(', '));
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const d = await r.json();
        if (!d.length) { UI.toast('Endereço não encontrado. Use o GPS.', 'error'); return; }
        lat = parseFloat(d[0].lat);
        lon = parseFloat(d[0].lon);
      } catch {
        UI.toast('Erro ao buscar coordenadas. Use o GPS.', 'error');
        return;
      }
    }

    const obj = {
      nome, endereco,
      latitude:    lat,
      longitude:   lon,
      raio_metros: Math.round(raioKm * 1000),
      ativo:       true
    };

    const { error } = id
      ? await sb.from('locais_permitidos').update(obj).eq('id', id)
      : await sb.from('locais_permitidos').insert({ ...obj, criado_por: State.user.id });

    if (error) { UI.toast('Erro ao salvar local', 'error'); return; }
    UI.closeModal('modalLocal');
    UI.toast('Local salvo!', 'success');
    Admin.loadLocais();
  },

  async deleteLocal(id) {
    if (!confirm('Remover este local?')) return;
    const { error } = await sb.from('locais_permitidos').update({ ativo: false }).eq('id', id);
    if (error) { UI.toast('Erro ao remover', 'error'); return; }
    UI.toast('Local removido', 'success');
    Admin.loadLocais();
  },

  usarGPSLocal() {
    if (!navigator.geolocation) { UI.toast('GPS não disponível', 'error'); return; }
    UI.toast('Obtendo localização…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        document.getElementById('localLat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('localLon').value = pos.coords.longitude.toFixed(6);
        document.getElementById('gpsStatus').textContent =
          `📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        UI.toast('Localização obtida!', 'success');
      },
      () => UI.toast('Não foi possível obter localização', 'error'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }
};
