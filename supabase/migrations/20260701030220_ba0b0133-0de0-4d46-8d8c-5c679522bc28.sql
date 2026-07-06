
-- Sequence + numbering for orders
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n BIGINT;
BEGIN
  n := nextval('public.order_number_seq');
  RETURN 'PED-' || LPAD(n::TEXT, 5, '0');
END;
$$;

-- Order status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('aberto','em_producao','concluido','entregue','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'aberto',
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  prazo_entrega TEXT,
  data_entrega DATE,
  condicoes_pagamento TEXT,
  observacoes TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID,
  vendedor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_auth" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_insert_auth" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orders_update_auth" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete_privileged" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(14,3) NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  preco_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_auth" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_insert_auth" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_items_update_auth" ON public.order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "order_items_delete_auth" ON public.order_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_order_items_updated BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversion RPC: quote -> order (single transaction)
CREATE OR REPLACE FUNCTION public.convert_quote_to_order(_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    subtotal, desconto, acrescimo, total, created_by, vendedor_id
  ) VALUES (
    new_num, q.id, q.customer_id, 'aberto', CURRENT_DATE,
    q.prazo_entrega, q.condicoes_pagamento, q.observacoes,
    q.subtotal, q.desconto, q.acrescimo, q.total, auth.uid(), q.vendedor_id
  ) RETURNING id INTO new_id;

  INSERT INTO public.order_items (order_id, ordem, descricao, quantidade, unidade, preco_unitario, desconto, total)
  SELECT new_id, ordem, descricao, quantidade, unidade, preco_unitario, desconto, total
  FROM public.quote_items WHERE quote_id = q.id ORDER BY ordem;

  UPDATE public.quotes SET status = 'convertido' WHERE id = q.id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quote_to_order(UUID) TO authenticated;
