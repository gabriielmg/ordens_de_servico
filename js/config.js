/* ==========================================================
   CONFIG — Credenciais e constantes globais

   ⚠️  AVISO DE SEGURANÇA — serviceKey
   A service_role key bypassa TODAS as políticas RLS do Supabase.
   Ela está aqui porque este projeto não tem backend próprio (PWA puro).
   RISCOS:
     - Qualquer pessoa que inspecione o código-fonte no browser tem
       acesso total ao banco de dados.
   MITIGAÇÃO RECOMENDADA para produção:
     - Mover a criação de usuários para uma Supabase Edge Function
       autenticada, eliminando a necessidade do serviceKey no cliente.
     - Ou restringir o acesso ao app via rede/VPN corporativa.
========================================================== */
export const CFG = {
  supabase: {
    url: 'https://wkmdtwoqhcdsewdtvsyb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbWR0d29xaGNkc2V3ZHR2c3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTIxOTMsImV4cCI6MjA5NDgyODE5M30.4E-BCKn3LN33p311XK4m6QWNe1CJPNqSs2X7yU-LYIU',
    // ⚠️  service_role — Supabase Dashboard > Settings > API > service_role
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbWR0d29xaGNkc2V3ZHR2c3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI1MjE5MywiZXhwIjoyMDk0ODI4MTkzfQ.5Th1bTbxSPkITLGG3NcRbD6iUNM9t9klSfVqqeMk6_s'
  },
  sheets: {
    id:    '1vp45PmYUejX_zQpMWgOMC5AejB7h_wKe4DVPRVrymRU',
    key:   'AIzaSyBR-kigig741xsyRnllvtKbsxEGBQml0PE',
    names: ['Sheet1', 'Planilha1', 'Página1', 'OS', 'Ordens'],
    cols:  'A:E'
  },
  worldtime:  'https://worldtimeapi.org/api/timezone/America/Sao_Paulo',
  cacheMS:    5 * 60 * 1000,
  imgQuality: 0.7,
  imgWidth:   640,
  imgHeight:  480
};
