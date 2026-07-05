import { supabase } from "./_client";

// -----------------------------------------------------------------------------
// Motor de Numeração
// -----------------------------------------------------------------------------
// Camada única para gerar a numeração visível ao usuário. Delega para as RPCs
// SECURITY DEFINER `next_document_number` / `next_*_number`, que reutilizam
// os `document_counters` (por empresa + tipo) já existentes.
//
// Uso:
//   await numberingService.next("quote")     -> "ORC-00042"
//   await numberingService.next("custom", "OS")  // prefixo custom
//
// Regras:
//   - UUID continua sendo o identificador interno (nunca substituído).
//   - Um mesmo `tipo` mantém sequência única por empresa.
//   - Prefixos são configuráveis pelo Motor de Configuração (documentos).
// -----------------------------------------------------------------------------

type FinanceKind = "finance_receivable" | "finance_payable";
const FINANCE_KINDS: FinanceKind[] = ["finance_receivable", "finance_payable"];

export type BuiltInNumberKind =
  | "quote"
  | "order"
  | "production"
  | FinanceKind;

const BUILTIN_PREFIX: Record<BuiltInNumberKind, string> = {
  quote: "ORC",
  order: "PED",
  production: "OP",
  finance_receivable: "FIN-R",
  finance_payable: "FIN-P",
};

export const numberingService = {
  /** Gera o próximo número visível para o tipo informado. */
  async next(kind: BuiltInNumberKind | string, prefixOverride?: string): Promise<string> {
    // Se for built-in com RPC dedicada, usa-a (mantém compat total).
    if (kind === "quote") {
      const { data, error } = await supabase.rpc("next_quote_number");
      if (error) throw error;
      return data as string;
    }
    if (kind === "order") {
      const { data, error } = await supabase.rpc("next_order_number");
      if (error) throw error;
      return data as string;
    }
    if (kind === "production") {
      const { data, error } = await supabase.rpc("next_production_number");
      if (error) throw error;
      return data as string;
    }
    if ((FINANCE_KINDS as string[]).includes(kind)) {
      const tipo = kind === "finance_receivable" ? "receivable" : "payable";
      const { data, error } = await supabase.rpc("next_finance_number", { _tipo: tipo });
      if (error) throw error;
      return data as string;
    }
    // Genérico
    const prefixo = prefixOverride ?? BUILTIN_PREFIX[kind as BuiltInNumberKind] ?? kind.toUpperCase().slice(0, 6);
    const { data, error } = await supabase.rpc("next_document_number", { _tipo: kind, _prefixo: prefixo });
    if (error) throw error;
    return data as string;
  },
};
