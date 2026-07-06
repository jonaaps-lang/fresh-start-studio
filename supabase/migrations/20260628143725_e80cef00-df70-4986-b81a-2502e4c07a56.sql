
CREATE TYPE public.customer_type AS ENUM ('pf', 'pj');

CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.customer_type NOT NULL DEFAULT 'pj',
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  rg_ie TEXT,
  contato_nome TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem clientes"
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam clientes"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados editam clientes"
  ON public.customers FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin e gerente excluem clientes"
  ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customers_nome ON public.customers (lower(nome));
CREATE INDEX idx_customers_cpf_cnpj ON public.customers (cpf_cnpj);
CREATE INDEX idx_customers_ativo ON public.customers (ativo);
