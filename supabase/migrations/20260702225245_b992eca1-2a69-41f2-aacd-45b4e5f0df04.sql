-- =============================================================================
-- FASE 4: Motor de Workflow e Estados
-- =============================================================================

-- 1) workflows -----------------------------------------------------------------
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entidade TEXT NOT NULL,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  UNIQUE (empresa_id, entidade, codigo)
);
CREATE INDEX idx_workflows_empresa_entidade ON public.workflows(empresa_id, entidade) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflows_select" ON public.workflows FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
CREATE POLICY "workflows_write_admin" ON public.workflows FOR ALL TO authenticated
  USING (
    (empresa_id IN (SELECT public.user_empresa_ids())
      AND (public.has_role(auth.uid(),'dono') OR public.has_role(auth.uid(),'admin')))
    OR public.has_role(auth.uid(),'desenvolvedor')
  )
  WITH CHECK (
    (empresa_id IN (SELECT public.user_empresa_ids())
      AND (public.has_role(auth.uid(),'dono') OR public.has_role(auth.uid(),'admin')))
    OR public.has_role(auth.uid(),'desenvolvedor')
  );

CREATE TRIGGER trg_workflows_tenant BEFORE INSERT OR UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();
CREATE TRIGGER trg_workflows_updated BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) workflow_states -----------------------------------------------------------
CREATE TABLE public.workflow_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  is_initial BOOLEAN NOT NULL DEFAULT false,
  is_final BOOLEAN NOT NULL DEFAULT false,
  cor TEXT,
  icone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE (workflow_id, codigo)
);
CREATE INDEX idx_workflow_states_wf ON public.workflow_states(workflow_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_states TO authenticated;
GRANT ALL ON public.workflow_states TO service_role;
ALTER TABLE public.workflow_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wstates_select" ON public.workflow_states FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
CREATE POLICY "wstates_write_admin" ON public.workflow_states FOR ALL TO authenticated
  USING (
    (empresa_id IN (SELECT public.user_empresa_ids())
      AND (public.has_role(auth.uid(),'dono') OR public.has_role(auth.uid(),'admin')))
    OR public.has_role(auth.uid(),'desenvolvedor')
  )
  WITH CHECK (
    (empresa_id IN (SELECT public.user_empresa_ids())
      AND (public.has_role(auth.uid(),'dono') OR public.has_role(auth.uid(),'admin')))
    OR public.has_role(auth.uid(),'desenvolvedor')
  );

CREATE TRIGGER trg_wstates_tenant BEFORE INSERT OR UPDATE ON public.workflow_states
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();
CREATE TRIGGER trg_wstates_updated BEFORE UPDATE ON public.workflow_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) workflow_transitions ------------------------------------------------------
CREATE TABLE public.workflow_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  from_state_id UUID NOT NULL REFERENCES public.workflow_states(id) ON DELETE CASCADE,
  to_state_id UUID NOT NULL REFERENCES public.workflow_states(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  permission_required TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  requires_motivo BOOLEAN NOT NULL DEFAULT false,
  requires_observacao BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE (workflow_id, from_state_id, to_state_id)
);
CREATE INDEX idx_wtransitions_from ON public.workflow_transitions(from_state_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_transitions TO authenticated;
GRANT ALL ON public.workflow_transitions TO service_role;
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wtrans_select" ON public.workflow_transitions FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
CREATE POLICY "wtrans_write_admin" ON public.workflow_transitions FOR ALL TO authenticated
  USING (
    (empresa_id IN (SELECT public.user_empresa_ids())
      AND (public.has_role(auth.uid(),'dono') OR public.has_role(auth.uid(),'admin')))
    OR public.has_role(auth.uid(),'desenvolvedor')
  )
  WITH CHECK (
    (empresa_id IN (SELECT public.user_empresa_ids())
      AND (public.has_role(auth.uid(),'dono') OR public.has_role(auth.uid(),'admin')))
    OR public.has_role(auth.uid(),'desenvolvedor')
  );

CREATE TRIGGER trg_wtrans_tenant BEFORE INSERT OR UPDATE ON public.workflow_transitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_tenant_fields();
CREATE TRIGGER trg_wtrans_updated BEFORE UPDATE ON public.workflow_transitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) workflow_instances --------------------------------------------------------
CREATE TABLE public.workflow_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id),
  entidade TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  current_state_id UUID NOT NULL REFERENCES public.workflow_states(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE (entidade, entidade_id)
);
CREATE INDEX idx_winstances_entidade ON public.workflow_instances(entidade, entidade_id);
CREATE INDEX idx_winstances_state ON public.workflow_instances(current_state_id);

GRANT SELECT ON public.workflow_instances TO authenticated;
GRANT ALL ON public.workflow_instances TO service_role;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "winst_select" ON public.workflow_instances FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));
-- Writes only via SECURITY DEFINER RPCs (workflow_start / workflow_transition).

CREATE TRIGGER trg_winst_updated BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) workflow_history (imutável) -----------------------------------------------
CREATE TABLE public.workflow_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  from_state_id UUID REFERENCES public.workflow_states(id),
  to_state_id UUID NOT NULL REFERENCES public.workflow_states(id),
  transition_id UUID REFERENCES public.workflow_transitions(id),
  motivo TEXT,
  observacao TEXT,
  actor_id UUID,
  approval_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whistory_instance ON public.workflow_history(instance_id, created_at DESC);

GRANT SELECT ON public.workflow_history TO authenticated;
GRANT ALL ON public.workflow_history TO service_role;
ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whist_select" ON public.workflow_history FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.user_empresa_ids()) OR public.has_role(auth.uid(),'desenvolvedor'));

-- 6) RPCs ----------------------------------------------------------------------

-- Inicia uma instância de workflow para uma entidade.
CREATE OR REPLACE FUNCTION public.workflow_start(
  _entidade TEXT,
  _entidade_id UUID,
  _workflow_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa UUID := public.current_empresa_id();
  v_wf UUID := _workflow_id;
  v_initial UUID;
  v_instance UUID;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'empresa não identificada'; END IF;

  IF v_wf IS NULL THEN
    SELECT id INTO v_wf FROM public.workflows
     WHERE empresa_id = v_empresa AND entidade = _entidade AND ativo = true
       AND deleted_at IS NULL
     ORDER BY is_default DESC, created_at ASC LIMIT 1;
    IF v_wf IS NULL THEN RAISE EXCEPTION 'nenhum workflow ativo para %', _entidade; END IF;
  END IF;

  SELECT id INTO v_initial FROM public.workflow_states
   WHERE workflow_id = v_wf AND is_initial = true
   ORDER BY ordem ASC LIMIT 1;
  IF v_initial IS NULL THEN RAISE EXCEPTION 'workflow sem estado inicial'; END IF;

  INSERT INTO public.workflow_instances (empresa_id, workflow_id, entidade, entidade_id, current_state_id, created_by, updated_by)
    VALUES (v_empresa, v_wf, _entidade, _entidade_id, v_initial, auth.uid(), auth.uid())
  ON CONFLICT (entidade, entidade_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_instance;

  INSERT INTO public.workflow_history (empresa_id, instance_id, from_state_id, to_state_id, actor_id, payload)
    VALUES (v_empresa, v_instance, NULL, v_initial, auth.uid(), jsonb_build_object('event','start'));

  RETURN v_instance;
END; $$;

-- Lista transições disponíveis do estado atual da instância.
CREATE OR REPLACE FUNCTION public.workflow_available_transitions(_instance_id UUID)
RETURNS TABLE (
  id UUID, nome TEXT, to_state_id UUID, to_state_codigo TEXT, to_state_nome TEXT,
  requires_motivo BOOLEAN, requires_observacao BOOLEAN, requires_approval BOOLEAN,
  permission_required TEXT, allowed BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_state UUID; v_empresa UUID;
BEGIN
  SELECT current_state_id, empresa_id INTO v_state, v_empresa
    FROM public.workflow_instances WHERE id = _instance_id;
  IF v_state IS NULL THEN RETURN; END IF;
  IF NOT public.is_member_of_empresa(v_empresa)
     AND NOT public.has_role(auth.uid(),'desenvolvedor') THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT t.id, t.nome, t.to_state_id, s.codigo, s.nome,
           t.requires_motivo, t.requires_observacao, t.requires_approval,
           t.permission_required,
           (t.permission_required IS NULL
             OR public.has_permission(auth.uid(), t.permission_required, v_empresa))
      FROM public.workflow_transitions t
      JOIN public.workflow_states s ON s.id = t.to_state_id
     WHERE t.from_state_id = v_state
     ORDER BY t.ordem ASC, t.nome ASC;
END; $$;

-- Executa a transição.
CREATE OR REPLACE FUNCTION public.workflow_transition(
  _instance_id UUID,
  _transition_id UUID,
  _motivo TEXT DEFAULT NULL,
  _observacao TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst RECORD; v_trans RECORD; v_approval UUID;
BEGIN
  SELECT * INTO v_inst FROM public.workflow_instances WHERE id = _instance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'instância não encontrada'; END IF;

  IF NOT public.is_member_of_empresa(v_inst.empresa_id)
     AND NOT public.has_role(auth.uid(),'desenvolvedor') THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  SELECT * INTO v_trans FROM public.workflow_transitions WHERE id = _transition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'transição não encontrada'; END IF;
  IF v_trans.workflow_id <> v_inst.workflow_id THEN
    RAISE EXCEPTION 'transição pertence a outro workflow';
  END IF;
  IF v_trans.from_state_id <> v_inst.current_state_id THEN
    RAISE EXCEPTION 'transição inválida para o estado atual';
  END IF;

  IF v_trans.permission_required IS NOT NULL
     AND NOT public.has_permission(auth.uid(), v_trans.permission_required, v_inst.empresa_id)
     AND NOT public.has_role(auth.uid(),'desenvolvedor') THEN
    RAISE EXCEPTION 'permissão insuficiente: %', v_trans.permission_required;
  END IF;

  IF v_trans.requires_motivo AND (_motivo IS NULL OR length(trim(_motivo)) < 3) THEN
    RAISE EXCEPTION 'motivo obrigatório';
  END IF;
  IF v_trans.requires_observacao AND (_observacao IS NULL OR length(trim(_observacao)) < 3) THEN
    RAISE EXCEPTION 'observação obrigatória';
  END IF;

  IF v_trans.requires_approval THEN
    INSERT INTO public.approvals (
      empresa_id, entidade, entidade_id, acao, status,
      solicitado_por, motivo, payload
    ) VALUES (
      v_inst.empresa_id, v_inst.entidade, v_inst.entidade_id,
      'workflow_transition', 'pendente', auth.uid(), _motivo,
      jsonb_build_object(
        'instance_id', v_inst.id,
        'transition_id', v_trans.id,
        'to_state_id', v_trans.to_state_id,
        'observacao', _observacao
      )
    ) RETURNING id INTO v_approval;

    INSERT INTO public.workflow_history (
      empresa_id, instance_id, from_state_id, to_state_id, transition_id,
      motivo, observacao, actor_id, approval_id, payload
    ) VALUES (
      v_inst.empresa_id, v_inst.id, v_inst.current_state_id, v_trans.to_state_id, v_trans.id,
      _motivo, _observacao, auth.uid(), v_approval,
      jsonb_build_object('event','approval_requested')
    );
    RETURN v_approval;
  END IF;

  UPDATE public.workflow_instances
     SET current_state_id = v_trans.to_state_id, updated_at = now(), updated_by = auth.uid()
   WHERE id = v_inst.id;

  INSERT INTO public.workflow_history (
    empresa_id, instance_id, from_state_id, to_state_id, transition_id,
    motivo, observacao, actor_id, payload
  ) VALUES (
    v_inst.empresa_id, v_inst.id, v_inst.current_state_id, v_trans.to_state_id, v_trans.id,
    _motivo, _observacao, auth.uid(),
    jsonb_build_object('event','transition')
  );

  RETURN v_inst.id;
END; $$;

GRANT EXECUTE ON FUNCTION public.workflow_start(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_available_transitions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_transition(UUID, UUID, TEXT, TEXT) TO authenticated;
