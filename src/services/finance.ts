import { supabase } from "./_client";
import { numberingService } from "./numbering";
import { workflowService } from "./workflow";
import {
  entityFor,
  type FinanceCategory,
  type FinanceCategoriaTipo,
  type FinanceInstallment,
  type FinancePayment,
  type FinanceTipo,
  type FinanceTitle,
} from "@/domain/finance";

// -----------------------------------------------------------------------------
// Serviço do Módulo Financeiro
// -----------------------------------------------------------------------------
// Regras:
//   - Numeração via motor de numeração (next_finance_number).
//   - Estados via Motor de Workflow (entidade finance_receivable/payable).
//   - Pagamentos aplicados via RPC finance_apply_payment (recalcula saldos e
//     move o workflow para "parcial"/"pago" automaticamente).
//   - Cancelamentos/estornos disparam aprovação via Sistema de Aprovações
//     (definido nas transitions do workflow, com requires_approval=true).
// -----------------------------------------------------------------------------

export type TitleRow = FinanceTitle & {
  customers: { nome: string } | null;
  suppliers: { razao_social: string } | null;
  finance_categories: { nome: string; cor: string | null } | null;
  orders: { numero: string } | null;
};

export type CreateTitleInput = {
  tipo: FinanceTipo;
  customer_id?: string | null;
  supplier_id?: string | null;
  order_id?: string | null;
  category_id?: string | null;
  descricao?: string | null;
  data_emissao?: string;
  valor_total: number;
  desconto?: number;
  observacoes?: string | null;
  parcelas: Array<{ vencimento: string; valor: number }>;
};

export const financeService = {
  // ------------------------------ Categorias -------------------------------
  async listCategories(tipo?: FinanceCategoriaTipo): Promise<FinanceCategory[]> {
    let q = supabase
      .from("finance_categories")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    if (tipo) q = q.eq("tipo", tipo);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as FinanceCategory[];
  },

  async createCategory(input: { tipo: FinanceCategoriaTipo; nome: string; cor?: string | null }) {
    const { error } = await supabase.from("finance_categories").insert({
      tipo: input.tipo,
      nome: input.nome,
      cor: input.cor ?? null,
    } as never);
    if (error) throw error;
  },

  async updateCategory(id: string, patch: Partial<Pick<FinanceCategory, "nome" | "cor" | "ativo">>) {
    const { error } = await supabase.from("finance_categories").update(patch as never).eq("id", id);
    if (error) throw error;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.rpc("soft_delete", { _table: "finance_categories", _id: id });
    if (error) throw error;
  },

  // -------------------------------- Títulos --------------------------------
  async listTitles(tipo: FinanceTipo): Promise<TitleRow[]> {
    const { data, error } = await supabase
      .from("finance_titles")
      .select("*, customers(nome), suppliers(nome), finance_categories(nome,cor), orders(numero)")
      .eq("tipo", tipo)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as TitleRow[];
  },

  async getTitle(id: string): Promise<TitleRow> {
    const { data, error } = await supabase
      .from("finance_titles")
      .select("*, customers(nome), suppliers(nome), finance_categories(nome,cor), orders(numero)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as TitleRow;
  },

  async listInstallments(titleId: string): Promise<FinanceInstallment[]> {
    const { data, error } = await supabase
      .from("finance_installments")
      .select("*")
      .eq("title_id", titleId)
      .order("numero_parcela");
    if (error) throw error;
    return (data ?? []) as FinanceInstallment[];
  },

  async listPayments(titleId: string): Promise<FinancePayment[]> {
    const { data, error } = await supabase
      .from("finance_payments")
      .select("*")
      .eq("title_id", titleId)
      .order("data_pagamento", { ascending: false });
    if (error) throw error;
    return (data ?? []) as FinancePayment[];
  },

  async create(input: CreateTitleInput): Promise<string> {
    if (!input.parcelas.length) throw new Error("Informe ao menos uma parcela");
    const totalParcelas = input.parcelas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    if (Math.abs(totalParcelas - Number(input.valor_total)) > 0.01) {
      throw new Error("Soma das parcelas difere do valor total");
    }

    const numero = await numberingService.next(entityFor(input.tipo));

    const { data: title, error } = await supabase
      .from("finance_titles")
      .insert({
        numero,
        tipo: input.tipo,
        customer_id: input.customer_id ?? null,
        supplier_id: input.supplier_id ?? null,
        order_id: input.order_id ?? null,
        category_id: input.category_id ?? null,
        descricao: input.descricao ?? null,
        data_emissao: input.data_emissao ?? new Date().toISOString().slice(0, 10),
        valor_total: input.valor_total,
        saldo: input.valor_total,
        desconto: input.desconto ?? 0,
        observacoes: input.observacoes ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    const titleId = (title as { id: string }).id;

    const rows = input.parcelas.map((p, i) => ({
      title_id: titleId,
      numero_parcela: i + 1,
      vencimento: p.vencimento,
      valor: p.valor,
      saldo: p.valor,
    }));
    const { error: iErr } = await supabase.from("finance_installments").insert(rows as never);
    if (iErr) throw iErr;

    // Inicia workflow
    await workflowService.start(entityFor(input.tipo), titleId);
    return titleId;
  },

  async applyPayment(input: {
    installment_id: string;
    valor: number;
    data?: string;
    forma?: string | null;
    observacao?: string | null;
  }): Promise<string> {
    const { data, error } = await supabase.rpc("finance_apply_payment", {
      _installment_id: input.installment_id,
      _valor: input.valor,
      _data: input.data ?? new Date().toISOString().slice(0, 10),
      _forma: input.forma ?? undefined,
      _obs: input.observacao ?? undefined,
    });
    if (error) throw error;
    return data as string;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc("soft_delete", { _table: "finance_titles", _id: id });
    if (error) throw error;
  },

  // ---------------------------- Fluxo de caixa -----------------------------
  async cashflow(range: { from: string; to: string }) {
    const { data: inst, error } = await supabase
      .from("finance_installments")
      .select("vencimento, valor, saldo, title_id, finance_titles!inner(tipo, deleted_at)")
      .gte("vencimento", range.from)
      .lte("vencimento", range.to);
    if (error) throw error;

    const { data: payments, error: pErr } = await supabase
      .from("finance_payments")
      .select("data_pagamento, valor, title_id, finance_titles!inner(tipo)")
      .gte("data_pagamento", range.from)
      .lte("data_pagamento", range.to)
      .is("estornado_em", null);
    if (pErr) throw pErr;

    const bucket = new Map<string, { receber: number; pagar: number; recebido: number; pago: number }>();
    const ensure = (d: string) => {
      if (!bucket.has(d)) bucket.set(d, { receber: 0, pagar: 0, recebido: 0, pago: 0 });
      return bucket.get(d)!;
    };

    for (const row of inst ?? []) {
      const r = row as unknown as {
        vencimento: string;
        saldo: number;
        finance_titles: { tipo: FinanceTipo; deleted_at: string | null } | null;
      };
      if (r.finance_titles?.deleted_at) continue;
      const b = ensure(r.vencimento);
      if (r.finance_titles?.tipo === "receivable") b.receber += Number(r.saldo);
      else b.pagar += Number(r.saldo);
    }
    for (const row of payments ?? []) {
      const p = row as unknown as {
        data_pagamento: string;
        valor: number;
        finance_titles: { tipo: FinanceTipo } | null;
      };
      const b = ensure(p.data_pagamento);
      if (p.finance_titles?.tipo === "receivable") b.recebido += Number(p.valor);
      else b.pago += Number(p.valor);
    }
    return Array.from(bucket.entries())
      .map(([data, v]) => ({ data, ...v }))
      .sort((a, b) => a.data.localeCompare(b.data));
  },
};
