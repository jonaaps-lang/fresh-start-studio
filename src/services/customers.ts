import { supabase } from "./_client";
import type { Customer, CustomerInsert, CustomerUpdate } from "@/domain";

export type CustomerLite = Pick<Customer, "id" | "nome" | "ativo">;

export const customersService = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Customer[];
  },

  async listLite(): Promise<CustomerLite[]> {
    const { data, error } = await supabase
      .from("customers")
      .select("id,nome,ativo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return (data ?? []) as CustomerLite[];
  },

  async listForDashboard() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, nome, tipo, ativo, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Customer | null;
  },

  async create(payload: CustomerInsert): Promise<void> {
    const { error } = await supabase.from("customers").insert(payload);
    if (error) throw error;
  },

  async update(id: string, patch: CustomerUpdate): Promise<void> {
    const { error } = await supabase.from("customers").update(patch).eq("id", id);
    if (error) throw error;
  },

  async setAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase.from("customers").update({ ativo }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
  },
};
