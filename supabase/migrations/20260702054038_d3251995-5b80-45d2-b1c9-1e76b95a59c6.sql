
ALTER TABLE public.customers        ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id();
ALTER TABLE public.suppliers        ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id();
ALTER TABLE public.products         ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id();
ALTER TABLE public.quotes           ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id();
ALTER TABLE public.orders           ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id();
ALTER TABLE public.company_settings ALTER COLUMN empresa_id SET DEFAULT public.current_empresa_id();
-- itens: default via trigger (dependem do pai); manter NOT NULL mas usar um placeholder default
-- que o trigger tg_fill_child_tenant sobrescreve antes do insert:
ALTER TABLE public.quote_items      ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE public.order_items      ALTER COLUMN empresa_id DROP NOT NULL;
