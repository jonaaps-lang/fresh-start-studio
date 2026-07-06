
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS assinatura_nome TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_cargo TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assinatura_nome TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_cargo TEXT;

CREATE OR REPLACE FUNCTION public.convert_quote_to_order(_quote_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  q RECORD;
  new_num TEXT;
  new_id UUID;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF q.status NOT IN ('aprovado') THEN
    RAISE EXCEPTION 'Somente orçamentos aprovados podem ser convertidos';
  END IF;

  new_num := public.next_order_number();

  INSERT INTO public.orders (
    numero, quote_id, customer_id, status, data_emissao,
    prazo_entrega, condicoes_pagamento, observacoes,
    subtotal, desconto, acrescimo, total, created_by, vendedor_id,
    assinatura_nome, assinatura_cargo
  ) VALUES (
    new_num, q.id, q.customer_id, 'aberto', CURRENT_DATE,
    q.prazo_entrega, q.condicoes_pagamento, q.observacoes,
    q.subtotal, q.desconto, q.acrescimo, q.total, auth.uid(), q.vendedor_id,
    q.assinatura_nome, q.assinatura_cargo
  ) RETURNING id INTO new_id;

  INSERT INTO public.order_items (order_id, ordem, descricao, quantidade, unidade, preco_unitario, desconto, total)
  SELECT new_id, ordem, descricao, quantidade, unidade, preco_unitario, desconto, total
  FROM public.quote_items WHERE quote_id = q.id ORDER BY ordem;

  UPDATE public.quotes SET status = 'convertido' WHERE id = q.id;

  RETURN new_id;
END;
$function$;
