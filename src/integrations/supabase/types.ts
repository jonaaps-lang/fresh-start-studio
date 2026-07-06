export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          category: string
          created_at: string
          data: Json
          deleted_at: string | null
          deleted_by: string | null
          empresa_id: string
          id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          data?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          data?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings_history: {
        Row: {
          category: string
          changed_at: string
          changed_by: string | null
          data: Json
          empresa_id: string
          id: string
          version: number
        }
        Insert: {
          category: string
          changed_at?: string
          changed_by?: string | null
          data: Json
          empresa_id: string
          id?: string
          version: number
        }
        Update: {
          category?: string
          changed_at?: string
          changed_by?: string | null
          data?: Json
          empresa_id?: string
          id?: string
          version?: number
        }
        Relationships: []
      }
      approvals: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          empresa_id: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          reason: string | null
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          empresa_id: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          empresa_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          condicoes_pagamento_padrao: string | null
          cor_primaria: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logo_url: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes_padrao_orcamento: string | null
          prazo_entrega_padrao: string | null
          razao_social: string | null
          singleton: boolean
          site: string | null
          telefone: string | null
          texto_rodape_pdf: string | null
          uf: string | null
          updated_at: string
          updated_by: string | null
          validade_orcamento_dias: number
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicoes_pagamento_padrao?: string | null
          cor_primaria?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_padrao_orcamento?: string | null
          prazo_entrega_padrao?: string | null
          razao_social?: string | null
          singleton?: boolean
          site?: string | null
          telefone?: string | null
          texto_rodape_pdf?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          validade_orcamento_dias?: number
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicoes_pagamento_padrao?: string | null
          cor_primaria?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_padrao_orcamento?: string | null
          prazo_entrega_padrao?: string | null
          razao_social?: string | null
          singleton?: boolean
          site?: string | null
          telefone?: string | null
          texto_rodape_pdf?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          validade_orcamento_dias?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          is_default: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          is_default?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          is_default?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato_nome: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          rg_ie: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["customer_type"]
          uf: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_nome?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          rg_ie?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["customer_type"]
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_nome?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          rg_ie?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["customer_type"]
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          empresa_id: string
          next_val: number
          tipo: string
          updated_at: string
        }
        Insert: {
          empresa_id: string
          next_val?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          next_val?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          empresa_id: string
          id: string
          nome: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_installments: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          numero_parcela: number
          saldo: number
          title_id: string
          updated_at: string
          updated_by: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          numero_parcela: number
          saldo: number
          title_id: string
          updated_at?: string
          updated_by?: string | null
          valor: number
          vencimento: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          numero_parcela?: number
          saldo?: number
          title_id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_installments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_installments_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "finance_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          created_at: string
          created_by: string | null
          data_pagamento: string
          empresa_id: string
          estornado_em: string | null
          estornado_por: string | null
          forma_pagamento: string | null
          id: string
          installment_id: string
          observacao: string | null
          title_id: string
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          empresa_id: string
          estornado_em?: string | null
          estornado_por?: string | null
          forma_pagamento?: string | null
          id?: string
          installment_id: string
          observacao?: string | null
          title_id: string
          updated_at?: string
          updated_by?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          empresa_id?: string
          estornado_em?: string | null
          estornado_por?: string | null
          forma_pagamento?: string | null
          id?: string
          installment_id?: string
          observacao?: string | null
          title_id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "finance_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "finance_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_titles: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          data_emissao: string
          deleted_at: string | null
          deleted_by: string | null
          desconto: number
          descricao: string | null
          empresa_id: string
          id: string
          numero: string
          observacoes: string | null
          order_id: string | null
          saldo: number
          supplier_id: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
          valor_total: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data_emissao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          descricao?: string | null
          empresa_id: string
          id?: string
          numero: string
          observacoes?: string | null
          order_id?: string | null
          saldo?: number
          supplier_id?: string | null
          tipo: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data_emissao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          descricao?: string | null
          empresa_id?: string
          id?: string
          numero?: string
          observacoes?: string | null
          order_id?: string | null
          saldo?: number
          supplier_id?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_titles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_titles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_titles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_titles_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_titles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          desconto: number
          descricao: string
          empresa_id: string | null
          id: string
          ordem: number
          order_id: string
          preco_unitario: number
          quantidade: number
          total: number
          unidade: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          descricao: string
          empresa_id?: string | null
          id?: string
          ordem?: number
          order_id: string
          preco_unitario?: number
          quantidade?: number
          total?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          descricao?: string
          empresa_id?: string | null
          id?: string
          ordem?: number
          order_id?: string
          preco_unitario?: number
          quantidade?: number
          total?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          acrescimo: number
          assinatura_cargo: string | null
          assinatura_nome: string | null
          condicoes_pagamento: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          data_emissao: string
          data_entrega: string | null
          deleted_at: string | null
          deleted_by: string | null
          desconto: number
          empresa_id: string
          id: string
          numero: string
          observacoes: string | null
          prazo_entrega: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          updated_by: string | null
          vendedor_id: string | null
        }
        Insert: {
          acrescimo?: number
          assinatura_cargo?: string | null
          assinatura_nome?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          data_emissao?: string
          data_entrega?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          empresa_id?: string
          id?: string
          numero: string
          observacoes?: string | null
          prazo_entrega?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
          vendedor_id?: string | null
        }
        Update: {
          acrescimo?: number
          assinatura_cargo?: string | null
          assinatura_nome?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          data_emissao?: string
          data_entrega?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          empresa_id?: string
          id?: string
          numero?: string
          observacoes?: string | null
          prazo_entrega?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_attachments: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          mime: string | null
          nome: string
          production_order_id: string
          size: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          mime?: string | null
          nome: string
          production_order_id: string
          size?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          mime?: string | null
          nome?: string
          production_order_id?: string
          size?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_attachments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_attachments_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_items: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string
          empresa_id: string
          id: string
          ordem: number
          product_id: string | null
          production_order_id: string
          quantidade: number
          unidade: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          empresa_id: string
          id?: string
          ordem?: number
          product_id?: string | null
          production_order_id: string
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          ordem?: number
          product_id?: string | null
          production_order_id?: string
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "production_order_items_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          data_conclusao: string | null
          data_prevista: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao_servico: string | null
          empresa_id: string
          id: string
          metadata: Json
          numero: string
          observacoes: string | null
          order_id: string | null
          prazo_producao: string | null
          prioridade: string
          responsavel_id: string | null
          setor: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao_servico?: string | null
          empresa_id: string
          id?: string
          metadata?: Json
          numero: string
          observacoes?: string | null
          order_id?: string | null
          prazo_producao?: string | null
          prioridade?: string
          responsavel_id?: string | null
          setor?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao_servico?: string | null
          empresa_id?: string
          id?: string
          metadata?: Json
          numero?: string
          observacoes?: string | null
          order_id?: string | null
          prazo_producao?: string | null
          prioridade?: string
          responsavel_id?: string | null
          setor?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_time_entries: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          motivo: string | null
          observacao: string | null
          occurred_at: string
          operator_id: string | null
          production_order_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          occurred_at?: string
          operator_id?: string | null
          production_order_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          occurred_at?: string
          operator_id?: string | null
          production_order_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_time_entries_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_time_entries_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string | null
          created_at: string
          created_by: string | null
          custo: number
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          preco_base: number
          tipo: Database["public"]["Enums"]["product_type"]
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          custo?: number
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome: string
          preco_base?: number
          tipo?: Database["public"]["Enums"]["product_type"]
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          custo?: number
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          preco_base?: number
          tipo?: Database["public"]["Enums"]["product_type"]
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assinatura_url: string | null
          avatar_url: string | null
          cargo: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          matricula: string | null
          phone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          assinatura_url?: string | null
          avatar_url?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          matricula?: string | null
          phone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          assinatura_url?: string | null
          avatar_url?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          matricula?: string | null
          phone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          created_by: string | null
          desconto: number
          descricao: string
          empresa_id: string
          id: string
          ordem: number
          preco_unitario: number
          product_id: string | null
          purchase_order_id: string
          quantidade: number
          total: number
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          desconto?: number
          descricao: string
          empresa_id: string
          id?: string
          ordem?: number
          preco_unitario?: number
          product_id?: string | null
          purchase_order_id: string
          quantidade?: number
          total?: number
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          desconto?: number
          descricao?: string
          empresa_id?: string
          id?: string
          ordem?: number
          preco_unitario?: number
          product_id?: string | null
          purchase_order_id?: string
          quantidade?: number
          total?: number
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balances"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          acrescimo: number
          condicoes_pagamento: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_prevista: string | null
          data_recebimento: string | null
          deleted_at: string | null
          deleted_by: string | null
          desconto: number
          empresa_id: string
          finance_title_id: string | null
          id: string
          numero: string
          observacoes: string | null
          subtotal: number
          supplier_id: string | null
          total: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acrescimo?: number
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_prevista?: string | null
          data_recebimento?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          empresa_id: string
          finance_title_id?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          subtotal?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acrescimo?: number
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_prevista?: string | null
          data_recebimento?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          empresa_id?: string
          finance_title_id?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          subtotal?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_finance_title_id_fkey"
            columns: ["finance_title_id"]
            isOneToOne: false
            referencedRelation: "finance_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          desconto: number
          descricao: string
          empresa_id: string | null
          id: string
          ordem: number
          preco_unitario: number
          quantidade: number
          quote_id: string
          total: number
          unidade: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          descricao: string
          empresa_id?: string | null
          id?: string
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          quote_id: string
          total?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          descricao?: string
          empresa_id?: string | null
          id?: string
          ordem?: number
          preco_unitario?: number
          quantidade?: number
          quote_id?: string
          total?: number
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          acrescimo: number
          assinatura_cargo: string | null
          assinatura_nome: string | null
          condicoes_pagamento: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          data_emissao: string
          data_validade: string | null
          deleted_at: string | null
          deleted_by: string | null
          desconto: number
          empresa_id: string
          id: string
          numero: string
          observacoes: string | null
          prazo_entrega: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
          updated_by: string | null
          vendedor_id: string | null
        }
        Insert: {
          acrescimo?: number
          assinatura_cargo?: string | null
          assinatura_nome?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          data_emissao?: string
          data_validade?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          empresa_id?: string
          id?: string
          numero: string
          observacoes?: string | null
          prazo_entrega?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
          vendedor_id?: string | null
        }
        Update: {
          acrescimo?: number
          assinatura_cargo?: string | null
          assinatura_nome?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          data_emissao?: string
          data_validade?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          empresa_id?: string
          id?: string
          numero?: string
          observacoes?: string | null
          prazo_entrega?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          custo_unitario: number | null
          data_movimento: string
          empresa_id: string
          id: string
          observacao: string | null
          origem: string | null
          origem_id: string | null
          product_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["stock_movement_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number | null
          data_movimento?: string
          empresa_id: string
          id?: string
          observacao?: string | null
          origem?: string | null
          origem_id?: string | null
          product_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["stock_movement_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number | null
          data_movimento?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          origem?: string | null
          origem_id?: string | null
          product_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["stock_movement_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balances"
            referencedColumns: ["product_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          ativo: boolean
          bairro: string | null
          categoria: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          condicoes_pagamento: string | null
          contato_nome: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string
          site: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicoes_pagamento?: string | null
          contato_nome?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social: string
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          condicoes_pagamento?: string | null
          contato_nome?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_history: {
        Row: {
          actor_id: string | null
          approval_id: string | null
          created_at: string
          empresa_id: string
          from_state_id: string | null
          id: string
          instance_id: string
          motivo: string | null
          observacao: string | null
          payload: Json
          to_state_id: string
          transition_id: string | null
        }
        Insert: {
          actor_id?: string | null
          approval_id?: string | null
          created_at?: string
          empresa_id: string
          from_state_id?: string | null
          id?: string
          instance_id: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json
          to_state_id: string
          transition_id?: string | null
        }
        Update: {
          actor_id?: string | null
          approval_id?: string | null
          created_at?: string
          empresa_id?: string
          from_state_id?: string | null
          id?: string
          instance_id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json
          to_state_id?: string
          transition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_history_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_history_from_state_id_fkey"
            columns: ["from_state_id"]
            isOneToOne: false
            referencedRelation: "workflow_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_history_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_history_to_state_id_fkey"
            columns: ["to_state_id"]
            isOneToOne: false
            referencedRelation: "workflow_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_history_transition_id_fkey"
            columns: ["transition_id"]
            isOneToOne: false
            referencedRelation: "workflow_transitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          created_at: string
          created_by: string | null
          current_state_id: string
          empresa_id: string
          entidade: string
          entidade_id: string
          id: string
          updated_at: string
          updated_by: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_state_id: string
          empresa_id: string
          entidade: string
          entidade_id: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_state_id?: string
          empresa_id?: string
          entidade?: string
          entidade_id?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_current_state_id_fkey"
            columns: ["current_state_id"]
            isOneToOne: false
            referencedRelation: "workflow_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_states: {
        Row: {
          codigo: string
          cor: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string
          icone: string | null
          id: string
          is_final: boolean
          is_initial: boolean
          nome: string
          ordem: number
          updated_at: string
          updated_by: string | null
          workflow_id: string
        }
        Insert: {
          codigo: string
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id: string
          icone?: string | null
          id?: string
          is_final?: boolean
          is_initial?: boolean
          nome: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
          workflow_id: string
        }
        Update: {
          codigo?: string
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string
          icone?: string | null
          id?: string
          is_final?: boolean
          is_initial?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_states_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_transitions: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          from_state_id: string
          id: string
          nome: string
          ordem: number
          permission_required: string | null
          requires_approval: boolean
          requires_motivo: boolean
          requires_observacao: boolean
          to_state_id: string
          updated_at: string
          updated_by: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          from_state_id: string
          id?: string
          nome: string
          ordem?: number
          permission_required?: string | null
          requires_approval?: boolean
          requires_motivo?: boolean
          requires_observacao?: boolean
          to_state_id: string
          updated_at?: string
          updated_by?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          from_state_id?: string
          id?: string
          nome?: string
          ordem?: number
          permission_required?: string | null
          requires_approval?: boolean
          requires_motivo?: boolean
          requires_observacao?: boolean
          to_state_id?: string
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_transitions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_from_state_id_fkey"
            columns: ["from_state_id"]
            isOneToOne: false
            referencedRelation: "workflow_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_to_state_id_fkey"
            columns: ["to_state_id"]
            isOneToOne: false
            referencedRelation: "workflow_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          empresa_id: string
          entidade: string
          id: string
          is_default: boolean
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          empresa_id: string
          entidade: string
          id?: string
          is_default?: boolean
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          empresa_id?: string
          entidade?: string
          id?: string
          is_default?: boolean
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stock_balances: {
        Row: {
          codigo: string | null
          empresa_id: string | null
          nome: string | null
          product_id: string | null
          saldo: number | null
          unidade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      convert_quote_to_order: { Args: { _quote_id: string }; Returns: string }
      current_empresa_id: { Args: never; Returns: string }
      finance_apply_payment: {
        Args: {
          _data?: string
          _forma?: string
          _installment_id: string
          _obs?: string
          _valor: number
        }
        Returns: string
      }
      generate_ap_from_purchase: {
        Args: { _purchase_id: string }
        Returns: string
      }
      generate_ar_from_order: { Args: { _order_id: string }; Returns: string }
      has_permission: {
        Args: { _empresa?: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_empresa: { Args: { _empresa: string }; Returns: boolean }
      next_document_number: {
        Args: { _empresa?: string; _prefixo: string; _tipo: string }
        Returns: string
      }
      next_finance_number: { Args: { _tipo: string }; Returns: string }
      next_order_number: { Args: never; Returns: string }
      next_production_number: { Args: never; Returns: string }
      next_quote_number: { Args: never; Returns: string }
      receive_purchase_order: {
        Args: { _purchase_id: string }
        Returns: number
      }
      seed_default_finance_workflows: {
        Args: { _empresa: string }
        Returns: undefined
      }
      seed_default_production_workflow: {
        Args: { _empresa: string }
        Returns: string
      }
      seed_default_purchase_workflow: {
        Args: { _empresa: string }
        Returns: string
      }
      seed_default_role_permissions: {
        Args: { _empresa: string }
        Returns: undefined
      }
      seed_extra_purchase_permissions: {
        Args: { _empresa: string }
        Returns: undefined
      }
      soft_delete: { Args: { _id: string; _table: string }; Returns: undefined }
      stock_adjust: {
        Args: {
          _custo_unitario?: number
          _observacao?: string
          _origem?: string
          _origem_id?: string
          _product_id: string
          _quantidade: number
          _tipo: Database["public"]["Enums"]["stock_movement_type"]
        }
        Returns: string
      }
      touch_last_access: { Args: never; Returns: undefined }
      user_empresa_ids: { Args: never; Returns: string[] }
      workflow_available_transitions: {
        Args: { _instance_id: string }
        Returns: {
          allowed: boolean
          id: string
          nome: string
          permission_required: string
          requires_approval: boolean
          requires_motivo: boolean
          requires_observacao: boolean
          to_state_codigo: string
          to_state_id: string
          to_state_nome: string
        }[]
      }
      workflow_start: {
        Args: { _entidade: string; _entidade_id: string; _workflow_id?: string }
        Returns: string
      }
      workflow_transition: {
        Args: {
          _instance_id: string
          _motivo?: string
          _observacao?: string
          _transition_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "vendedor"
        | "producao"
        | "financeiro"
        | "desenvolvedor"
        | "dono"
        | "comercial"
      customer_type: "pf" | "pj"
      order_status:
        | "aberto"
        | "em_producao"
        | "concluido"
        | "entregue"
        | "cancelado"
      product_type: "produto" | "servico"
      quote_status:
        | "rascunho"
        | "pendente"
        | "aprovado"
        | "rejeitado"
        | "convertido"
        | "cancelado"
        | "nao_enviado"
        | "enviado"
      stock_movement_type: "entrada" | "saida" | "ajuste" | "inventario"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gerente",
        "vendedor",
        "producao",
        "financeiro",
        "desenvolvedor",
        "dono",
        "comercial",
      ],
      customer_type: ["pf", "pj"],
      order_status: [
        "aberto",
        "em_producao",
        "concluido",
        "entregue",
        "cancelado",
      ],
      product_type: ["produto", "servico"],
      quote_status: [
        "rascunho",
        "pendente",
        "aprovado",
        "rejeitado",
        "convertido",
        "cancelado",
        "nao_enviado",
        "enviado",
      ],
      stock_movement_type: ["entrada", "saida", "ajuste", "inventario"],
    },
  },
} as const
