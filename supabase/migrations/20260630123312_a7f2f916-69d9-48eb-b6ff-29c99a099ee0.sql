
-- Enum de status
CREATE TYPE public.quote_status AS ENUM ('rascunho','pendente','aprovado','rejeitado','convertido','cancelado');

-- Sequência para numeração
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq START 1;

-- Tabela de orçamentos
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status public.quote_status NOT NULL DEFAULT 'rascunho',
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  prazo_entrega TEXT,
  condicoes_pagamento TEXT,
  observacoes TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendedor_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
GRANT USAGE ON SEQUENCE public.quote_number_seq TO authenticated, service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view quotes" ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update quotes" ON public.quotes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin gerente delete quotes" ON public.quotes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens
CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view quote_items" ON public.quote_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert quote_items" ON public.quote_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update quote_items" ON public.quote_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete quote_items" ON public.quote_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_quotes_customer ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quote_items_quote ON public.quote_items(quote_id);

-- Função para gerar próximo número
CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n BIGINT;
BEGIN
  n := nextval('public.quote_number_seq');
  RETURN 'ORC-' || LPAD(n::TEXT, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;
