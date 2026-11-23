-- =============================================================================
-- MORANO — Compras v3: missão, prioridade, histórico de compras
-- =============================================================================

-- Adiciona mission e priority em shopping_items
ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS mission text
    CHECK (mission IN ('abastecimento', 'reposicao', 'ocasioes')),
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'urgente'));

-- Grants para as novas colunas
GRANT INSERT (mission, priority) ON public.shopping_items TO authenticated;
GRANT UPDATE (mission, priority) ON public.shopping_items TO authenticated;

-- -----------------------------------------------------------------------------
-- shopping_sessions: histórico de compras finalizadas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id     uuid        NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  finished_by uuid        NOT NULL REFERENCES public.profiles(id),
  items_count int         NOT NULL DEFAULT 0,
  items       jsonb       NOT NULL DEFAULT '[]',
  finished_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_sessions_home
  ON public.shopping_sessions (home_id, finished_at DESC);

ALTER TABLE public.shopping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home members can view sessions" ON public.shopping_sessions
  FOR SELECT TO authenticated
  USING (public.is_home_member(home_id));

CREATE POLICY "home members can insert sessions" ON public.shopping_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_home_member(home_id));

REVOKE ALL ON public.shopping_sessions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.shopping_sessions TO authenticated;
