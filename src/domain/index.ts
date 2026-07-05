// Domain types layer.
// Consolidates row/insert/update types from the generated Supabase schema
// so components/routes never import table typings directly from the
// integration client. Add domain-only aliases (unions, enums) here.

import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];
type Row<T extends keyof PublicTables> = PublicTables[T]["Row"];
type Insert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
type Update<T extends keyof PublicTables> = PublicTables[T]["Update"];

export type Customer = Row<"customers">;
export type CustomerInsert = Insert<"customers">;
export type CustomerUpdate = Update<"customers">;

export type Supplier = Row<"suppliers">;
export type SupplierInsert = Insert<"suppliers">;
export type SupplierUpdate = Update<"suppliers">;

export type Product = Row<"products">;
export type ProductInsert = Insert<"products">;
export type ProductUpdate = Update<"products">;

export type Quote = Row<"quotes">;
export type QuoteInsert = Insert<"quotes">;
export type QuoteUpdate = Update<"quotes">;
export type QuoteItem = Row<"quote_items">;
export type QuoteItemInsert = Insert<"quote_items">;

export type Order = Row<"orders">;
export type OrderUpdate = Update<"orders">;
export type OrderItem = Row<"order_items">;

export type CompanySettings = Row<"company_settings">;
export type CompanySettingsUpdate = Update<"company_settings">;

// Enums used across the domain — keep here to avoid magic strings in routes.
export type QuoteStatus =
  | "rascunho"
  | "nao_enviado"
  | "enviado"
  | "pendente"
  | "aprovado"
  | "rejeitado"
  | "convertido"
  | "cancelado";

export type OrderStatus =
  | "aberto"
  | "em_producao"
  | "concluido"
  | "entregue"
  | "cancelado";

export type ProductType = "produto" | "servico";
