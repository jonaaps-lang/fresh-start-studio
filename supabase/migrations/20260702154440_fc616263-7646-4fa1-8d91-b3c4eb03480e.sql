-- ============================================================
-- Motor de Configuração — tabela genérica por empresa/categoria
-- ============================================================
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE UNIQUE INDEX app_settings_empresa_category_uniq
  ON public.app_settings(empresa_id, category)
  WHERE deleted_at IS NULL;

CREATE INDEX app_settings_empresa_idx ON public.app_settings(empresa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings tenant read" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_member_of_empresa(empresa_id) AND deleted_at IS NULL);

CREATE POLICY "app_settings tenant insert" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_empresa(empresa_id));

CREATE POLICY "app_settings tenant update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_member_of_empresa(empresa_id))
  WITH CHECK (public.is_member_of_empresa(empresa_id));

CREATE POLICY "app_settings tenant delete" ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.is_member_of_empresa(empresa_id));

-- Preencher empresa_id/updated_by automaticamente (reaproveita função já existente)
CREATE TRIGGER trg_app_settings_tenant
  BEFORE INSERT OR UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Histórico de versões
-- ============================================================
CREATE TABLE public.app_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  category TEXT NOT NULL,
  data JSONB NOT NULL,
  version INT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID
);

CREATE INDEX app_settings_history_lookup_idx
  ON public.app_settings_history(empresa_id, category, changed_at DESC);

GRANT SELECT ON public.app_settings_history TO authenticated;
GRANT ALL ON public.app_settings_history TO service_role;

ALTER TABLE public.app_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_history tenant read" ON public.app_settings_history
  FOR SELECT TO authenticated
  USING (public.is_member_of_empresa(empresa_id));

-- Gatilho que grava a versão anterior e incrementa a nova
CREATE OR REPLACE FUNCTION public.tg_app_settings_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.data IS DISTINCT FROM OLD.data) THEN
    NEW.version := OLD.version + 1;
    INSERT INTO public.app_settings_history (empresa_id, category, data, version, changed_by)
      VALUES (OLD.empresa_id, OLD.category, OLD.data, OLD.version, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_settings_history
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_app_settings_history();

-- ============================================================
-- Ampliar soft_delete para reconhecer a nova tabela
-- ============================================================
CREATE OR REPLACE FUNCTION public.soft_delete(_table text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _table NOT IN (
    'customers','suppliers','products','quotes','orders',
    'company_settings','app_settings'
  ) THEN
    RAISE EXCEPTION 'tabela % não suporta soft delete', _table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now(), deleted_by = auth.uid()
      WHERE id = $1 AND empresa_id IN (SELECT public.user_empresa_ids())',
    _table
  ) USING _id;
END;
$$;