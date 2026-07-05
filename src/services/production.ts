import { supabase } from "./_client";
import { workflowService } from "./workflow";
import { storageService } from "./storage";
import type {
  ProductionOrder,
  ProductionOrderAttachment,
  ProductionOrderItem,
  ProductionPriority,
  ProductionTimeEntry,
  ProductionTimeType,
} from "@/domain/production";
import { PRODUCTION_ENTITY } from "@/domain/production";

// -----------------------------------------------------------------------------
// Serviço do Módulo de Produção.
// - Estados vêm do Motor de Workflow (nunca gravamos "status" na tabela).
// - Numeração vem do motor de numeração (next_production_number).
// - Permissões vêm de public.has_permission via RLS/policies.
// - Anexos usam storageService (bucket privado company-assets).
// -----------------------------------------------------------------------------

export type ProductionOrderRow = ProductionOrder & {
  customers: { nome: string } | null;
  orders: { numero: string } | null;
};

export type CreateProductionOrderInput = {
  order_id?: string | null;
  customer_id?: string | null;
  descricao_servico?: string | null;
  prioridade?: ProductionPriority;
  responsavel_id?: string | null;
  setor?: string | null;
  prazo_producao?: string | null;
  data_prevista?: string | null;
  observacoes?: string | null;
  items?: Array<Omit<ProductionOrderItem, "id" | "production_order_id" | "ordem"> & { ordem?: number }>;
};

export const productionService = {
  async list(): Promise<ProductionOrderRow[]> {
    const { data, error } = await supabase
      .from("production_orders")
      .select("*, customers(nome), orders(numero)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ProductionOrderRow[];
  },

  async getById(id: string): Promise<ProductionOrderRow> {
    const { data, error } = await supabase
      .from("production_orders")
      .select("*, customers(nome), orders(numero)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as ProductionOrderRow;
  },

  async nextNumber(): Promise<string> {
    const { data, error } = await supabase.rpc("next_production_number");
    if (error) throw error;
    return data as string;
  },

  async create(input: CreateProductionOrderInput): Promise<string> {
    const numero = await this.nextNumber();
    const { data, error } = await supabase
      .from("production_orders")
      .insert({
        numero,
        order_id: input.order_id ?? null,
        customer_id: input.customer_id ?? null,
        descricao_servico: input.descricao_servico ?? null,
        prioridade: input.prioridade ?? "media",
        responsavel_id: input.responsavel_id ?? null,
        setor: input.setor ?? null,
        prazo_producao: input.prazo_producao ?? null,
        data_prevista: input.data_prevista ?? null,
        observacoes: input.observacoes ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    const id = (data as { id: string }).id;

    if (input.items?.length) {
      const rows = input.items.map((it, i) => ({
        production_order_id: id,
        ordem: it.ordem ?? i + 1,
        product_id: it.product_id ?? null,
        descricao: it.descricao,
        quantidade: it.quantidade ?? 1,
        unidade: it.unidade ?? null,
      }));
      const ins = await supabase.from("production_order_items").insert(rows as never);
      if (ins.error) throw ins.error;
    }

    // Cria a instância no Motor de Workflow (estado inicial: fila).
    await workflowService.start(PRODUCTION_ENTITY, id);
    return id;
  },

  async update(id: string, patch: Partial<ProductionOrder>): Promise<void> {
    const { error } = await supabase
      .from("production_orders")
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.rpc("soft_delete", {
      _table: "production_orders" as never,
      _id: id,
    } as never);
    if (error) throw error;
  },

  // -------- itens ------------------------------------------------------------
  async listItems(opId: string): Promise<ProductionOrderItem[]> {
    const { data, error } = await supabase
      .from("production_order_items")
      .select("*")
      .eq("production_order_id", opId)
      .order("ordem");
    if (error) throw error;
    return (data ?? []) as ProductionOrderItem[];
  },

  // -------- anexos -----------------------------------------------------------
  async listAttachments(opId: string): Promise<ProductionOrderAttachment[]> {
    const { data, error } = await supabase
      .from("production_order_attachments")
      .select("*")
      .eq("production_order_id", opId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProductionOrderAttachment[];
  },

  async addAttachment(opId: string, file: File): Promise<void> {
    const path = `production/${opId}/${Date.now()}-${file.name}`;
    await storageService.uploadCompanyAssetPath(path, file);
    const { error } = await supabase.from("production_order_attachments").insert({
      production_order_id: opId,
      storage_path: path,
      nome: file.name,
      mime: file.type || null,
      size: file.size,
    } as never);
    if (error) throw error;
  },

  attachmentUrl: (path: string) => storageService.createSignedUrl(path, 3600),

  async removeAttachment(id: string): Promise<void> {
    const { error } = await supabase.from("production_order_attachments").delete().eq("id", id);
    if (error) throw error;
  },

  // -------- apontamentos -----------------------------------------------------
  async listTimeEntries(opId: string): Promise<ProductionTimeEntry[]> {
    const { data, error } = await supabase
      .from("production_time_entries")
      .select("*")
      .eq("production_order_id", opId)
      .order("occurred_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProductionTimeEntry[];
  },

  async addTimeEntry(
    opId: string,
    tipo: ProductionTimeType,
    opts?: { motivo?: string | null; observacao?: string | null },
  ): Promise<void> {
    const { error } = await supabase.from("production_time_entries").insert({
      production_order_id: opId,
      tipo,
      motivo: opts?.motivo ?? null,
      observacao: opts?.observacao ?? null,
    } as never);
    if (error) throw error;
  },
};
