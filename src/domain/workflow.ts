// -----------------------------------------------------------------------------
// Motor de Workflow — tipos de domínio.
//
// Estruturas genéricas usadas por QUALQUER módulo (orçamentos, pedidos,
// produção, financeiro, compras, estoque, CRM, fiscal, futuros).
//
// Nenhum módulo deve declarar seus próprios enums de status — o motor é
// a fonte única de verdade. A entidade é referenciada por string
// (`entidade`) para permitir extensibilidade sem migração de esquema.
// -----------------------------------------------------------------------------

/** Entidades reconhecidas pelo motor. Adicionar aqui ao habilitar um módulo. */
export const WORKFLOW_ENTITIES = [
  "quotes",
  "orders",
  "production",
  "finance_receivable",
  "finance_payable",
  "purchases",
  "stock_movement",
  "crm_deal",
  "fiscal_document",
] as const;
export type WorkflowEntity = (typeof WORKFLOW_ENTITIES)[number];

export interface Workflow {
  id: string;
  empresa_id: string;
  entidade: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowState {
  id: string;
  empresa_id: string;
  workflow_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  is_initial: boolean;
  is_final: boolean;
  cor: string | null;
  icone: string | null;
}

export interface WorkflowTransition {
  id: string;
  empresa_id: string;
  workflow_id: string;
  from_state_id: string;
  to_state_id: string;
  nome: string;
  permission_required: string | null;
  requires_approval: boolean;
  requires_motivo: boolean;
  requires_observacao: boolean;
  ordem: number;
}

export interface WorkflowInstance {
  id: string;
  empresa_id: string;
  workflow_id: string;
  entidade: string;
  entidade_id: string;
  current_state_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowHistoryEntry {
  id: string;
  empresa_id: string;
  instance_id: string;
  from_state_id: string | null;
  to_state_id: string;
  transition_id: string | null;
  motivo: string | null;
  observacao: string | null;
  actor_id: string | null;
  approval_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/** Retorno de `workflow_available_transitions`. */
export interface AvailableTransition {
  id: string;
  nome: string;
  to_state_id: string;
  to_state_codigo: string;
  to_state_nome: string;
  requires_motivo: boolean;
  requires_observacao: boolean;
  requires_approval: boolean;
  permission_required: string | null;
  allowed: boolean;
}

/**
 * Ganchos previstos para futuras extensões (eventos, notificações, webhooks,
 * automações, workflow visual). Nenhum é implementado agora — apenas o
 * shape está reservado no `payload` do histórico:
 *   { event: "transition" | "start" | "approval_requested" | ... }
 */
export type WorkflowEvent =
  | "start"
  | "transition"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected";
