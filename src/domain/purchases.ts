// -----------------------------------------------------------------------------
// Módulo de Compras — tipos de domínio.
//
// Estados NÃO são fixos no código: são controlados 100% pelo Motor de Workflow
// (entidade "purchase"). A numeração usa o Motor de Numeração (prefixo COM).
// Geração de Contas a Pagar reutiliza o Motor Financeiro
// (finance_titles / finance_installments) via generate_ap_from_purchase.
// -----------------------------------------------------------------------------

export const PURCHASE_ENTITY = "purchase" as const;

export interface PurchaseOrder {
  id: string;
  empresa_id: string;
  numero: string;
  supplier_id: string | null;
  data_emissao: string;
  data_prevista: string | null;
  data_recebimento: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  finance_title_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  empresa_id: string;
  purchase_order_id: string;
  ordem: number;
  product_id: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  desconto: number;
  total: number;
}
