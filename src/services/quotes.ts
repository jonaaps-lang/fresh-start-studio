import { supabase } from "./_client";
import type {
  Quote,
  QuoteInsert,
  QuoteUpdate,
  QuoteItem,
  QuoteItemInsert,
  QuoteStatus,
} from "@/domain";

// Row shape returned by list() with the customer join used by the UI.
export type QuoteWithCustomer = Quote & {
  customers: { nome: string; whatsapp: string | null; telefone: string | null } | null;
};

export const quotesService = {
  async list(): Promise<QuoteWithCustomer[]> {
    const { data, error } = await supabase
      .from("quotes")
      .select("*, customers(nome, whatsapp, telefone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as QuoteWithCustomer[];
  },

  async getById(id: string): Promise<Quote> {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Quote;
  },

  async listItems(quoteId: string): Promise<QuoteItem[]> {
    const { data, error } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("ordem");
    if (error) throw error;
    return (data ?? []) as QuoteItem[];
  },

  async nextNumber(): Promise<string> {
    const { data, error } = await supabase.rpc("next_quote_number");
    if (error) throw error;
    return data as string;
  },

  async create(payload: QuoteInsert): Promise<string> {
    const { data, error } = await supabase
      .from("quotes")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return data!.id as string;
  },

  async update(id: string, patch: QuoteUpdate): Promise<void> {
    const { error } = await supabase.from("quotes").update(patch).eq("id", id);
    if (error) throw error;
  },

  async setStatus(id: string, status: QuoteStatus): Promise<void> {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) throw error;
  },

  async replaceItems(quoteId: string, items: QuoteItemInsert[]): Promise<void> {
    const del = await supabase.from("quote_items").delete().eq("quote_id", quoteId);
    if (del.error) throw del.error;
    if (!items.length) return;
    const { error } = await supabase.from("quote_items").insert(items);
    if (error) throw error;
  },

  async insertItems(items: QuoteItemInsert[]): Promise<void> {
    if (!items.length) return;
    const { error } = await supabase.from("quote_items").insert(items);
    if (error) throw error;
  },

  async convertToOrder(quoteId: string): Promise<string> {
    const { data, error } = await supabase.rpc("convert_quote_to_order", {
      _quote_id: quoteId,
    });
    if (error) throw error;
    return data as string;
  },
};
