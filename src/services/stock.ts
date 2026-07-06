import { supabase } from "./_client";
import type {
  StockBalance,
  StockMovement,
  StockMovementType,
} from "@/domain/stock";

// -----------------------------------------------------------------------------
// Serviço de Estoque
// -----------------------------------------------------------------------------
// Reutiliza:
//   - Motor de Permissões (`estoque.view`, `estoque.edit`)
//   - Motor de Configuração (categoria "estoque" — utiliza_estoque, etc.)
// Movimentações são imutáveis: para corrigir, lance um novo ajuste.
// -----------------------------------------------------------------------------

export type StockMovementRow = StockMovement & {
  products: { nome: string; codigo: string | null; unidade: string } | null;
};

export const stockService = {
  async listMovements(filters?: { productId?: string; tipo?: StockMovementType }) {
    let q = supabase
      .from("stock_movements")
      .select("*, products(nome,codigo,unidade)")
      .order("data_movimento", { ascending: false })
      .limit(500);
    if (filters?.productId) q = q.eq("product_id", filters.productId);
    if (filters?.tipo) q = q.eq("tipo", filters.tipo);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as StockMovementRow[];
  },

  async balances(): Promise<StockBalance[]> {
    const { data, error } = await supabase
      .from("stock_balances")
      .select("*")
      .order("nome");
    if (error) throw error;
    return (data ?? []) as StockBalance[];
  },

  async adjust(input: {
    product_id: string;
    tipo: StockMovementType;
    quantidade: number;
    custo_unitario?: number | null;
    observacao?: string | null;
  }): Promise<string> {
    const { data, error } = await supabase.rpc("stock_adjust", {
      _product_id: input.product_id,
      _tipo: input.tipo,
      _quantidade: input.quantidade,
      _custo_unitario: input.custo_unitario ?? undefined,
      _observacao: input.observacao ?? undefined,
      _origem: "manual",
      _origem_id: undefined,
    });
    if (error) throw error;
    return data as string;
  },
};
