-- Amplia permissão de edição de company_settings para gerente e financeiro,
-- mantendo apenas admin para criar/excluir.
DROP POLICY IF EXISTS "Admin atualiza configurações" ON public.company_settings;

CREATE POLICY "Equipe edita configurações"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'financeiro')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'financeiro')
);