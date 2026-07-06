
-- ============ ENUM DE PAPÉIS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor', 'producao', 'financeiro');

-- ============ TRIGGER UTILITÁRIO ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer: evita recursão de RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ POLICIES: PROFILES ============
CREATE POLICY "Usuário lê o próprio perfil"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuário atualiza o próprio perfil"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuário insere o próprio perfil"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- ============ POLICIES: USER ROLES ============
CREATE POLICY "Usuário vê os próprios papéis"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia papéis"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGER: criar profile + tornar primeiro usuário admin ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ COMPANY SETTINGS (singleton) ============
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  site TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#00AEEF',
  texto_rodape_pdf TEXT,
  validade_orcamento_dias INT NOT NULL DEFAULT 7,
  prazo_entrega_padrao TEXT,
  condicoes_pagamento_padrao TEXT,
  observacoes_padrao_orcamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem configurações"
ON public.company_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin insere configurações"
ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza configurações"
ON public.company_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin deleta configurações"
ON public.company_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Linha padrão (singleton)
INSERT INTO public.company_settings (singleton) VALUES (true);
