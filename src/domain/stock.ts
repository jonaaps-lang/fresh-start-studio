// -----------------------------------------------------------------------------
// Módulo de Estoque — tipos de domínio.
//
// Estoque é OPCIONAL: controlado por `utiliza_estoque` no Motor de Configuração
// (categoria "estoque"). Movimentações são registradas em stock_movements e o
// saldo agregado é lido da view stock_balances.
// -----------------------------------------------------------------------------

export const STOCK_ENTITY = "stock" as const;

export type StockMovementType = "entrada" | "saida" | "ajuste" | "inventario";

export const STOCK_MOVEMENT_LABEL: Record<StockMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  inventario: "Inventário",
};

export interface StockMovement {
  id: string;
  empresa_id: string;
  product_id: string;
  tipo: StockMovementType;
  quantidade: number;
  custo_unitario: number | null;
  origem: string | null;
  origem_id: string | null;
  observacao: string | null;
  data_movimento: string;
  created_at: string;
}

export interface StockBalance {
  product_id: string;
  empresa_id: string;
  nome: string;
  codigo: string | null;
  unidade: string;
  saldo: number;
}
