// -----------------------------------------------------------------------------
// Módulo Financeiro — tipos de domínio.
//
// Reutiliza os motores centrais:
//   - Multiempresa via empresa_id
//   - Workflow via entidades "finance_receivable" e "finance_payable"
//   - Permissões `financeiro.*` (motor de permissões)
//   - Numeração via next_finance_number
// -----------------------------------------------------------------------------

export const FINANCE_ENTITIES = {
  receivable: "finance_receivable",
  payable: "finance_payable",
} as const;

export type FinanceTipo = "receivable" | "payable";

export type FinanceCategoriaTipo = "receita" | "despesa";

export interface FinanceCategory {
  id: string;
  empresa_id: string;
  tipo: FinanceCategoriaTipo;
  nome: string;
  cor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceTitle {
  id: string;
  empresa_id: string;
  numero: string;
  tipo: FinanceTipo;
  customer_id: string | null;
  supplier_id: string | null;
  order_id: string | null;
  category_id: string | null;
  descricao: string | null;
  data_emissao: string;
  valor_total: number;
  saldo: number;
  desconto: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceInstallment {
  id: string;
  empresa_id: string;
  title_id: string;
  numero_parcela: number;
  vencimento: string;
  valor: number;
  saldo: number;
}

export interface FinancePayment {
  id: string;
  empresa_id: string;
  installment_id: string;
  title_id: string;
  data_pagamento: string;
  valor: number;
  forma_pagamento: string | null;
  observacao: string | null;
  estornado_em: string | null;
}

export function entityFor(tipo: FinanceTipo): string {
  return FINANCE_ENTITIES[tipo];
}
