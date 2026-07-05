// -----------------------------------------------------------------------------
// Módulo de Produção — tipos de domínio.
// Estados NÃO são declarados aqui: são controlados pelo Motor de Workflow
// (entidade "production"). Prioridades também podem ser configuráveis
// pelo Motor de Configuração no futuro — o array abaixo é apenas o default.
// -----------------------------------------------------------------------------

export const PRODUCTION_ENTITY = "production" as const;

export const PRODUCTION_PRIORITIES = ["baixa", "media", "alta", "urgente"] as const;
export type ProductionPriority = (typeof PRODUCTION_PRIORITIES)[number];

export const PRIORITY_LABEL: Record<ProductionPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export interface ProductionOrder {
  id: string;
  empresa_id: string;
  numero: string;
  order_id: string | null;
  customer_id: string | null;
  descricao_servico: string | null;
  prioridade: ProductionPriority;
  responsavel_id: string | null;
  setor: string | null;
  prazo_producao: string | null;
  data_prevista: string | null;
  data_conclusao: string | null;
  observacoes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductionOrderItem {
  id: string;
  production_order_id: string;
  ordem: number;
  product_id: string | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
}

export interface ProductionOrderAttachment {
  id: string;
  production_order_id: string;
  storage_path: string;
  nome: string;
  mime: string | null;
  size: number | null;
  created_at: string;
}

export type ProductionTimeType =
  | "inicio"
  | "pausa"
  | "retomada"
  | "termino"
  | "nota"
  | "atraso";

export interface ProductionTimeEntry {
  id: string;
  production_order_id: string;
  operator_id: string | null;
  tipo: ProductionTimeType;
  motivo: string | null;
  observacao: string | null;
  occurred_at: string;
  created_at: string;
}
