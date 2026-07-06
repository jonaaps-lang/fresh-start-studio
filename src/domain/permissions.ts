// -----------------------------------------------------------------------------
// Catálogo central de permissões do CloudGest ERP.
//
// Fonte única de verdade para nomes de permissão usados no frontend e no
// backend (mesmas strings gravadas na tabela public.role_permissions e
// verificadas pela função public.has_permission).
//
// Formato: "<modulo>.<acao>". Sempre em minúsculas, sem acento, singular.
// -----------------------------------------------------------------------------

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "cancel",
  "print",
  "export",
] as const;
export type PermissionAction = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  approve: "Aprovar",
  cancel: "Cancelar",
  print: "Imprimir",
  export: "Exportar",
};

export type PermissionModule =
  | "clientes"
  | "fornecedores"
  | "produtos"
  | "orcamentos"
  | "pedidos"
  | "producao"
  | "financeiro"
  | "despesas"
  | "compras"
  | "estoque"
  | "usuarios"
  | "configuracoes"
  | "aprovacoes";

export const MODULE_LABELS: Record<PermissionModule, string> = {
  clientes: "Clientes",
  fornecedores: "Fornecedores",
  produtos: "Produtos",
  orcamentos: "Orçamentos",
  pedidos: "Pedidos",
  producao: "Produção",
  financeiro: "Financeiro",
  despesas: "Despesas",
  compras: "Compras",
  estoque: "Estoque",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  aprovacoes: "Aprovações",
};

/** Cria uma string canônica de permissão. Use este helper em vez de concatenar manualmente. */
export function perm<M extends PermissionModule, A extends PermissionAction>(
  module: M,
  action: A,
): `${M}.${A}` {
  return `${module}.${action}` as const;
}

// -----------------------------------------------------------------------------
// Perfis do sistema
// -----------------------------------------------------------------------------
// Mantemos os papéis legados (admin, vendedor) por compatibilidade com dados
// já existentes. Os novos perfis padrão (dono, comercial, desenvolvedor)
// são os oficiais a partir da Fase 3. A camada de UI usa APP_ROLE_LABEL
// para mostrar o nome amigável.

export const APP_ROLES = [
  "desenvolvedor",
  "dono",
  "admin",
  "gerente",
  "comercial",
  "vendedor",
  "producao",
  "financeiro",
] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABEL: Record<AppRole, string> = {
  desenvolvedor: "Desenvolvedor",
  dono: "Dono",
  admin: "Administrador",
  gerente: "Gerente",
  comercial: "Comercial",
  vendedor: "Vendedor",
  producao: "Produção",
  financeiro: "Financeiro",
};

/**
 * Perfis oficiais oferecidos ao usuário final na criação/edição.
 * "admin" e "vendedor" continuam funcionando mas não aparecem no seletor —
 * ambientes existentes com esses papéis seguem operando normalmente porque
 * o seed espelha as permissões (admin ≡ dono, vendedor ≡ comercial).
 */
export const SELECTABLE_ROLES: AppRole[] = [
  "dono",
  "gerente",
  "comercial",
  "producao",
  "financeiro",
];

/** Papel especial: acesso total à plataforma, sem vínculo com empresa. */
export const PLATFORM_ROLES: AppRole[] = ["desenvolvedor"];

/**
 * Regras rígidas de negócio que NÃO podem ser desligadas pelo Motor de
 * Configuração — ficam explícitas aqui para o backend/UI verificar antes
 * de qualquer ação. As permissões da matriz cobrem o resto.
 */
export const HARD_RULES = {
  /** Comercial não pode cancelar pedido em produção. */
  comercialCancelPedido: (status: string, role: AppRole) =>
    role === "comercial" && (status === "em_producao" || status === "concluido"),
  /** Produção precisa de motivo obrigatório ao marcar atraso. */
  producaoAtrasoRequerMotivo: (delayed: boolean, motivo: string | null) =>
    delayed && (!motivo || motivo.trim().length < 3),
} as const;
