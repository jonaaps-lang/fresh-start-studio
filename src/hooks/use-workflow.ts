import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workflowService } from "@/services/workflow";
import type { AvailableTransition } from "@/domain/workflow";

// -----------------------------------------------------------------------------
// Hook central para consumir o Motor de Workflow em qualquer módulo.
//
//   const wf = useWorkflow("orders", order.id);
//   wf.instance      // { current_state_id, workflow_states, ... } | null
//   wf.transitions   // AvailableTransition[]
//   wf.transition({ transition_id, motivo, observacao })
//
// A UI de status/ações de cada módulo deve renderizar a partir daqui —
// nunca a partir de um enum local.
// -----------------------------------------------------------------------------

export function useWorkflow(entidade: string, entidadeId: string | null | undefined) {
  const qc = useQueryClient();
  const enabled = Boolean(entidadeId);

  const instanceQ = useQuery({
    queryKey: ["workflow", entidade, entidadeId, "instance"],
    queryFn: () => workflowService.getInstance(entidade, entidadeId!),
    enabled,
    staleTime: 30_000,
  });

  const instanceId = instanceQ.data?.id;

  const transitionsQ = useQuery({
    queryKey: ["workflow", entidade, entidadeId, "transitions", instanceId],
    queryFn: () => workflowService.availableTransitions(instanceId!),
    enabled: Boolean(instanceId),
    staleTime: 15_000,
  });

  const historyQ = useQuery({
    queryKey: ["workflow", entidade, entidadeId, "history", instanceId],
    queryFn: () => workflowService.history(instanceId!),
    enabled: Boolean(instanceId),
    staleTime: 15_000,
  });

  const startMut = useMutation({
    mutationFn: () => workflowService.start(entidade, entidadeId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow", entidade, entidadeId] }),
  });

  const transitionMut = useMutation({
    mutationFn: (input: { transition_id: string; motivo?: string | null; observacao?: string | null }) =>
      workflowService.transition(instanceId!, input.transition_id, {
        motivo: input.motivo,
        observacao: input.observacao,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow", entidade, entidadeId] }),
  });

  return {
    loading: instanceQ.isLoading || transitionsQ.isLoading,
    instance: instanceQ.data ?? null,
    currentState: instanceQ.data?.workflow_states ?? null,
    transitions: (transitionsQ.data ?? []) as AvailableTransition[],
    history: historyQ.data ?? [],
    start: startMut.mutateAsync,
    transition: transitionMut.mutateAsync,
    isTransitioning: transitionMut.isPending,
    refresh: () => qc.invalidateQueries({ queryKey: ["workflow", entidade, entidadeId] }),
  };
}
