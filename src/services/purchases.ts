import { supabase } from "./_client";
import { numberingService } from "./numbering";
import { workflowService } from "./workflow";
import { PURCHASE_ENTITY, type PurchaseOrder, type PurchaseOrderItem } from "@/domain/purchases";

// -----------------------------------------------------------------------------
// Serviço de Compras
// -----------------------------------------------------------------------------
// Reutiliza integralmente:
//   - Motor de Numeração (numberingService.next("purchase"))
//   - Motor de Workflow (entidade "purchase")
//   - Motor Financeiro (generate_ap_from_purchase RPC)
//   - Motor de Estoque (receive_purchase_order dispara entradas)
// -----------------------------------------------------------------------------

export type PurchaseRow = PurchaseOrder & {
  suppliers: { razao_social: string } | null;
};

export type CreatePurchaseInput = {
  supplier_id: string | null;
  data_emissao?: string;
  data_prevista?: string | null;
  condicoes_pagamento?: string | null;
  observacoes?: string | null;
  desconto?: number;
  acrescimo?: number;
  itens: Array<{
    product_id: string | null;
    descricao: string;
    quantidade: number;
    unidade: string;
    preco_unitario: number;
    desconto?: number;
  }>;
};

export const purchasesService = {
  async list(): Promise<PurchaseRow[]> {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(razao_social)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PurchaseRow[];
  },

  async get(id: string): Promise<PurchaseRow> {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(razao_social)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as PurchaseRow;
  },

  async listItems(purchase_order_id: string): Promise<PurchaseOrderItem[]> {
    const { data, error } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", purchase_order_id)
      .order("ordem");
    if (error) throw error;
    return (data ?? []) as PurchaseOrderItem[];
  },

  async create(input: CreatePurchaseInput): Promise<string> {
    if (!input.itens.length) throw new Error("Informe ao menos um item");
    const subtotal = input.itens.reduce(
      (acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario) - Number(it.desconto ?? 0),
      0,
    );
    const total = subtotal - Number(input.desconto ?? 0) + Number(input.acrescimo ?? 0);
    const numero = await numberingService.next("purchase", "COM");

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert({
        numero,
        supplier_id: input.supplier_id,
        data_emissao: input.data_emissao ?? new Date().toISOString().slice(0, 10),
        data_prevista: input.data_prevista ?? null,
        condicoes_pagamento: input.condicoes_pagamento ?? null,
        observacoes: input.observacoes ?? null,
        subtotal,
        desconto: input.desconto ?? 0,
        acrescimo: input.acrescimo ?? 0,
        total,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    const id = (po as { id: string }).id;

    const rows = input.itens.map((it, i) => ({
      purchase_order_id: id,
      ordem: i + 1,
      product_id: it.product_id,
      descricao: it.descricao,
      quantidade: it.quantidade,
      unidade: it.unidade,
      preco_unitario: it.preco_unitario,
      desconto: it.desconto ?? 0,
      total: Number(it.quantidade) * Number(it.preco_unitario) - Number(it.desconto ?? 0),
    }));
    const { error: iErr } = await supabase.from("purchase_order_items").insert(rows as never);
    if (iErr) throw iErr;

    await workflowService.start(PURCHASE_ENTITY, id);
    return id;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("purchase_orders")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw error;
  },

  /** Executa recebimento — dá entrada de estoque (se habilitado) e gera CP. */
  async receive(id: string): Promise<number> {
    const { data, error } = await supabase.rpc("receive_purchase_order", {
      _purchase_id: id,
    });
    if (error) throw error;
    return (data as number | null) ?? 0;
  },

  /** Gera manualmente Contas a Pagar (idempotente). */
  async generateAP(id: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("generate_ap_from_purchase", {
      _purchase_id: id,
    });
    if (error) throw error;
    return (data as string | null) ?? null;
  },
};
