
-- ============================================================
-- BLOCO A: Multi-tenant + soft delete + auditoria
-- ============================================================

-- 1) COMPANIES + MEMBERSHIP -----------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_company_users_user ON public.company_users(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT ALL ON public.company_users TO service_role;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 2) HELPERS ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_member_of_empresa(_empresa UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid() AND empresa_id = _empresa
  );
$$;

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.company_users
  WHERE user_id = auth.uid()
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_empresa_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.company_users WHERE user_id = auth.uid();
$$;

-- 3) SEED EMPRESA PADRÃO a partir de company_settings ---------
DO $$
DECLARE
  v_empresa_id UUID;
  v_nome TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies) THEN
    SELECT COALESCE(nome_fantasia, razao_social, 'Express Print')
      INTO v_nome
      FROM public.company_settings
      LIMIT 1;
    INSERT INTO public.companies (nome, slug)
    VALUES (COALESCE(v_nome, 'Express Print'), 'default')
    RETURNING id INTO v_empresa_id;

    INSERT INTO public.company_users (empresa_id, user_id, is_default)
    SELECT v_empresa_id, id, true FROM auth.users
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Vincula novos usuários à empresa padrão (compatibilidade)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  v_default_empresa UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  END IF;

  SELECT id INTO v_default_empresa FROM public.companies
   WHERE slug = 'default' OR ativo = true
   ORDER BY created_at ASC LIMIT 1;
  IF v_default_empresa IS NOT NULL THEN
    INSERT INTO public.company_users (empresa_id, user_id, is_default)
    VALUES (v_default_empresa, NEW.id, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) ADICIONAR COLUNAS em cada tabela de negócio --------------
DO $$
DECLARE
  t TEXT;
  tabs TEXT[] := ARRAY['customers','suppliers','products','quotes','orders','company_settings'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id)', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id)', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_empresa ON public.%I(empresa_id) WHERE deleted_at IS NULL', t, t);
  END LOOP;
END $$;

-- itens (herda empresa via pai)
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 5) BACKFILL empresa_id na empresa padrão --------------------
DO $$
DECLARE v_default UUID;
BEGIN
  SELECT id INTO v_default FROM public.companies ORDER BY created_at ASC LIMIT 1;
  IF v_default IS NULL THEN RETURN; END IF;

  UPDATE public.customers        SET empresa_id = v_default WHERE empresa_id IS NULL;
  UPDATE public.suppliers        SET empresa_id = v_default WHERE empresa_id IS NULL;
  UPDATE public.products         SET empresa_id = v_default WHERE empresa_id IS NULL;
  UPDATE public.quotes           SET empresa_id = v_default WHERE empresa_id IS NULL;
  UPDATE public.orders           SET empresa_id = v_default WHERE empresa_id IS NULL;
  UPDATE public.company_settings SET empresa_id = v_default WHERE empresa_id IS NULL;
  UPDATE public.quote_items qi   SET empresa_id = q.empresa_id
    FROM public.quotes q WHERE q.id = qi.quote_id AND qi.empresa_id IS NULL;
  UPDATE public.order_items oi   SET empresa_id = o.empresa_id
    FROM public.orders o WHERE o.id = oi.order_id AND oi.empresa_id IS NULL;
END $$;

-- 6) NOT NULL empresa_id (após backfill) ----------------------
ALTER TABLE public.customers        ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.suppliers        ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.products         ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.quotes           ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.orders           ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.quote_items      ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.order_items      ALTER COLUMN empresa_id SET NOT NULL;

-- 7) TRIGGERS de auto-preenchimento ---------------------------
CREATE OR REPLACE FUNCTION public.tg_fill_tenant_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.empresa_id IS NULL THEN
      NEW.empresa_id := public.current_empresa_id();
    END IF;
    IF NEW.empresa_id IS NULL THEN
      RAISE EXCEPTION 'empresa_id não pôde ser determinada para o usuário atual';
    END IF;
    IF to_jsonb(NEW) ? 'created_by' AND NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    -- impede troca de tenant
    NEW.empresa_id := OLD.empresa_id;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_fill_child_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  IF TG_TABLE_NAME = 'quote_items' THEN
    SELECT empresa_id INTO v FROM public.quotes WHERE id = NEW.quote_id;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    SELECT empresa_id INTO v FROM public.orders WHERE id = NEW.order_id;
  END IF;
  NEW.empresa_id := v;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT; tabs TEXT[] := ARRAY['customers','suppliers','products','quotes','orders','company_settings'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_tenant_fields ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_tenant_fields BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields()', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_tenant_child ON public.quote_items;
CREATE TRIGGER trg_tenant_child BEFORE INSERT OR UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_child_tenant();
DROP TRIGGER IF EXISTS trg_tenant_child ON public.order_items;
CREATE TRIGGER trg_tenant_child BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_child_tenant();

-- 8) REESCRITA DE RLS (isolamento por empresa + soft delete) --

-- companies
DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select" ON public.companies FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_member_of_empresa(id));
DROP POLICY IF EXISTS "companies_admin_update" ON public.companies;
CREATE POLICY "companies_admin_update" ON public.companies FOR UPDATE TO authenticated
  USING (public.is_member_of_empresa(id) AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_member_of_empresa(id));

-- company_users
DROP POLICY IF EXISTS "cu_select_self" ON public.company_users;
CREATE POLICY "cu_select_self" ON public.company_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "cu_admin_manage" ON public.company_users;
CREATE POLICY "cu_admin_manage" ON public.company_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Helper macro via DO block para tabelas de negócio
DO $$
DECLARE
  t TEXT;
  tabs TEXT[] := ARRAY['customers','suppliers','products','quotes','orders'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    -- remove policies antigas conhecidas
    EXECUTE format('DROP POLICY IF EXISTS "Autenticados criam clientes" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin e gerente excluem clientes" ON public.%I', t);
    -- drop-all genérico
    FOR t IN
      SELECT polname FROM pg_policy WHERE polrelid = format('public.%I', tabs[array_position(tabs, t)])::regclass
    LOOP
      NULL; -- placeholder (Postgres não permite drop-all direto; fazemos abaixo por nome fixo)
    END LOOP;
  END LOOP;
END $$;

-- Drop-all seguro por tabela via SQL dinâmico
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('customers','suppliers','products','quotes','orders','quote_items','order_items','company_settings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Policies padronizadas para tabelas com empresa_id direto
DO $$
DECLARE t TEXT; tabs TEXT[] := ARRAY['customers','suppliers','products','quotes','orders'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    EXECUTE format($f$CREATE POLICY "tenant_select" ON public.%I FOR SELECT TO authenticated
      USING (deleted_at IS NULL AND empresa_id IN (SELECT public.user_empresa_ids()))$f$, t);
    EXECUTE format($f$CREATE POLICY "tenant_insert" ON public.%I FOR INSERT TO authenticated
      WITH CHECK (empresa_id IS NULL OR public.is_member_of_empresa(empresa_id))$f$, t);
    EXECUTE format($f$CREATE POLICY "tenant_update" ON public.%I FOR UPDATE TO authenticated
      USING (empresa_id IN (SELECT public.user_empresa_ids()))
      WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids()))$f$, t);
    EXECUTE format($f$CREATE POLICY "tenant_delete" ON public.%I FOR DELETE TO authenticated
      USING (empresa_id IN (SELECT public.user_empresa_ids())
             AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')))$f$, t);
  END LOOP;
END $$;

-- items (herda tenant via pai)
CREATE POLICY "tenant_select" ON public.quote_items FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY "tenant_insert" ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.empresa_id IN (SELECT public.user_empresa_ids())));
CREATE POLICY "tenant_update" ON public.quote_items FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()))
  WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY "tenant_delete" ON public.quote_items FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));

CREATE POLICY "tenant_select" ON public.order_items FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY "tenant_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.empresa_id IN (SELECT public.user_empresa_ids())));
CREATE POLICY "tenant_update" ON public.order_items FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()))
  WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY "tenant_delete" ON public.order_items FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));

-- company_settings (uma linha por empresa)
CREATE POLICY "cs_select" ON public.company_settings FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY "cs_update" ON public.company_settings FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids())
         AND (public.has_role(auth.uid(),'admin')
              OR public.has_role(auth.uid(),'gerente')
              OR public.has_role(auth.uid(),'financeiro')))
  WITH CHECK (empresa_id IN (SELECT public.user_empresa_ids()));
CREATE POLICY "cs_insert" ON public.company_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 9) DOCUMENT COUNTERS por empresa ----------------------------
CREATE TABLE IF NOT EXISTS public.document_counters (
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  next_val BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, tipo)
);
GRANT SELECT ON public.document_counters TO authenticated;
GRANT ALL ON public.document_counters TO service_role;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dc_select" ON public.document_counters;
CREATE POLICY "dc_select" ON public.document_counters FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()));

CREATE OR REPLACE FUNCTION public.next_document_number(_tipo TEXT, _prefixo TEXT, _empresa UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_emp UUID := COALESCE(_empresa, public.current_empresa_id());
  v_next BIGINT;
BEGIN
  IF v_emp IS NULL THEN RAISE EXCEPTION 'empresa não identificada'; END IF;
  INSERT INTO public.document_counters (empresa_id, tipo, next_val)
    VALUES (v_emp, _tipo, 1)
  ON CONFLICT (empresa_id, tipo) DO NOTHING;
  UPDATE public.document_counters
     SET next_val = next_val + 1, updated_at = now()
   WHERE empresa_id = v_emp AND tipo = _tipo
  RETURNING next_val - 1 INTO v_next;
  RETURN _prefixo || '-' || LPAD(v_next::TEXT, 5, '0');
END;
$$;

-- Reescreve funções existentes (assinatura mantida = compatível)
CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.next_document_number('quote','ORC');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.next_document_number('order','PED');
END;
$$;

-- Semeia contadores com maior numero existente por empresa
INSERT INTO public.document_counters (empresa_id, tipo, next_val)
SELECT empresa_id, 'quote',
       COALESCE(MAX(NULLIF(regexp_replace(numero,'\D','','g'),'')::BIGINT),0) + 1
  FROM public.quotes GROUP BY empresa_id
ON CONFLICT (empresa_id, tipo) DO UPDATE SET next_val = EXCLUDED.next_val;

INSERT INTO public.document_counters (empresa_id, tipo, next_val)
SELECT empresa_id, 'order',
       COALESCE(MAX(NULLIF(regexp_replace(numero,'\D','','g'),'')::BIGINT),0) + 1
  FROM public.orders GROUP BY empresa_id
ON CONFLICT (empresa_id, tipo) DO UPDATE SET next_val = EXCLUDED.next_val;

-- 10) HELPER de soft delete ----------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete(_table TEXT, _id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _table NOT IN ('customers','suppliers','products','quotes','orders','company_settings') THEN
    RAISE EXCEPTION 'tabela % não suporta soft delete', _table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now(), deleted_by = auth.uid()
      WHERE id = $1 AND empresa_id IN (SELECT public.user_empresa_ids())',
    _table
  ) USING _id;
END;
$$;
