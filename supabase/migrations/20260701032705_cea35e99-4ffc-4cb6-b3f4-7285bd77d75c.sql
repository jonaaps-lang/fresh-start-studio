
CREATE TYPE public.product_type AS ENUM ('produto', 'servico');

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.product_type NOT NULL DEFAULT 'produto',
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  preco_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver produtos"
  ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/gerente/vendedor podem criar produtos"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'vendedor')
  );

CREATE POLICY "Admin/gerente/vendedor podem editar produtos"
  ON public.products FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'vendedor')
  );

CREATE POLICY "Admin pode excluir produtos"
  ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_products_nome ON public.products USING gin (to_tsvector('portuguese', nome));
CREATE INDEX idx_products_ativo ON public.products (ativo);
