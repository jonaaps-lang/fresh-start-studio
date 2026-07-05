import { supabase } from "./_client";
import type { Product, ProductInsert, ProductUpdate } from "@/domain";

export type ProductLite = Pick<Product, "id" | "nome" | "codigo" | "unidade" | "preco_base">;

export const productsService = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase.from("products").select("*").order("nome");
    if (error) throw error;
    return (data ?? []) as Product[];
  },

  async listLite(): Promise<ProductLite[]> {
    const { data, error } = await supabase
      .from("products")
      .select("id,nome,codigo,unidade,preco_base")
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return (data ?? []) as ProductLite[];
  },

  async create(payload: ProductInsert): Promise<void> {
    const { error } = await supabase.from("products").insert(payload);
    if (error) throw error;
  },

  async update(id: string, patch: ProductUpdate): Promise<void> {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) throw error;
  },

  async setAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase.from("products").update({ ativo }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },
};
