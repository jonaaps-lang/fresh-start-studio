-- =============================================================================
-- FASE 5: Módulo de Produção
-- =============================================================================

-- 1) production_orders --------------------------------------------------------
CREATE TABLE public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  descricao_servico TEXT,
  prioridade TEXT NOT NULL DEFAULT 'media',
  responsavel_id UUID,
  setor TEXT,
  prazo_producao DATE,
  data_prevista DATE,
  data_conclusao DATE,
  observacoes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  UNIQUE (empresa_id, numero)
);
CREATE INDEX idx_production_orders_empresa ON public.production_orders(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_production_orders_order ON public.production_orders(order_id);
CREATE INDEX idx_production_orders_customer ON public.production_orders(customer_id);
CREATE INDEX idx_production_orders_responsavel ON public.production_orders(responsavel_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_orders TO authenticated;
GRANT ALL ON public.production_orders TO service_role;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_orders_select" ON public.production_orders FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
CREATE POLICY "prod_orders_insert" ON public.production_orders FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.create',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  );
CREATE POLICY "prod_orders_update" ON public.production_orders FOR UPDATE TO authenticated
  USING (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.edit',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  );
CREATE POLICY "prod_orders_delete" ON public.production_orders FOR DELETE TO authenticated
  USING (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.delete',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  );

CREATE TRIGGER trg_prod_orders_tenant BEFORE INSERT OR UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();
CREATE TRIGGER trg_prod_orders_updated BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) production_order_items ---------------------------------------------------
CREATE TABLE public.production_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(14,3) NOT NULL DEFAULT 1,
  unidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX idx_prod_items_op ON public.production_order_items(production_order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_order_items TO authenticated;
GRANT ALL ON public.production_order_items TO service_role;
ALTER TABLE public.production_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_items_select" ON public.production_order_items FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
CREATE POLICY "prod_items_write" ON public.production_order_items FOR ALL TO authenticated
  USING (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.edit',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  )
  WITH CHECK (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.edit',empresa_id)
      OR public.has_permission(auth.uid(),'producao.create',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  );

-- Reuso do trigger genérico (não requer parent lookup — empresa vem por default).
CREATE OR REPLACE FUNCTION public.tg_prod_items_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  SELECT empresa_id INTO v FROM public.production_orders WHERE id = NEW.production_order_id;
  NEW.empresa_id := v;
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_prod_items_fill BEFORE INSERT OR UPDATE ON public.production_order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_prod_items_fill();
CREATE TRIGGER trg_prod_items_updated BEFORE UPDATE ON public.production_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) production_order_attachments ---------------------------------------------
CREATE TABLE public.production_order_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  nome TEXT NOT NULL,
  mime TEXT,
  size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX idx_prod_att_op ON public.production_order_attachments(production_order_id);

GRANT SELECT, INSERT, DELETE ON public.production_order_attachments TO authenticated;
GRANT ALL ON public.production_order_attachments TO service_role;
ALTER TABLE public.production_order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_att_select" ON public.production_order_attachments FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
CREATE POLICY "prod_att_insert" ON public.production_order_attachments FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.edit',empresa_id)
      OR public.has_permission(auth.uid(),'producao.create',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  );
CREATE POLICY "prod_att_delete" ON public.production_order_attachments FOR DELETE TO authenticated
  USING (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.edit',empresa_id)
      OR public.has_permission(auth.uid(),'producao.delete',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  );

CREATE OR REPLACE FUNCTION public.tg_prod_att_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  SELECT empresa_id INTO v FROM public.production_orders WHERE id = NEW.production_order_id;
  NEW.empresa_id := v;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_prod_att_fill BEFORE INSERT ON public.production_order_attachments
  FOR EACH ROW EXECUTE FUNCTION public.tg_prod_att_fill();

-- 4) production_time_entries (apontamentos) -----------------------------------
CREATE TABLE public.production_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  operator_id UUID,
  tipo TEXT NOT NULL, -- inicio|pausa|retomada|termino|nota|atraso
  motivo TEXT,
  observacao TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX idx_prod_time_op ON public.production_time_entries(production_order_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.production_time_entries TO authenticated;
GRANT ALL ON public.production_time_entries TO service_role;
ALTER TABLE public.production_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_time_select" ON public.production_time_entries FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
CREATE POLICY "prod_time_insert" ON public.production_time_entries FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT public.user_empresa_ids())
    AND (public.has_permission(auth.uid(),'producao.edit',empresa_id)
      OR public.has_permission(auth.uid(),'producao.view',empresa_id)
      OR public.has_role(auth.uid(),'desenvolvedor'))
  );

CREATE OR REPLACE FUNCTION public.tg_prod_time_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  SELECT empresa_id INTO v FROM public.production_orders WHERE id = NEW.production_order_id;
  NEW.empresa_id := v;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.operator_id IS NULL THEN NEW.operator_id := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_prod_time_fill BEFORE INSERT ON public.production_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_prod_time_fill();

-- 5) Numeração ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_production_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.next_document_number('production','OP');
END; $$;
GRANT EXECUTE ON FUNCTION public.next_production_number() TO authenticated;

-- 6) Workflow padrão da produção ---------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_production_workflow(_empresa UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wf UUID; v_fila UUID; v_prod UUID; v_pausa UUID; v_ok UUID; v_can UUID;
BEGIN
  SELECT id INTO v_wf FROM public.workflows
   WHERE empresa_id = _empresa AND entidade = 'production' AND codigo = 'padrao';
  IF v_wf IS NOT NULL THEN RETURN v_wf; END IF;

  INSERT INTO public.workflows (empresa_id, entidade, codigo, nome, descricao, ativo, is_default)
    VALUES (_empresa, 'production', 'padrao', 'Padrão de Produção',
            'Fluxo padrão de Ordens de Produção. Pode ser customizado por empresa.',
            true, true)
  RETURNING id INTO v_wf;

  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'fila', 'Fila', 10, true, false, '#94a3b8') RETURNING id INTO v_fila;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'em_producao', 'Em produção', 20, false, false, '#3b82f6') RETURNING id INTO v_prod;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'pausado', 'Pausado', 30, false, false, '#f59e0b') RETURNING id INTO v_pausa;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'concluido', 'Concluído', 40, false, true, '#22c55e') RETURNING id INTO v_ok;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'cancelado', 'Cancelado', 50, false, true, '#ef4444') RETURNING id INTO v_can;

  INSERT INTO public.workflow_transitions
    (empresa_id, workflow_id, from_state_id, to_state_id, nome, permission_required, requires_motivo, requires_approval, ordem)
  VALUES
    (_empresa, v_wf, v_fila,  v_prod,  'Iniciar produção',    'producao.edit',   false, false, 10),
    (_empresa, v_wf, v_prod,  v_pausa, 'Pausar',              'producao.edit',   true,  false, 20),
    (_empresa, v_wf, v_pausa, v_prod,  'Retomar',             'producao.edit',   false, false, 30),
    (_empresa, v_wf, v_prod,  v_ok,    'Concluir',            'producao.edit',   false, false, 40),
    (_empresa, v_wf, v_fila,  v_can,   'Cancelar',            'producao.cancel', true,  true,  90),
    (_empresa, v_wf, v_prod,  v_can,   'Cancelar',            'producao.cancel', true,  true,  91),
    (_empresa, v_wf, v_pausa, v_can,   'Cancelar',            'producao.cancel', true,  true,  92);

  RETURN v_wf;
END; $$;

-- Seed para empresas existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_default_production_workflow(r.id);
  END LOOP;
END $$;

-- Hook para novas empresas
CREATE OR REPLACE FUNCTION public.tg_seed_production_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_production_workflow(NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_companies_seed_production_wf AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_production_workflow();
