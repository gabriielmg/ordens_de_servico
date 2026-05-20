/* ==========================================================
   STATE — Estado global da aplicação
========================================================== */
export const State = {
  user:         null,
  perfil:       null,
  role:         null,
  permissoes:   ['os', 'ponto'],

  // OS
  allOS:        [],
  osFilter:     'all',
  adminFilter:  'all',
  osCache:      null,
  osCacheAt:    0,

  // Datas
  hoje:         null,
  fimSemana:    null,

  // Ponto
  cameraStream: null,
  capturedB64:  null,
  geoPos:       null,
  tipoPonto:    null,
  pontosHoje:   [],
  locais:       []
};
