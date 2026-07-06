-- =====================================================================
-- FASE 3: Motor de Permissões, campos de perfil e arquitetura de aprovações
-- =====================================================================

-- 1) Campos extras no cadastro de usuários (não invasivo)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cargo         text,
  ADD COLUMN IF NOT EXISTS cpf           text,
  ADD COLUMN IF NOT EXISTS matricula     text,
  ADD COLUMN IF NOT EXISTS assinatura_url text,
  ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz;

-- 2) Tabela role_permissions (matriz por empresa × perfil × permissão)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  empresa_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  permission  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid,
  PRIMARY KEY (empresa_id, role, permission)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL    ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_read"   ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_manage" ON public.role_permissions;

CREATE POLICY "role_permissions_read" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_member_of_empresa(empresa_id)
    OR public.has_role(auth.uid(), 'desenvolvedor')
  );

CREATE POLICY "role_permissions_manage" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'desenvolvedor')
    OR (public.is_member_of_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dono')))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'desenvolvedor')
    OR (public.is_member_of_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dono')))
  );

-- 3) has_permission — validação centralizada no backend
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _permission text,
  _empresa uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Desenvolvedor tem acesso total (não vinculado a empresa)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'desenvolvedor'
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
      AND (_empresa IS NULL OR rp.empresa_id = _empresa)
      AND rp.empresa_id IN (SELECT public.user_empresa_ids())
  );
$$;

-- 4) Semeadora: default matrix por empresa
CREATE OR REPLACE FUNCTION public.seed_default_role_permissions(_empresa uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dono_perms text[] := ARRAY[
    'clientes.view','clientes.create','clientes.edit','clientes.delete','clientes.export',
    'fornecedores.view','fornecedores.create','fornecedores.edit','fornecedores.delete','fornecedores.export',
    'produtos.view','produtos.create','produtos.edit','produtos.delete','produtos.export',
    'orcamentos.view','orcamentos.create','orcamentos.edit','orcamentos.delete','orcamentos.approve','orcamentos.cancel','orcamentos.print','orcamentos.export',
    'pedidos.view','pedidos.create','pedidos.edit','pedidos.delete','pedidos.approve','pedidos.cancel','pedidos.print','pedidos.export',
    'producao.view','producao.create','producao.edit','producao.delete','producao.cancel',
    'financeiro.view','financeiro.create','financeiro.edit','financeiro.delete','financeiro.approve','financeiro.export','financeiro.print',
    'despesas.view','despesas.create','despesas.edit','despesas.delete','despesas.approve',
    'compras.view','compras.create','compras.edit','compras.delete','compras.approve',
    'estoque.view','estoque.create','estoque.edit','estoque.delete',
    'usuarios.view','usuarios.create','usuarios.edit','usuarios.delete',
    'configuracoes.view','configuracoes.edit',
    'aprovacoes.view','aprovacoes.approve','aprovacoes.reject'
  ];
  gerente_perms text[] := ARRAY[
    'clientes.view','clientes.create','clientes.edit','clientes.delete','clientes.export',
    'fornecedores.view','fornecedores.create','fornecedores.edit','fornecedores.export',
    'produtos.view','produtos.create','produtos.edit','produtos.export',
    'orcamentos.view','orcamentos.create','orcamentos.edit','orcamentos.approve','orcamentos.print','orcamentos.export',
    'pedidos.view','pedidos.create','pedidos.edit','pedidos.print','pedidos.export',
    'producao.view','producao.create','producao.edit',
    'financeiro.view','financeiro.print',
    'despesas.view',
    'compras.view','compras.create','compras.edit',
    'estoque.view','estoque.edit',
    'usuarios.view',
    'configuracoes.view',
    'aprovacoes.view'
  ];
  comercial_perms text[] := ARRAY[
    'clientes.view','clientes.create','clientes.edit','clientes.export',
    'produtos.view',
    'orcamentos.view','orcamentos.create','orcamentos.edit','orcamentos.print','orcamentos.export',
    'pedidos.view','pedidos.create','pedidos.edit','pedidos.print'
    -- NOTA: comercial NÃO recebe pedidos.cancel — regra tratada no backend
  ];
  producao_perms text[] := ARRAY[
    'pedidos.view','pedidos.print',
    'producao.view','producao.edit',
    'estoque.view'
  ];
  financeiro_perms text[] := ARRAY[
    'clientes.view','fornecedores.view',
    'pedidos.view','pedidos.print',
    'financeiro.view','financeiro.create','financeiro.edit','financeiro.export','financeiro.print',
    'despesas.view','despesas.create','despesas.edit',
    'compras.view'
  ];
  p text;
BEGIN
  FOREACH p IN ARRAY dono_perms LOOP
    INSERT INTO public.role_permissions(empresa_id, role, permission) VALUES (_empresa, 'dono', p)
    ON CONFLICT DO NOTHING;
    -- Compatibilidade: admin espelha dono nos ambientes existentes
    INSERT INTO public.role_permissions(empresa_id, role, permission) VALUES (_empresa, 'admin', p)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH p IN ARRAY gerente_perms LOOP
    INSERT INTO public.role_permissions(empresa_id, role, permission) VALUES (_empresa, 'gerente', p)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH p IN ARRAY comercial_perms LOOP
    INSERT INTO public.role_permissions(empresa_id, role, permission) VALUES (_empresa, 'comercial', p)
    ON CONFLICT DO NOTHING;
    -- Compatibilidade: vendedor herda as mesmas permissões de comercial
    INSERT INTO public.role_permissions(empresa_id, role, permission) VALUES (_empresa, 'vendedor', p)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH p IN ARRAY producao_perms LOOP
    INSERT INTO public.role_permissions(empresa_id, role, permission) VALUES (_empresa, 'producao', p)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH p IN ARRAY financeiro_perms LOOP
    INSERT INTO public.role_permissions(empresa_id, role, permission) VALUES (_empresa, 'financeiro', p)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- 5) Trigger para semear em toda empresa nova
CREATE OR REPLACE FUNCTION public.tg_seed_role_permissions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_role_permissions(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_role_permissions ON public.companies;
CREATE TRIGGER trg_seed_role_permissions
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_role_permissions();

-- 6) Backfill para todas as empresas existentes
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_default_role_permissions(c.id);
  END LOOP;
END $$;

-- 7) Tabela approvals — arquitetura genérica (sem UI nesta fase)
CREATE TABLE IF NOT EXISTS public.approvals (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,                 -- ex: 'pedidos', 'orcamentos', 'financeiro'
  entity_id     uuid NOT NULL,
  action        text NOT NULL,                 -- ex: 'cancel', 'delete', 'discount', 'edit'
  status        text NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente','aprovado','rejeitado','cancelado')),
  requested_by  uuid,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  reason        text,                          -- motivo da solicitação
  decided_by    uuid,
  decided_at    timestamptz,
  decision_note text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_by    uuid
);

CREATE INDEX IF NOT EXISTS approvals_empresa_status_idx ON public.approvals(empresa_id, status);
CREATE INDEX IF NOT EXISTS approvals_entity_idx        ON public.approvals(entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approvals_read"   ON public.approvals;
DROP POLICY IF EXISTS "approvals_insert" ON public.approvals;
DROP POLICY IF EXISTS "approvals_update" ON public.approvals;

CREATE POLICY "approvals_read" ON public.approvals
  FOR SELECT TO authenticated
  USING (public.is_member_of_empresa(empresa_id) OR public.has_role(auth.uid(), 'desenvolvedor'));

CREATE POLICY "approvals_insert" ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_empresa(empresa_id));

CREATE POLICY "approvals_update" ON public.approvals
  FOR UPDATE TO authenticated
  USING (
    public.is_member_of_empresa(empresa_id)
    AND public.has_permission(auth.uid(), 'aprovacoes.approve', empresa_id)
  )
  WITH CHECK (public.is_member_of_empresa(empresa_id));

DROP TRIGGER IF EXISTS trg_approvals_tenant ON public.approvals;
CREATE TRIGGER trg_approvals_tenant
  BEFORE INSERT OR UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();

DROP TRIGGER IF EXISTS trg_approvals_updated_at ON public.approvals;
CREATE TRIGGER trg_approvals_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Função para o app registrar último acesso do usuário
CREATE OR REPLACE FUNCTION public.touch_last_access()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET ultimo_acesso = now() WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.touch_last_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_access() TO authenticated;

-- 9) Endurecer has_permission contra chamada anônima
REVOKE ALL ON FUNCTION public.has_permission(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, uuid) TO authenticated, service_role;