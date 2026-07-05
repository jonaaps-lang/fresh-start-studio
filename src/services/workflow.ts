import { supabase } from "./_client";
import {
  startWorkflow,
  listAvailableTransitions,
  executeTransition,
  getInstanceByEntity,
  listInstanceHistory,
} from "@/lib/workflow.functions";
import type {
  AvailableTransition,
  Workflow,
  WorkflowHistoryEntry,
  WorkflowInstance,
  WorkflowState,
  WorkflowTransition,
} from "@/domain/workflow";

// -----------------------------------------------------------------------------
// Camada de serviço do Motor de Workflow.
// Regra: módulos NUNCA importam `@/lib/workflow.functions` diretamente.
// Também não escrevem em workflow_instances/history — só via este service.
// -----------------------------------------------------------------------------

export const workflowService = {
  // ---------- Leitura de definições (para telas de configuração/UI) --------
  async listWorkflows(entidade?: string): Promise<Workflow[]> {
    let q = supabase.from("workflows").select("*").is("deleted_at", null).order("created_at");
    if (entidade) q = q.eq("entidade", entidade);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Workflow[];
  },

  async listStates(workflowId: string): Promise<WorkflowState[]> {
    const { data, error } = await supabase
      .from("workflow_states")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("ordem");
    if (error) throw error;
    return (data ?? []) as WorkflowState[];
  },

  async listTransitions(workflowId: string): Promise<WorkflowTransition[]> {
    const { data, error } = await supabase
      .from("workflow_transitions")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("ordem");
    if (error) throw error;
    return (data ?? []) as WorkflowTransition[];
  },

  // ---------- Instâncias & execução ----------------------------------------
  async start(entidade: string, entidade_id: string, workflow_id?: string): Promise<string> {
    const r = await startWorkflow({ data: { entidade, entidade_id, workflow_id } });
    return r.instance_id;
  },

  async getInstance(entidade: string, entidade_id: string) {
    return (await getInstanceByEntity({ data: { entidade, entidade_id } })) as
      | (WorkflowInstance & { workflow_states: WorkflowState | null })
      | null;
  },

  async availableTransitions(instance_id: string): Promise<AvailableTransition[]> {
    return (await listAvailableTransitions({ data: { instance_id } })) as AvailableTransition[];
  },

  async transition(
    instance_id: string,
    transition_id: string,
    opts?: { motivo?: string | null; observacao?: string | null },
  ): Promise<string> {
    const r = await executeTransition({
      data: {
        instance_id,
        transition_id,
        motivo: opts?.motivo ?? null,
        observacao: opts?.observacao ?? null,
      },
    });
    return r.id;
  },

  async history(instance_id: string, limit = 50): Promise<WorkflowHistoryEntry[]> {
    return (await listInstanceHistory({ data: { instance_id, limit } })) as WorkflowHistoryEntry[];
  },
};
