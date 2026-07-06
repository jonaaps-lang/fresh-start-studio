import { supabase } from "./_client";
import type { Supplier, SupplierInsert, SupplierUpdate } from "@/domain";

export const suppliersService = {
  async list(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("razao_social", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Supplier[];
  },

  async listForDashboard() {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, razao_social, categoria, ativo, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: SupplierInsert): Promise<void> {
    const { error } = await supabase.from("suppliers").insert(payload);
    if (error) throw error;
  },

  async update(id: string, patch: SupplierUpdate): Promise<void> {
    const { error } = await supabase.from("suppliers").update(patch).eq("id", id);
    if (error) throw error;
  },

  async setAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase.from("suppliers").update({ ativo }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) throw error;
  },
};
