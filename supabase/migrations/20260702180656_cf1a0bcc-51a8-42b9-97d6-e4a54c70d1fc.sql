-- Fase 3: estender enum app_role com os novos perfis padrão do CloudGest.
-- Executado em migração separada porque Postgres não permite usar um novo
-- valor de enum na mesma transação em que ele foi adicionado.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'desenvolvedor') THEN
    ALTER TYPE public.app_role ADD VALUE 'desenvolvedor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'dono') THEN
    ALTER TYPE public.app_role ADD VALUE 'dono';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'comercial') THEN
    ALTER TYPE public.app_role ADD VALUE 'comercial';
  END IF;
END $$;