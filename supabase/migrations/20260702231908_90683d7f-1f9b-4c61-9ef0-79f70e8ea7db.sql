
-- =============================================================================
-- FASE 6 — Módulo Financeiro + Motores Compartilhados
-- =============================================================================

-- 1) Categorias financeiras -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  nome TEXT NOT NULL,
  cor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  UNIQUE (empresa_id, tipo, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO authenticated;
GRANT ALL ON public.finance_categories TO service_role;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY fc_select ON public.finance_categories FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY fc_insert ON public.finance_categories FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY fc_update ON public.finance_categories FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY fc_delete ON public.finance_categories FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));

CREATE TRIGGER trg_fc_tenant BEFORE INSERT OR UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();
CREATE TRIGGER trg_fc_updated BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Títulos financeiros --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receivable','payable')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  descricao TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_titles TO authenticated;
GRANT ALL ON public.finance_titles TO service_role;
ALTER TABLE public.finance_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY ft_select ON public.finance_titles FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND public.has_permission(auth.uid(),'financeiro.view',empresa_id));
CREATE POLICY ft_insert ON public.finance_titles FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids())
              AND public.has_permission(auth.uid(),'financeiro.create',empresa_id));
CREATE POLICY ft_update ON public.finance_titles FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND public.has_permission(auth.uid(),'financeiro.edit',empresa_id));
CREATE POLICY ft_delete ON public.finance_titles FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND public.has_permission(auth.uid(),'financeiro.delete',empresa_id));

CREATE TRIGGER trg_ft_tenant BEFORE INSERT OR UPDATE ON public.finance_titles
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();
CREATE TRIGGER trg_ft_updated BEFORE UPDATE ON public.finance_titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ft_empresa ON public.finance_titles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ft_customer ON public.finance_titles(customer_id);
CREATE INDEX IF NOT EXISTS idx_ft_supplier ON public.finance_titles(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ft_tipo ON public.finance_titles(tipo);

-- 3) Parcelas -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.finance_titles(id) ON DELETE CASCADE,
  numero_parcela INT NOT NULL,
  vencimento DATE NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  saldo NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE (title_id, numero_parcela)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_installments TO authenticated;
GRANT ALL ON public.finance_installments TO service_role;
ALTER TABLE public.finance_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY fi_select ON public.finance_installments FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND public.has_permission(auth.uid(),'financeiro.view',empresa_id));
CREATE POLICY fi_manage ON public.finance_installments FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND public.has_permission(auth.uid(),'financeiro.edit',empresa_id))
  WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids())
              AND public.has_permission(auth.uid(),'financeiro.edit',empresa_id));

CREATE OR REPLACE FUNCTION public.tg_fi_fill()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  SELECT empresa_id INTO v FROM public.finance_titles WHERE id = NEW.title_id;
  NEW.empresa_id := v;
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_fi_fill BEFORE INSERT OR UPDATE ON public.finance_installments
  FOR EACH ROW EXECUTE FUNCTION public.tg_fi_fill();
CREATE TRIGGER trg_fi_updated BEFORE UPDATE ON public.finance_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Pagamentos -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  installment_id UUID NOT NULL REFERENCES public.finance_installments(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.finance_titles(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  forma_pagamento TEXT,
  observacao TEXT,
  estornado_em TIMESTAMPTZ,
  estornado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_payments TO authenticated;
GRANT ALL ON public.finance_payments TO service_role;
ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY fp_select ON public.finance_payments FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND public.has_permission(auth.uid(),'financeiro.view',empresa_id));
CREATE POLICY fp_manage ON public.finance_payments FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND public.has_permission(auth.uid(),'financeiro.edit',empresa_id))
  WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids())
              AND public.has_permission(auth.uid(),'financeiro.edit',empresa_id));

CREATE OR REPLACE FUNCTION public.tg_fp_fill()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  SELECT empresa_id INTO v FROM public.finance_titles WHERE id = NEW.title_id;
  NEW.empresa_id := v;
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_fp_fill BEFORE INSERT OR UPDATE ON public.finance_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_fp_fill();
CREATE TRIGGER trg_fp_updated BEFORE UPDATE ON public.finance_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Numeração -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_finance_number(_tipo TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _tipo = 'receivable' THEN
    RETURN public.next_document_number('finance_receivable','FIN-R');
  ELSIF _tipo = 'payable' THEN
    RETURN public.next_document_number('finance_payable','FIN-P');
  ELSE
    RAISE EXCEPTION 'tipo inválido: %', _tipo;
  END IF;
END; $$;

-- 6) RPC: aplicar pagamento e ajustar saldo/estado do workflow -----------------
CREATE OR REPLACE FUNCTION public.finance_apply_payment(
  _installment_id UUID,
  _valor NUMERIC,
  _data DATE DEFAULT CURRENT_DATE,
  _forma TEXT DEFAULT NULL,
  _obs TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst RECORD; v_title RECORD; v_pay_id UUID;
  v_wf_entity TEXT; v_new_saldo NUMERIC; v_title_saldo NUMERIC;
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'valor inválido'; END IF;

  SELECT * INTO v_inst FROM public.finance_installments WHERE id = _installment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'parcela não encontrada'; END IF;

  SELECT * INTO v_title FROM public.finance_titles WHERE id = v_inst.title_id FOR UPDATE;
  IF NOT public.has_permission(auth.uid(),'financeiro.edit',v_title.empresa_id) THEN
    RAISE EXCEPTION 'permissão insuficiente';
  END IF;

  IF _valor > v_inst.saldo + 0.001 THEN
    RAISE EXCEPTION 'valor excede saldo da parcela (% > %)', _valor, v_inst.saldo;
  END IF;

  v_new_saldo := ROUND(v_inst.saldo - _valor, 2);

  INSERT INTO public.finance_payments (
    installment_id, title_id, data_pagamento, valor, forma_pagamento, observacao
  ) VALUES (_installment_id, v_title.id, _data, _valor, _forma, _obs)
  RETURNING id INTO v_pay_id;

  UPDATE public.finance_installments SET saldo = v_new_saldo WHERE id = _installment_id;

  SELECT COALESCE(SUM(saldo),0) INTO v_title_saldo
    FROM public.finance_installments WHERE title_id = v_title.id;
  UPDATE public.finance_titles SET saldo = v_title_saldo WHERE id = v_title.id;

  -- Ajusta o workflow (aberto → parcial → pago)
  v_wf_entity := CASE WHEN v_title.tipo = 'receivable' THEN 'finance_receivable' ELSE 'finance_payable' END;
  DECLARE
    v_instance UUID; v_current UUID; v_target_code TEXT; v_target_state UUID; v_trans UUID;
  BEGIN
    SELECT id, current_state_id INTO v_instance, v_current
      FROM public.workflow_instances
     WHERE entidade = v_wf_entity AND entidade_id = v_title.id;

    IF v_instance IS NOT NULL THEN
      v_target_code := CASE WHEN v_title_saldo <= 0 THEN 'pago'
                            WHEN v_title_saldo < v_title.valor_total THEN 'parcial'
                            ELSE 'aberto' END;
      SELECT ws.id INTO v_target_state
        FROM public.workflow_states ws
        JOIN public.workflow_instances wi ON wi.workflow_id = ws.workflow_id
       WHERE wi.id = v_instance AND ws.codigo = v_target_code;
      IF v_target_state IS NOT NULL AND v_target_state <> v_current THEN
        SELECT id INTO v_trans FROM public.workflow_transitions
         WHERE from_state_id = v_current AND to_state_id = v_target_state LIMIT 1;
        UPDATE public.workflow_instances
           SET current_state_id = v_target_state, updated_at = now(), updated_by = auth.uid()
         WHERE id = v_instance;
        INSERT INTO public.workflow_history (
          empresa_id, instance_id, from_state_id, to_state_id, transition_id,
          motivo, observacao, actor_id, payload
        ) VALUES (
          v_title.empresa_id, v_instance, v_current, v_target_state, v_trans,
          NULL, _obs, auth.uid(),
          jsonb_build_object('event','payment_auto','payment_id',v_pay_id,'valor',_valor)
        );
      END IF;
    END IF;
  END;

  RETURN v_pay_id;
END; $$;

-- 7) Seed de workflows financeiros ---------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_finance_workflows(_empresa UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wf UUID; v_ab UUID; v_pa UUID; v_pg UUID; v_ca UUID; v_es UUID;
  ent TEXT;
BEGIN
  FOREACH ent IN ARRAY ARRAY['finance_receivable','finance_payable']::TEXT[] LOOP
    SELECT id INTO v_wf FROM public.workflows
     WHERE empresa_id=_empresa AND entidade=ent AND codigo='padrao';
    IF v_wf IS NOT NULL THEN CONTINUE; END IF;

    INSERT INTO public.workflows (empresa_id, entidade, codigo, nome, descricao, ativo, is_default)
      VALUES (_empresa, ent, 'padrao',
              CASE WHEN ent='finance_receivable' THEN 'Padrão Contas a Receber' ELSE 'Padrão Contas a Pagar' END,
              'Fluxo padrão de títulos financeiros.', true, true)
      RETURNING id INTO v_wf;

    INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
      VALUES (_empresa, v_wf, 'aberto',     'Aberto',     10, true,  false, '#3b82f6') RETURNING id INTO v_ab;
    INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
      VALUES (_empresa, v_wf, 'parcial',    'Parcial',    20, false, false, '#f59e0b') RETURNING id INTO v_pa;
    INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
      VALUES (_empresa, v_wf, 'pago',       'Pago',       30, false, true,  '#22c55e') RETURNING id INTO v_pg;
    INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
      VALUES (_empresa, v_wf, 'cancelado',  'Cancelado',  40, false, true,  '#ef4444') RETURNING id INTO v_ca;
    INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
      VALUES (_empresa, v_wf, 'estornado',  'Estornado',  50, false, true,  '#a855f7') RETURNING id INTO v_es;

    INSERT INTO public.workflow_transitions
      (empresa_id, workflow_id, from_state_id, to_state_id, nome, permission_required, requires_motivo, requires_approval, ordem)
    VALUES
      (_empresa, v_wf, v_ab, v_pa, 'Registrar pagamento parcial', 'financeiro.edit',   false, false, 10),
      (_empresa, v_wf, v_ab, v_pg, 'Quitar',                       'financeiro.edit',   false, false, 20),
      (_empresa, v_wf, v_pa, v_pg, 'Quitar',                       'financeiro.edit',   false, false, 30),
      (_empresa, v_wf, v_ab, v_ca, 'Cancelar',                     'financeiro.approve',true,  true,  90),
      (_empresa, v_wf, v_pa, v_ca, 'Cancelar',                     'financeiro.approve',true,  true,  91),
      (_empresa, v_wf, v_pg, v_es, 'Estornar',                     'financeiro.approve',true,  true,  95);
  END LOOP;
END; $$;

-- Trigger para novas empresas
CREATE OR REPLACE FUNCTION public.tg_seed_finance_workflows()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_finance_workflows(NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_companies_seed_finance ON public.companies;
CREATE TRIGGER trg_companies_seed_finance AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_finance_workflows();

-- Aplica a empresas já existentes
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_default_finance_workflows(c.id);
  END LOOP;
END $$;

-- 8) Suporte a soft_delete para tabelas financeiras -----------------------------
CREATE OR REPLACE FUNCTION public.soft_delete(_table TEXT, _id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _table NOT IN (
    'customers','suppliers','products','quotes','orders',
    'company_settings','app_settings',
    'finance_categories','finance_titles'
  ) THEN
    RAISE EXCEPTION 'tabela % não suporta soft delete', _table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now(), deleted_by = auth.uid()
      WHERE id = $1 AND empresa_id IN (SELECT public.user_empresa_ids())',
    _table
  ) USING _id;
END; $$;
