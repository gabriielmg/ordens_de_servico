/* ==========================================================
   SUPABASE — Clientes Supabase (anon + service_role)
========================================================== */
import { CFG } from './config.js';

/* Cliente padrão (anon key) — usado por colaboradores e admin */
export const sb = supabase.createClient(CFG.supabase.url, CFG.supabase.key);

/* Cliente admin (service_role) — necessário para criar usuários */
export const sbAdmin = CFG.supabase.serviceKey
  ? supabase.createClient(CFG.supabase.url, CFG.supabase.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;
