
-- FASE 7: novos estados de orçamento + auto-geração de Contas a Receber a partir de pedidos

-- 1) Adiciona novos valores ao enum quote_status (Rascunho / Não Enviado / Enviado / Aprovado / Rejeitado / Cancelado)
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'nao_enviado';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'enviado';

-- 2) Função para gerar automaticamente títulos de Contas a Receber (AR) a partir de um pedido.
--    Reutiliza motor de numeração (next_finance_number) e motor de workflow (workflow_start).
--    Respeita a configuração comercial/financeira via app_settings.financeiro.auto_gerar_ar_pedido.
--    Retorna o id do título criado, ou NULL se a config estiver desativada ou já existir AR do pedido.
CREATE OR REPLACE FUNCTION public.generate_ar_from_order(_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_cfg JSONB;
  v_auto BOOLEAN;
  v_parcelas INT;
  v_venc_dias INT;
  v_numero TEXT;
  v_title_id UUID;
  v_valor NUMERIC;
  v_parc_valor NUMERIC;
  v_ja_existe UUID;
  i INT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Impede duplicidade: se já existe título vinculado ao pedido, apenas retorna o existente
  SELECT id INTO v_ja_existe
    FROM public.finance_titles
   WHERE order_id = _order_id AND deleted_at IS NULL
   LIMIT 1;
  IF v_ja_existe IS NOT NULL THEN RETURN v_ja_existe; END IF;

  -- Lê configuração financeira da empresa do pedido
  SELECT data INTO v_cfg FROM public.app_settings
   WHERE empresa_id = v_order.empresa_id AND category = 'financeiro'
   LIMIT 1;
  v_cfg := COALESCE(v_cfg, '{}'::jsonb);

  v_auto := COALESCE((v_cfg->>'auto_gerar_ar_pedido')::boolean, false);
  IF NOT v_auto THEN RETURN NULL; END IF;

  v_parcelas := GREATEST(1, COALESCE((v_cfg->>'parcelamento_padrao')::int, 1));
  v_venc_dias := GREATEST(0, COALESCE((v_cfg->>'vencimento_dias_padrao')::int, 30));
  v_valor := COALESCE(v_order.total, 0);
  IF v_valor <= 0 THEN RETURN NULL; END IF;

  v_numero := public.next_document_number('finance_receivable','FIN-R', v_order.empresa_id);

  INSERT INTO public.finance_titles (
    empresa_id, numero, tipo, customer_id, order_id, descricao,
    data_emissao, valor_total, saldo, desconto, observacoes
  ) VALUES (
    v_order.empresa_id, v_numero, 'receivable', v_order.customer_id, _order_id,
    'Pedido ' || v_order.numero,
    CURRENT_DATE, v_valor, v_valor, 0,
    'Gerado automaticamente a partir do pedido ' || v_order.numero
  ) RETURNING id INTO v_title_id;

  v_parc_valor := ROUND(v_valor / v_parcelas, 2);
  FOR i IN 1..v_parcelas LOOP
    INSERT INTO public.finance_installments (
      empresa_id, title_id, numero_parcela, vencimento, valor, saldo
    ) VALUES (
      v_order.empresa_id, v_title_id, i,
      (CURRENT_DATE + (v_venc_dias * i))::date,
      CASE WHEN i = v_parcelas
           THEN v_valor - (v_parc_valor * (v_parcelas - 1))
           ELSE v_parc_valor END,
      CASE WHEN i = v_parcelas
           THEN v_valor - (v_parc_valor * (v_parcelas - 1))
           ELSE v_parc_valor END
    );
  END LOOP;

  -- Inicia workflow financeiro (entidade finance_receivable)
  BEGIN
    PERFORM public.workflow_start('finance_receivable', v_title_id, NULL);
  EXCEPTION WHEN OTHERS THEN
    -- Se o workflow ainda não estiver seedado por algum motivo, não bloqueia a criação
    NULL;
  END;

  RETURN v_title_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_ar_from_order(uuid) TO authenticated;

-- 3) Trigger opcional: quando um pedido passa para "em_producao" (equivalente a "aprovado" no fluxo padrão)
--    dispara a geração automática das contas a receber. A função internamente respeita a config.
CREATE OR REPLACE FUNCTION public.tg_order_auto_generate_ar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'em_producao' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.generate_ar_from_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_auto_generate_ar ON public.orders;
CREATE TRIGGER trg_order_auto_generate_ar
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.tg_order_auto_generate_ar();
