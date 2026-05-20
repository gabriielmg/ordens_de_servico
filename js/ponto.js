/* ==========================================================
   PONTO — Registro de ponto com câmera e GPS
========================================================== */
import { CFG }    from './config.js';
import { State }  from './state.js';
import { U }      from './utils.js';
import { UI }     from './ui.js';
import { Router } from './router.js';
import { sb }     from './supabase.js';

/* ----------------------------------------------------------
   Constantes de tipos de ponto
---------------------------------------------------------- */
export const TIPOS_PONTO = {
  entrada:         { label: 'Entrada',             desc: 'Início do expediente', icon: 'login',          color: '#16a34a', successMsg: 'Entrada registrada!' },
  intervalo:       { label: 'Início do Intervalo', desc: 'Pausa para descanso',  icon: 'free_breakfast', color: '#d97706', successMsg: 'Intervalo registrado!' },
  volta_intervalo: { label: 'Volta do Intervalo',  desc: 'Retorno ao trabalho',  icon: 'replay',         color: '#2563eb', successMsg: 'Volta registrada!' },
  saida:           { label: 'Saída',               desc: 'Fim do expediente',    icon: 'logout',         color: '#dc2626', successMsg: 'Saída registrada!' }
};

export const ORDEM_TIPOS = ['entrada', 'intervalo', 'volta_intervalo', 'saida'];

/* ----------------------------------------------------------
   Ponto — fluxo principal
---------------------------------------------------------- */
export const Ponto = {
  /** Navega para passo pelo id */
  _step(id) {
    document.querySelectorAll('.ponto-step').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`ponto-step-${id}`);
    if (el) el.classList.add('active');
  },

  /** Inicia o fluxo de registro de ponto */
  async init() {
    State.capturedB64 = null;
    State.geoPos      = null;
    State.tipoPonto   = null;
    State.pontosHoje  = [];

    Router.go('ponto');
    Ponto._step('location');

    try {
      const hoje = U.hoje();
      const { data: pontosHoje, error: qErr } = await sb
        .from('pontos')
        .select('tipo, registrado_em, local_nome, dentro_do_raio')
        .eq('colaborador_id', State.user.id)
        .gte('registrado_em', `${hoje}T00:00:00`)
        .lte('registrado_em', `${hoje}T23:59:59`)
        .order('registrado_em', { ascending: true });

      if (qErr) console.warn('[Ponto.init] query pontos:', qErr.message);
      State.pontosHoje = pontosHoje || [];

      const tiposRegistrados = State.pontosHoje.map(p => p.tipo);
      let proximo = null;
      for (const t of ORDEM_TIPOS) {
        if (!tiposRegistrados.includes(t)) { proximo = t; break; }
      }

      if (!proximo) {
        Router.goHome();
        UI.toast('Todos os pontos do dia já foram registrados!', 'success', 4000);
        return;
      }

      State.tipoPonto = proximo;
      const cfg = TIPOS_PONTO[proximo];

      const card = document.getElementById('pontoTipoCard');
      card.style.display     = 'flex';
      card.style.borderColor = cfg.color;
      document.getElementById('pontoTipoIcon').textContent = cfg.icon;
      document.getElementById('pontoTipoIcon').style.color = cfg.color;
      document.getElementById('pontoTipoNome').textContent = cfg.label;
      document.getElementById('pontoTipoDesc').textContent = cfg.desc;

      const { data: locais } = await sb.from('locais_permitidos').select('*').eq('ativo', true);
      State.locais = locais || [];

      if (!navigator.geolocation) {
        Ponto._showError('GPS não suportado', 'Seu dispositivo não suporta geolocalização.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos  => { State.geoPos = pos.coords; Ponto._startCamera(); },
        _err => Ponto._showError('Localização negada', 'Permita o acesso à sua localização para bater ponto.'),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } catch (err) {
      console.error('[Ponto.init] erro:', err);
      Ponto._showError('Erro inesperado', 'Não foi possível iniciar o ponto. Tente novamente.');
    }
  },

  /** Ativa a câmera frontal */
  async _startCamera() {
    Ponto._step('camera');
    document.getElementById('capturedImg').style.display = 'none';
    document.getElementById('cameraVideo').style.display = 'block';
    document.getElementById('captureBtn').style.display  = 'flex';
    document.getElementById('retakeBtn').style.display   = 'none';
    document.getElementById('confirmBtn').style.display  = 'none';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: CFG.imgWidth }, height: { ideal: CFG.imgHeight } },
        audio: false
      });
      State.cameraStream = stream;
      document.getElementById('cameraVideo').srcObject = stream;
    } catch {
      Ponto._showError('Câmera negada', 'Permita o acesso à câmera para registrar o ponto.');
    }
  },

  /** Captura frame da câmera */
  async capture() {
    const video = document.getElementById('cameraVideo');
    State.capturedB64 = await U.compressImage(video);

    const img = document.getElementById('capturedImg');
    img.src   = State.capturedB64;
    img.style.display                                   = 'block';
    document.getElementById('cameraVideo').style.display = 'none';
    document.getElementById('captureBtn').style.display  = 'none';
    document.getElementById('retakeBtn').style.display   = 'flex';
    document.getElementById('confirmBtn').style.display  = 'flex';
  },

  /** Descarta a foto e volta a câmera */
  retake() {
    State.capturedB64                                    = null;
    document.getElementById('capturedImg').style.display  = 'none';
    document.getElementById('cameraVideo').style.display  = 'block';
    document.getElementById('captureBtn').style.display   = 'flex';
    document.getElementById('retakeBtn').style.display    = 'none';
    document.getElementById('confirmBtn').style.display   = 'none';
  },

  /** Confirma, faz upload e salva o ponto no Supabase */
  async confirm() {
    Ponto.stopCamera();
    Ponto._step('saving');

    const { lat, lon, distancia, local, dentroDoRaio } = Ponto._validarLocal();

    if (!dentroDoRaio && State.locais.length > 0) {
      Ponto._showError(
        'Localização não autorizada',
        `Você está a ${distancia}m do local permitido mais próximo. Dirija-se a um local autorizado.`
      );
      return;
    }

    // Upload da foto (bucket privado — opcional)
    let fotoPath = null;
    try {
      const blob = U.b64toBlob(State.capturedB64);
      const path = `${State.user.id}/${Date.now()}.jpg`;
      const { data: upload, error: upErr } = await sb.storage
        .from('fotos-ponto').upload(path, blob, { contentType: 'image/jpeg' });
      if (!upErr && upload) fotoPath = upload.path;
    } catch { /* foto é opcional */ }

    const agora = new Date();

    const { error } = await sb.from('pontos').insert({
      colaborador_id:   State.user.id,
      colaborador_nome: State.perfil?.nome || '',
      tipo:             State.tipoPonto,
      latitude:         State.geoPos?.latitude,
      longitude:        State.geoPos?.longitude,
      local_id:         local?.id   || null,
      local_nome:       local?.nome || null,
      distancia_metros: distancia,
      dentro_do_raio:   dentroDoRaio,
      foto_url:         fotoPath,
      dispositivo:      navigator.userAgent.substring(0, 200)
    });

    if (error) {
      Ponto._showError('Erro ao salvar', 'Não foi possível registrar o ponto. Tente novamente.');
      return;
    }

    // Log de auditoria (opcional)
    try {
      await sb.from('logs').insert({
        colaborador_id: State.user.id,
        acao: 'ponto_registrado',
        detalhes: { tipo: State.tipoPonto, local_nome: local?.nome, dentro_do_raio: dentroDoRaio }
      });
    } catch { /* log é opcional */ }

    // Atualiza lista local e exibe sucesso
    State.pontosHoje.push({
      tipo:          State.tipoPonto,
      registrado_em: agora.toISOString(),
      local_nome:    local?.nome,
      dentro_do_raio: dentroDoRaio
    });

    const cfg = TIPOS_PONTO[State.tipoPonto];
    document.getElementById('pontoSuccessTitle').textContent = cfg.successMsg;
    document.getElementById('pontoSuccessMsg').textContent =
      `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` +
      (local ? ` — ${local.nome}` : '');

    Ponto._renderTimeline(document.getElementById('pontoTimeline'), State.pontosHoje);
    Ponto._step('success');
  },

  /** Renderiza a timeline do dia (usada na tela de sucesso) */
  _renderTimeline(container, pontos) {
    if (!container) return;
    const fmt = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Calcula total de horas trabalhadas
    let horasHtml = '';
    const get = tipo => pontos.find(p => p.tipo === tipo);
    const entrada  = get('entrada'), intervalo = get('intervalo');
    const volta    = get('volta_intervalo'), saida = get('saida');

    if (entrada && saida) {
      let mins = 0;
      if (entrada && intervalo)
        mins += (new Date(intervalo.registrado_em) - new Date(entrada.registrado_em)) / 60000;
      if (volta && saida)
        mins += (new Date(saida.registrado_em) - new Date(volta.registrado_em)) / 60000;
      else if (entrada && saida && !intervalo)
        mins = (new Date(saida.registrado_em) - new Date(entrada.registrado_em)) / 60000;

      const h = Math.floor(mins / 60), m = Math.round(mins % 60);
      horasHtml = `<div class="total-horas-card">
        <span class="material-icons-round">schedule</span>
        <div>
          <div class="total-horas-num">${h}h${m.toString().padStart(2, '0')}min</div>
          <div class="total-horas-lbl">Total trabalhado no dia</div>
        </div>
      </div>`;
    }

    container.innerHTML = `
      <div style="font-size:0.85rem;font-weight:700;color:var(--muted);margin-bottom:0.75rem;">Registro do dia</div>
      <div class="timeline">
        ${ORDEM_TIPOS.map(tipo => {
          const p   = pontos.find(pt => pt.tipo === tipo);
          const cfg = TIPOS_PONTO[tipo];
          if (!p) return `<div class="timeline-item" style="opacity:0.35">
            <div class="timeline-dot" style="background:#e2e8f0">
              <span class="material-icons-round" style="color:#94a3b8">${cfg.icon}</span>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-info">
              <div class="timeline-label">${cfg.label}</div>
              <div class="timeline-hora">—</div>
            </div>
          </div>`;
          return `<div class="timeline-item">
            <div class="timeline-dot" style="background:${cfg.color}">
              <span class="material-icons-round">${cfg.icon}</span>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-info">
              <div class="timeline-label">${cfg.label}</div>
              <div class="timeline-hora">${fmt(p.registrado_em)}${p.local_nome ? ` — ${U.esc(p.local_nome)}` : ''}</div>
              ${p.dentro_do_raio !== undefined
                ? `<span class="ponto-geo ${p.dentro_do_raio ? 'ok' : 'nok'}">${p.dentro_do_raio ? '✓ Dentro do raio' : '✗ Fora do raio'}</span>`
                : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      ${horasHtml}`;
  },

  /** Valida localização do colaborador contra os locais permitidos */
  _validarLocal() {
    const lat = State.geoPos?.latitude;
    const lon = State.geoPos?.longitude;
    if (!lat || !lon || State.locais.length === 0) {
      return { lat, lon, distancia: 0, local: null, dentroDoRaio: true };
    }
    let melhor = null, menorDist = Infinity;
    for (const l of State.locais) {
      const d = U.calcDist(lat, lon, l.latitude, l.longitude);
      if (d < menorDist) { menorDist = d; melhor = l; }
    }
    return {
      lat, lon,
      distancia:    menorDist,
      local:        melhor,
      dentroDoRaio: menorDist <= (melhor?.raio_metros || 500)
    };
  },

  _showError(titulo, msg) {
    Ponto.stopCamera();
    document.getElementById('pontoErrorTitle').textContent = titulo;
    document.getElementById('pontoErrorMsg').textContent   = msg;
    Ponto._step('error');
  },

  /** Para todos os tracks da câmera */
  stopCamera() {
    if (State.cameraStream) {
      State.cameraStream.getTracks().forEach(t => t.stop());
      State.cameraStream = null;
    }
  },

  cancel() {
    Ponto.stopCamera();
    Router.goHome();
  }
};
