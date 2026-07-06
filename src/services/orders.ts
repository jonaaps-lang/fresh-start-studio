import { supabase } from "./_client";
import type { Order, OrderItem, OrderStatus } from "@/domain";

export type OrderWithRefs = Order & {
  customers: { nome: string } | null;
  quotes: { numero: string } | null;
};

export const ordersService = {
  async list(): Promise<OrderWithRefs[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*, customers(nome), quotes(numero)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as OrderWithRefs[];
  },

  async getByIdWithQuote(id: string): Promise<Order & { quotes: { numero: string } | null }> {
    const { data, error } = await supabase
      .from("orders")
      .select("*, quotes(numero)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Order & { quotes: { numero: string } | null };
  },

  async listItems(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("ordem");
    if (error) throw error;
    return (data ?? []) as OrderItem[];
  },

  async setStatus(id: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) throw error;
  },

  /**
   * Gera automaticamente Contas a Receber a partir do pedido, respeitando
   * a configuração `financeiro.auto_gerar_ar_pedido` da empresa.
   * Retorna o id do título criado (ou já existente) ou null se a config
   * estiver desligada.
   */
  async generateAR(orderId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("generate_ar_from_order", {
      _order_id: orderId,
    });
    if (error) throw error;
    return (data as string | null) ?? null;
  },
};
