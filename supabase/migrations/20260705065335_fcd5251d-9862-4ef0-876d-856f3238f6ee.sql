
-- =============================================================================
-- FASE 8 – Compras + Estoque
-- =============================================================================

-- 1) PURCHASE ORDERS ---------------------------------------------------------
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  numero TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_prevista DATE,
  data_recebimento DATE,
  condicoes_pagamento TEXT,
  observacoes TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  finance_title_id UUID REFERENCES public.finance_titles(id) ON DELETE SET NULL,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  UNIQUE (empresa_id, numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_orders_select" ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.is_member_of_empresa(empresa_id) AND public.has_permission(auth.uid(),'compras.view',empresa_id));
CREATE POLICY "purchase_orders_insert" ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'compras.create',empresa_id));
CREATE POLICY "purchase_orders_update" ON public.purchase_orders FOR UPDATE TO authenticated
  USING (public.is_member_of_empresa(empresa_id) AND public.has_permission(auth.uid(),'compras.edit',empresa_id));
CREATE POLICY "purchase_orders_delete" ON public.purchase_orders FOR DELETE TO authenticated
  USING (public.is_member_of_empresa(empresa_id) AND public.has_permission(auth.uid(),'compras.delete',empresa_id));

CREATE TRIGGER trg_purchase_orders_tenant BEFORE INSERT OR UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();
CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) PURCHASE ORDER ITEMS ----------------------------------------------------
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 1,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(14,3) NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'un',
  preco_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_items_all" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.is_member_of_empresa(empresa_id) AND public.has_permission(auth.uid(),'compras.view',empresa_id))
  WITH CHECK (public.is_member_of_empresa(empresa_id));

CREATE OR REPLACE FUNCTION public.tg_purchase_items_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE v UUID;
BEGIN
  SELECT empresa_id INTO v FROM public.purchase_orders WHERE id = NEW.purchase_order_id;
  NEW.empresa_id := v;
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_purchase_items_fill BEFORE INSERT OR UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_purchase_items_fill();
CREATE TRIGGER trg_purchase_items_updated BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) STOCK MOVEMENTS ---------------------------------------------------------
CREATE TYPE public.stock_movement_type AS ENUM ('entrada','saida','ajuste','inventario');

CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo public.stock_movement_type NOT NULL,
  quantidade NUMERIC(14,3) NOT NULL,
  custo_unitario NUMERIC(14,4),
  origem TEXT,           -- 'purchase' | 'manual' | 'ajuste' | 'producao'
  origem_id UUID,
  observacao TEXT,
  data_movimento TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_empresa ON public.stock_movements(empresa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_select" ON public.stock_movements FOR SELECT TO authenticated
  USING (public.is_member_of_empresa(empresa_id) AND public.has_permission(auth.uid(),'estoque.view',empresa_id));
CREATE POLICY "stock_movements_insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'estoque.edit',empresa_id));
CREATE POLICY "stock_movements_update" ON public.stock_movements FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'estoque.edit',empresa_id));
CREATE POLICY "stock_movements_delete" ON public.stock_movements FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'estoque.edit',empresa_id));

CREATE OR REPLACE FUNCTION public.tg_stock_movement_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.current_empresa_id();
  END IF;
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_stock_movement_fill BEFORE INSERT OR UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.tg_stock_movement_fill();

-- 4) STOCK BALANCES VIEW -----------------------------------------------------
CREATE OR REPLACE VIEW public.stock_balances AS
SELECT
  p.id AS product_id,
  p.empresa_id,
  p.nome,
  p.codigo,
  p.unidade,
  COALESCE(SUM(
    CASE
      WHEN sm.tipo = 'entrada' THEN sm.quantidade
      WHEN sm.tipo = 'saida' THEN -sm.quantidade
      WHEN sm.tipo = 'ajuste' THEN sm.quantidade
      WHEN sm.tipo = 'inventario' THEN sm.quantidade
      ELSE 0
    END
  ), 0) AS saldo
FROM public.products p
LEFT JOIN public.stock_movements sm ON sm.product_id = p.id
GROUP BY p.id, p.empresa_id, p.nome, p.codigo, p.unidade;

GRANT SELECT ON public.stock_balances TO authenticated;
GRANT ALL ON public.stock_balances TO service_role;

-- 5) STOCK RPCs --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stock_adjust(
  _product_id UUID,
  _tipo public.stock_movement_type,
  _quantidade NUMERIC,
  _custo_unitario NUMERIC DEFAULT NULL,
  _observacao TEXT DEFAULT NULL,
  _origem TEXT DEFAULT 'manual',
  _origem_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_emp UUID := public.current_empresa_id();
  v_id UUID;
BEGIN
  IF v_emp IS NULL THEN RAISE EXCEPTION 'empresa não identificada'; END IF;
  IF NOT public.has_permission(auth.uid(),'estoque.edit',v_emp) THEN
    RAISE EXCEPTION 'permissão insuficiente';
  END IF;

  INSERT INTO public.stock_movements (
    empresa_id, product_id, tipo, quantidade, custo_unitario,
    observacao, origem, origem_id
  ) VALUES (
    v_emp, _product_id, _tipo, _quantidade, _custo_unitario,
    _observacao, _origem, _origem_id
  ) RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

-- 6) PURCHASE → STOCK & AP --------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ap_from_purchase(_purchase_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_p RECORD;
  v_cfg JSONB;
  v_auto BOOLEAN;
  v_parcelas INT;
  v_venc_dias INT;
  v_numero TEXT;
  v_title_id UUID;
  v_valor NUMERIC;
  v_parc_valor NUMERIC;
  v_existente UUID;
  i INT;
BEGIN
  SELECT * INTO v_p FROM public.purchase_orders WHERE id = _purchase_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT id INTO v_existente FROM public.finance_titles
    WHERE order_id IS NULL AND descricao LIKE 'Compra ' || v_p.numero || '%'
      AND empresa_id = v_p.empresa_id AND deleted_at IS NULL LIMIT 1;
  IF v_existente IS NOT NULL THEN RETURN v_existente; END IF;
  IF v_p.finance_title_id IS NOT NULL THEN RETURN v_p.finance_title_id; END IF;

  SELECT data INTO v_cfg FROM public.app_settings
   WHERE empresa_id = v_p.empresa_id AND category = 'compras' LIMIT 1;
  v_cfg := COALESCE(v_cfg, '{}'::jsonb);

  v_auto := COALESCE((v_cfg->>'gerar_cp_automaticamente')::boolean, true);
  IF NOT v_auto THEN RETURN NULL; END IF;

  v_parcelas := GREATEST(1, COALESCE((v_cfg->>'parcelamento_padrao')::int, 1));
  v_venc_dias := GREATEST(0, COALESCE((v_cfg->>'vencimento_dias_padrao')::int, 30));
  v_valor := COALESCE(v_p.total, 0);
  IF v_valor <= 0 THEN RETURN NULL; END IF;

  v_numero := public.next_document_number('finance_payable','FIN-P', v_p.empresa_id);

  INSERT INTO public.finance_titles (
    empresa_id, numero, tipo, supplier_id, descricao,
    data_emissao, valor_total, saldo, desconto, observacoes
  ) VALUES (
    v_p.empresa_id, v_numero, 'payable', v_p.supplier_id,
    'Compra ' || v_p.numero,
    CURRENT_DATE, v_valor, v_valor, 0,
    'Gerado automaticamente da compra ' || v_p.numero
  ) RETURNING id INTO v_title_id;

  v_parc_valor := ROUND(v_valor / v_parcelas, 2);
  FOR i IN 1..v_parcelas LOOP
    INSERT INTO public.finance_installments (
      empresa_id, title_id, numero_parcela, vencimento, valor, saldo
    ) VALUES (
      v_p.empresa_id, v_title_id, i,
      (CURRENT_DATE + (v_venc_dias * i))::date,
      CASE WHEN i = v_parcelas THEN v_valor - (v_parc_valor * (v_parcelas - 1)) ELSE v_parc_valor END,
      CASE WHEN i = v_parcelas THEN v_valor - (v_parc_valor * (v_parcelas - 1)) ELSE v_parc_valor END
    );
  END LOOP;

  UPDATE public.purchase_orders SET finance_title_id = v_title_id WHERE id = _purchase_id;

  BEGIN
    PERFORM public.workflow_start('finance_payable', v_title_id, NULL);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN v_title_id;
END; $$;

CREATE OR REPLACE FUNCTION public.receive_purchase_order(_purchase_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_p RECORD;
  v_cfg JSONB;
  v_utiliza_estoque BOOLEAN;
  v_count INT := 0;
  r RECORD;
BEGIN
  SELECT * INTO v_p FROM public.purchase_orders WHERE id = _purchase_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'compra não encontrada'; END IF;

  SELECT data INTO v_cfg FROM public.app_settings
   WHERE empresa_id = v_p.empresa_id AND category = 'estoque' LIMIT 1;
  v_utiliza_estoque := COALESCE((v_cfg->>'utiliza_estoque')::boolean, false);

  UPDATE public.purchase_orders
     SET data_recebimento = COALESCE(data_recebimento, CURRENT_DATE)
   WHERE id = _purchase_id;

  IF v_utiliza_estoque THEN
    FOR r IN
      SELECT product_id, quantidade, preco_unitario
      FROM public.purchase_order_items
      WHERE purchase_order_id = _purchase_id AND product_id IS NOT NULL
    LOOP
      INSERT INTO public.stock_movements (
        empresa_id, product_id, tipo, quantidade, custo_unitario,
        origem, origem_id, observacao
      ) VALUES (
        v_p.empresa_id, r.product_id, 'entrada', r.quantidade, r.preco_unitario,
        'purchase', _purchase_id, 'Entrada por compra ' || v_p.numero
      );
      v_count := v_count + 1;
    END LOOP;
  END IF;

  PERFORM public.generate_ap_from_purchase(_purchase_id);

  RETURN v_count;
END; $$;

-- 7) WORKFLOW SEEDS ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_purchase_workflow(_empresa UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_wf UUID; v_sol UUID; v_cot UUID; v_ped UUID; v_rec UUID; v_ok UUID; v_can UUID;
BEGIN
  SELECT id INTO v_wf FROM public.workflows
   WHERE empresa_id=_empresa AND entidade='purchase' AND codigo='padrao';
  IF v_wf IS NOT NULL THEN RETURN v_wf; END IF;

  INSERT INTO public.workflows (empresa_id, entidade, codigo, nome, descricao, ativo, is_default)
    VALUES (_empresa, 'purchase', 'padrao', 'Padrão de Compras',
            'Fluxo padrão de Ordens de Compra.', true, true)
  RETURNING id INTO v_wf;

  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'solicitado', 'Solicitado', 10, true, false, '#94a3b8') RETURNING id INTO v_sol;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'cotacao', 'Cotação', 20, false, false, '#eab308') RETURNING id INTO v_cot;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'pedido', 'Pedido', 30, false, false, '#3b82f6') RETURNING id INTO v_ped;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'recebido', 'Recebido', 40, false, false, '#22c55e') RETURNING id INTO v_rec;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'concluido', 'Concluído', 50, false, true, '#16a34a') RETURNING id INTO v_ok;
  INSERT INTO public.workflow_states (empresa_id, workflow_id, codigo, nome, ordem, is_initial, is_final, cor)
    VALUES (_empresa, v_wf, 'cancelado', 'Cancelado', 60, false, true, '#ef4444') RETURNING id INTO v_can;

  INSERT INTO public.workflow_transitions
    (empresa_id, workflow_id, from_state_id, to_state_id, nome, permission_required, requires_motivo, requires_approval, ordem)
  VALUES
    (_empresa, v_wf, v_sol, v_cot, 'Iniciar cotação',   'compras.edit',   false, false, 10),
    (_empresa, v_wf, v_cot, v_ped, 'Emitir pedido',     'compras.approve',false, false, 20),
    (_empresa, v_wf, v_sol, v_ped, 'Pedido direto',     'compras.approve',false, false, 25),
    (_empresa, v_wf, v_ped, v_rec, 'Registrar recebimento','compras.edit',false, false, 30),
    (_empresa, v_wf, v_rec, v_ok,  'Concluir',          'compras.edit',   false, false, 40),
    (_empresa, v_wf, v_sol, v_can, 'Cancelar',          'compras.cancel', true,  true,  90),
    (_empresa, v_wf, v_cot, v_can, 'Cancelar',          'compras.cancel', true,  true,  91),
    (_empresa, v_wf, v_ped, v_can, 'Cancelar',          'compras.cancel', true,  true,  92);

  RETURN v_wf;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_seed_purchase_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
BEGIN PERFORM public.seed_default_purchase_workflow(NEW.id); RETURN NEW; END; $$;

-- Executa seed para as empresas já existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_default_purchase_workflow(r.id);
  END LOOP;
END $$;

-- Trigger para novas empresas
DROP TRIGGER IF EXISTS trg_companies_seed_purchase_wf ON public.companies;
CREATE TRIGGER trg_companies_seed_purchase_wf
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_purchase_workflow();

-- 8) Extend role permissions seed (adiciona compras.approve + estoque.inventory) ---
CREATE OR REPLACE FUNCTION public.seed_extra_purchase_permissions(_empresa UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  extras TEXT[] := ARRAY[
    'compras.approve','compras.cancel',
    'estoque.inventory'
  ];
  p TEXT;
BEGIN
  FOREACH p IN ARRAY extras LOOP
    INSERT INTO public.role_permissions(empresa_id, role, permission)
      VALUES (_empresa, 'dono', p) ON CONFLICT DO NOTHING;
    INSERT INTO public.role_permissions(empresa_id, role, permission)
      VALUES (_empresa, 'admin', p) ON CONFLICT DO NOTHING;
  END LOOP;
END; $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_extra_purchase_permissions(r.id);
  END LOOP;
END $$;
