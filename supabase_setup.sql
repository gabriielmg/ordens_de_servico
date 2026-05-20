-- ============================================================
-- OrdemFácil — Setup Supabase (PostgreSQL)
-- Execute este script no Supabase > SQL Editor
-- ============================================================

-- 1. COLABORADORES (vinculado a auth.users)
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  cargo       TEXT DEFAULT 'Colaborador',
  telefone    TEXT,
  role        TEXT DEFAULT 'colaborador' CHECK (role IN ('admin', 'colaborador')),
  ativo       BOOLEAN DEFAULT TRUE,
  permissoes  TEXT[] DEFAULT ARRAY['os','ponto'],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: adiciona permissoes se a tabela já existir
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS permissoes TEXT[] DEFAULT ARRAY['os','ponto'];

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprio perfil" ON public.colaboradores
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin lê todos os perfis" ON public.colaboradores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = auth.uid() AND c.role = 'admin')
  );

CREATE POLICY "Admin edita todos os perfis" ON public.colaboradores
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = auth.uid() AND c.role = 'admin')
  );

-- 2. LOCAIS PERMITIDOS para bater ponto
CREATE TABLE IF NOT EXISTS public.locais_permitidos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  endereco     TEXT,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  raio_metros  INTEGER DEFAULT 500,
  ativo        BOOLEAN DEFAULT TRUE,
  criado_por   UUID REFERENCES public.colaboradores(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.locais_permitidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem locais ativos" ON public.locais_permitidos
  FOR SELECT TO authenticated USING (ativo = TRUE);

CREATE POLICY "Admin gerencia locais" ON public.locais_permitidos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = auth.uid() AND c.role = 'admin')
  );

-- 3. PONTOS (registros de ponto)
CREATE TABLE IF NOT EXISTS public.pontos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id   UUID NOT NULL REFERENCES public.colaboradores(id),
  colaborador_nome TEXT,
  tipo             TEXT NOT NULL DEFAULT 'entrada' CHECK (tipo IN ('entrada','intervalo','volta_intervalo','saida')),
  registrado_em    TIMESTAMPTZ DEFAULT NOW(),
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  local_id         UUID REFERENCES public.locais_permitidos(id),
  local_nome       TEXT,
  distancia_metros INTEGER,
  dentro_do_raio   BOOLEAN DEFAULT FALSE,
  foto_url         TEXT,
  observacao       TEXT,
  dispositivo      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: adiciona tipo se a tabela já existir
ALTER TABLE public.pontos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'entrada';

ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colaborador lê próprios pontos" ON public.pontos
  FOR SELECT USING (auth.uid() = colaborador_id);

CREATE POLICY "Colaborador insere próprio ponto" ON public.pontos
  FOR INSERT WITH CHECK (auth.uid() = colaborador_id);

CREATE POLICY "Admin lê todos os pontos" ON public.pontos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = auth.uid() AND c.role = 'admin')
  );

-- 4. LOGS de auditoria
CREATE TABLE IF NOT EXISTS public.logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id),
  acao           TEXT NOT NULL,
  detalhes       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin lê logs" ON public.logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = auth.uid() AND c.role = 'admin')
  );

CREATE POLICY "Autenticados inserem logs" ON public.logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = colaborador_id);

-- 5. CONFIGURAÇÕES do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave      TEXT PRIMARY KEY,
  valor      TEXT,
  descricao  TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem config" ON public.configuracoes
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin edita config" ON public.configuracoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = auth.uid() AND c.role = 'admin')
  );

INSERT INTO public.configuracoes (chave, valor, descricao) VALUES
  ('raio_padrao_metros', '500',       'Raio padrão para bater ponto (metros)'),
  ('sistema_nome',       'OrdemFácil','Nome do sistema'),
  ('ponto_ativo',        'true',      'Módulo de ponto habilitado')
ON CONFLICT (chave) DO NOTHING;

-- 6. TRIGGER: cria perfil ao registrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.colaboradores (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE: crie o bucket manualmente no Supabase Dashboard
-- Storage > New Bucket
--   Nome:   fotos-ponto
--   Public: FALSE
-- ============================================================
--
-- Depois adicione esta policy no bucket fotos-ponto:
--   Allow authenticated uploads
--   Allow owner to read own files
--   Allow admins to read all files
-- ============================================================
