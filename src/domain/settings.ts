// =============================================================================
// Motor de Configuração — Domínio
// -----------------------------------------------------------------------------
// Define TODAS as categorias de configuração do CloudGest, suas formas (types),
// valores padrão e schemas de validação (Zod). Toda a operação do ERP consulta
// esse arquivo — nunca strings mágicas espalhadas pelas rotas.
//
// Filosofia:
//   - Categorias novas se adicionam aqui em UM lugar (shape + default + schema).
//   - Módulos futuros (financeiro, produção, CRM, etc.) apenas leem via
//     `settingsService.get("<categoria>")` — sem tocar em SQL.
//   - Campos que ainda não são consumidos por nenhum módulo são armazenados
//     normalmente e ficam prontos para uso futuro.
// =============================================================================

import { z } from "zod";

// -----------------------------------------------------------------------------
// Categorias
// -----------------------------------------------------------------------------
export const SETTINGS_CATEGORIES = [
  "empresa",
  "operacao",
  "comercial",
  "producao",
  "financeiro",
  "documentos",
  "interface",
  "usuarios",
  "sistema",
] as const;
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

// -----------------------------------------------------------------------------
// EMPRESA — dados institucionais (persistidos em company_settings, não em app_settings)
// Mantido aqui para o motor conhecer o shape de forma unificada.
// -----------------------------------------------------------------------------
export interface EmpresaSettings {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  logo_url: string;
  cor_primaria: string;
  idioma: "pt-BR" | "en-US" | "es-ES";
  fuso_horario: string;
}
export const DEFAULT_EMPRESA: EmpresaSettings = {
  nome_fantasia: "", razao_social: "", cnpj: "",
  inscricao_estadual: "", inscricao_municipal: "",
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  telefone: "", whatsapp: "", email: "", site: "",
  logo_url: "", cor_primaria: "#0ea5e9",
  idioma: "pt-BR", fuso_horario: "America/Sao_Paulo",
};
export const empresaSchema = z.object({
  nome_fantasia: z.string().trim().max(160),
  razao_social: z.string().trim().max(160),
  cnpj: z.string().trim().max(20),
  inscricao_estadual: z.string().trim().max(30),
  inscricao_municipal: z.string().trim().max(30),
  cep: z.string().trim().max(10),
  endereco: z.string().trim().max(200),
  numero: z.string().trim().max(20),
  complemento: z.string().trim().max(120),
  bairro: z.string().trim().max(120),
  cidade: z.string().trim().max(120),
  uf: z.string().trim().max(2),
  telefone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
  email: z.string().trim().max(160),
  site: z.string().trim().max(200),
  logo_url: z.string().trim().max(500),
  cor_primaria: z.string().trim().max(20),
  idioma: z.enum(["pt-BR", "en-US", "es-ES"]),
  fuso_horario: z.string().trim().max(60),
});

// -----------------------------------------------------------------------------
// OPERAÇÃO — fluxo de trabalho comercial
// -----------------------------------------------------------------------------
export interface OperacaoSettings {
  fluxo_documentos: "orcamento" | "pedido" | "ambos";
  permitir_pedido_direto: boolean;
  exigir_aprovacao_orcamento: boolean;
  exigir_aprovacao_pedido: boolean;
  fluxo_operacional: "simplificado" | "completo";
}
export const DEFAULT_OPERACAO: OperacaoSettings = {
  fluxo_documentos: "ambos",
  permitir_pedido_direto: true,
  exigir_aprovacao_orcamento: false,
  exigir_aprovacao_pedido: false,
  fluxo_operacional: "simplificado",
};
export const operacaoSchema = z.object({
  fluxo_documentos: z.enum(["orcamento", "pedido", "ambos"]),
  permitir_pedido_direto: z.boolean(),
  exigir_aprovacao_orcamento: z.boolean(),
  exigir_aprovacao_pedido: z.boolean(),
  fluxo_operacional: z.enum(["simplificado", "completo"]),
});

// -----------------------------------------------------------------------------
// COMERCIAL — regras de venda (prontas para o Comercial evoluir)
// -----------------------------------------------------------------------------
export interface ComercialSettings {
  desconto_maximo_pct: number;
  exigir_vendedor: boolean;
  meta_mensal_valor: number;
  usar_comissao: boolean;
  comissao_padrao_pct: number;
}
export const DEFAULT_COMERCIAL: ComercialSettings = {
  desconto_maximo_pct: 10,
  exigir_vendedor: false,
  meta_mensal_valor: 0,
  usar_comissao: false,
  comissao_padrao_pct: 0,
};
export const comercialSchema = z.object({
  desconto_maximo_pct: z.number().min(0).max(100),
  exigir_vendedor: z.boolean(),
  meta_mensal_valor: z.number().min(0),
  usar_comissao: z.boolean(),
  comissao_padrao_pct: z.number().min(0).max(100),
});

// -----------------------------------------------------------------------------
// PRODUÇÃO
// -----------------------------------------------------------------------------
export interface ProducaoSettings {
  utiliza_producao: boolean;
  producao_por_setores: boolean;
  controle_atraso: boolean;
  motivo_obrigatorio_atraso: boolean;
}
export const DEFAULT_PRODUCAO: ProducaoSettings = {
  utiliza_producao: false,
  producao_por_setores: false,
  controle_atraso: false,
  motivo_obrigatorio_atraso: false,
};
export const producaoSchema = z.object({
  utiliza_producao: z.boolean(),
  producao_por_setores: z.boolean(),
  controle_atraso: z.boolean(),
  motivo_obrigatorio_atraso: z.boolean(),
});

// -----------------------------------------------------------------------------
// FINANCEIRO
// -----------------------------------------------------------------------------
export interface FinanceiroSettings {
  utiliza_financeiro: boolean;
  contas_a_pagar: boolean;
  contas_a_receber: boolean;
  parcelamento_padrao: number;
  vencimento_dias_padrao: number;
  juros_padrao_pct: number;
  multa_padrao_pct: number;
  /** Gerar contas a receber automaticamente ao aprovar um pedido. */
  auto_gerar_ar_pedido: boolean;
  /** Desconto máximo (%) sem exigir aprovação. */
  desconto_limite_pct: number;
}
export const DEFAULT_FINANCEIRO: FinanceiroSettings = {
  utiliza_financeiro: false,
  contas_a_pagar: true,
  contas_a_receber: true,
  parcelamento_padrao: 1,
  vencimento_dias_padrao: 30,
  juros_padrao_pct: 1,
  multa_padrao_pct: 2,
  auto_gerar_ar_pedido: false,
  desconto_limite_pct: 10,
};
export const financeiroSchema = z.object({
  utiliza_financeiro: z.boolean(),
  contas_a_pagar: z.boolean(),
  contas_a_receber: z.boolean(),
  parcelamento_padrao: z.number().int().min(1).max(48),
  vencimento_dias_padrao: z.number().int().min(0).max(365),
  juros_padrao_pct: z.number().min(0).max(100),
  multa_padrao_pct: z.number().min(0).max(100),
  auto_gerar_ar_pedido: z.boolean(),
  desconto_limite_pct: z.number().min(0).max(100),
});

// -----------------------------------------------------------------------------
// DOCUMENTOS — numeração, PDF, defaults de orçamento
// -----------------------------------------------------------------------------
export interface DocumentosSettings {
  prefixo_orcamento: string;
  prefixo_pedido: string;
  validade_orcamento_dias: number;
  prazos_validade_disponiveis: number[];
  assinatura_automatica: boolean;
  assinatura_nome: string;
  assinatura_cargo: string;
  exibir_logo_pdf: boolean;
  exibir_rodape_pdf: boolean;
  texto_rodape_pdf: string;
  exibir_observacoes_padrao: boolean;
  observacoes_padrao_orcamento: string;
  condicoes_pagamento_padrao: string;
  prazo_entrega_padrao: string;
}
export const DEFAULT_DOCUMENTOS: DocumentosSettings = {
  prefixo_orcamento: "ORC",
  prefixo_pedido: "PED",
  validade_orcamento_dias: 30,
  prazos_validade_disponiveis: [15, 30, 60, 90],
  assinatura_automatica: false,
  assinatura_nome: "",
  assinatura_cargo: "",
  exibir_logo_pdf: true,
  exibir_rodape_pdf: true,
  texto_rodape_pdf: "",
  exibir_observacoes_padrao: false,
  observacoes_padrao_orcamento: "",
  condicoes_pagamento_padrao: "",
  prazo_entrega_padrao: "",
};
export const documentosSchema = z.object({
  prefixo_orcamento: z.string().trim().min(1).max(10),
  prefixo_pedido: z.string().trim().min(1).max(10),
  validade_orcamento_dias: z.number().int().min(1).max(365),
  prazos_validade_disponiveis: z.array(z.number().int().min(1).max(365)).min(1).max(20),
  assinatura_automatica: z.boolean(),
  assinatura_nome: z.string().trim().max(120),
  assinatura_cargo: z.string().trim().max(120),
  exibir_logo_pdf: z.boolean(),
  exibir_rodape_pdf: z.boolean(),
  texto_rodape_pdf: z.string().max(500),
  exibir_observacoes_padrao: z.boolean(),
  observacoes_padrao_orcamento: z.string().max(2000),
  condicoes_pagamento_padrao: z.string().max(300),
  prazo_entrega_padrao: z.string().max(120),
});

// -----------------------------------------------------------------------------
// INTERFACE
// -----------------------------------------------------------------------------
export interface InterfaceSettings {
  tema: "claro" | "escuro" | "automatico";
  menu_padrao: "expandido" | "recolhido";
  densidade: "confortavel" | "compacta";
}
export const DEFAULT_INTERFACE: InterfaceSettings = {
  tema: "automatico",
  menu_padrao: "expandido",
  densidade: "confortavel",
};
export const interfaceSchema = z.object({
  tema: z.enum(["claro", "escuro", "automatico"]),
  menu_padrao: z.enum(["expandido", "recolhido"]),
  densidade: z.enum(["confortavel", "compacta"]),
});

// -----------------------------------------------------------------------------
// USUÁRIOS
// -----------------------------------------------------------------------------
export interface UsuariosSettings {
  cadastro_livre: boolean;
  convite_por_email: boolean;
  exigir_troca_senha_primeiro_login: boolean;
  mfa_obrigatorio: boolean;
}
export const DEFAULT_USUARIOS: UsuariosSettings = {
  cadastro_livre: false,
  convite_por_email: true,
  exigir_troca_senha_primeiro_login: false,
  mfa_obrigatorio: false,
};
export const usuariosSchema = z.object({
  cadastro_livre: z.boolean(),
  convite_por_email: z.boolean(),
  exigir_troca_senha_primeiro_login: z.boolean(),
  mfa_obrigatorio: z.boolean(),
});

// -----------------------------------------------------------------------------
// SISTEMA — meta/observabilidade (majoritariamente read-only ou futuro)
// -----------------------------------------------------------------------------
export interface SistemaSettings {
  ambiente: "producao" | "homologacao" | "desenvolvimento";
  atualizacoes_automaticas: boolean;
  recursos_experimentais: boolean;
  reter_logs_dias: number;
}
export const DEFAULT_SISTEMA: SistemaSettings = {
  ambiente: "producao",
  atualizacoes_automaticas: true,
  recursos_experimentais: false,
  reter_logs_dias: 90,
};
export const sistemaSchema = z.object({
  ambiente: z.enum(["producao", "homologacao", "desenvolvimento"]),
  atualizacoes_automaticas: z.boolean(),
  recursos_experimentais: z.boolean(),
  reter_logs_dias: z.number().int().min(1).max(3650),
});

// -----------------------------------------------------------------------------
// Registro central por categoria
// -----------------------------------------------------------------------------
export type SettingsShape = {
  empresa: EmpresaSettings;
  operacao: OperacaoSettings;
  comercial: ComercialSettings;
  producao: ProducaoSettings;
  financeiro: FinanceiroSettings;
  documentos: DocumentosSettings;
  interface: InterfaceSettings;
  usuarios: UsuariosSettings;
  sistema: SistemaSettings;
};

export const CATEGORY_DEFAULTS: { [K in SettingsCategory]: SettingsShape[K] } = {
  empresa: DEFAULT_EMPRESA,
  operacao: DEFAULT_OPERACAO,
  comercial: DEFAULT_COMERCIAL,
  producao: DEFAULT_PRODUCAO,
  financeiro: DEFAULT_FINANCEIRO,
  documentos: DEFAULT_DOCUMENTOS,
  interface: DEFAULT_INTERFACE,
  usuarios: DEFAULT_USUARIOS,
  sistema: DEFAULT_SISTEMA,
};

export const CATEGORY_SCHEMAS: { [K in SettingsCategory]: z.ZodType<SettingsShape[K]> } = {
  empresa: empresaSchema as unknown as z.ZodType<EmpresaSettings>,
  operacao: operacaoSchema as unknown as z.ZodType<OperacaoSettings>,
  comercial: comercialSchema as unknown as z.ZodType<ComercialSettings>,
  producao: producaoSchema as unknown as z.ZodType<ProducaoSettings>,
  financeiro: financeiroSchema as unknown as z.ZodType<FinanceiroSettings>,
  documentos: documentosSchema as unknown as z.ZodType<DocumentosSettings>,
  interface: interfaceSchema as unknown as z.ZodType<InterfaceSettings>,
  usuarios: usuariosSchema as unknown as z.ZodType<UsuariosSettings>,
  sistema: sistemaSchema as unknown as z.ZodType<SistemaSettings>,
};

// Categorias que persistem em app_settings (empresa mora em company_settings por compat).
export const APP_SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  "operacao", "comercial", "producao", "financeiro",
  "documentos", "interface", "usuarios", "sistema",
] as const;
