import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2, Workflow, ShoppingCart, Factory, Wallet, FileText,
  Palette, UserCog, Cog, Loader2, Upload, Trash2, Save,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SettingsSection, type SettingsField } from "@/components/settings-section";
import { settingsService, storageService } from "@/services";
import { useAuth, useUserRoles, type AppRole } from "@/hooks/use-auth";
import {
  SETTINGS_CATEGORIES,
  CATEGORY_SCHEMAS,
  type SettingsCategory,
  type EmpresaSettings,
  type OperacaoSettings,
  type ComercialSettings,
  type ProducaoSettings,
  type FinanceiroSettings,
  type DocumentosSettings,
  type InterfaceSettings,
  type UsuariosSettings,
  type SistemaSettings,
} from "@/domain/settings";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

// -----------------------------------------------------------------------------
// Metadados das categorias — controlam navegação e permissão de edição.
// -----------------------------------------------------------------------------
type CategoryMeta = {
  key: SettingsCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  editRoles: AppRole[];
};

const CATEGORIES: CategoryMeta[] = [
  { key: "empresa",    label: "Empresa",     description: "Dados institucionais, marca e localização.", icon: Building2, editRoles: ["admin"] },
  { key: "operacao",   label: "Operação",    description: "Fluxo de trabalho comercial.",                icon: Workflow,  editRoles: ["admin", "gerente"] },
  { key: "comercial",  label: "Comercial",   description: "Regras de venda e comissões.",                icon: ShoppingCart, editRoles: ["admin", "gerente"] },
  { key: "producao",   label: "Produção",    description: "Preparado para o módulo de produção.",        icon: Factory,   editRoles: ["admin", "gerente"] },
  { key: "financeiro", label: "Financeiro",  description: "Preparado para o módulo financeiro.",         icon: Wallet,    editRoles: ["admin", "gerente", "financeiro"] },
  { key: "documentos", label: "Documentos",  description: "Numeração, PDF e defaults de orçamento.",     icon: FileText,  editRoles: ["admin", "gerente", "financeiro"] },
  { key: "interface",  label: "Interface",   description: "Aparência e densidade.",                       icon: Palette,   editRoles: ["admin", "gerente", "financeiro", "vendedor", "producao"] },
  { key: "usuarios",   label: "Usuários",    description: "Regras de acesso e cadastro.",                 icon: UserCog,   editRoles: ["admin"] },
  { key: "sistema",    label: "Sistema",     description: "Ambiente, atualizações e recursos.",           icon: Cog,       editRoles: ["admin"] },
];

// Sanity: garante que toda categoria do domínio tem metadados.
const _assertAll: Record<SettingsCategory, true> = SETTINGS_CATEGORIES.reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {} as Record<SettingsCategory, true>,
);
void _assertAll;

function ConfiguracoesPage() {
  const { user } = useAuth();
  const { roles = [], loading: rolesLoading } = useUserRoles(user?.id);
  const [active, setActive] = React.useState<SettingsCategory>("empresa");

  const meta = CATEGORIES.find((c) => c.key === active)!;
  const canEdit = roles.some((r) => meta.editRoles.includes(r));

  return (
    <AppShell title="Configurações">
      <PageHeader
        title="Configurações"
        description="Motor de configuração — controle o comportamento do CloudGest por empresa, sem alterar código."
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav className="flex flex-col gap-1">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const activeItem = c.key === active;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setActive(c.key)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                      activeItem
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!canEdit && !rolesLoading && (
            <Alert>
              <AlertDescription>
                Você tem acesso apenas de leitura para esta categoria.
              </AlertDescription>
            </Alert>
          )}

          <CategoryPanel category={active} canEdit={canEdit} />
        </div>
      </div>
    </AppShell>
  );
}

// -----------------------------------------------------------------------------
// CategoryPanel — carrega a categoria ativa e renderiza a seção correspondente.
// -----------------------------------------------------------------------------
function CategoryPanel({ category, canEdit }: { category: SettingsCategory; canEdit: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["settings", category],
    queryFn: () => settingsService.get(category),
  });

  if (query.isLoading || !query.data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  async function save<T extends object>(patch: T) {
    await settingsService.update(category, patch as never);
    qc.invalidateQueries({ queryKey: ["settings", category] });
  }

  switch (category) {
    case "empresa":    return <EmpresaPanel    values={query.data as EmpresaSettings}    canEdit={canEdit} onSave={save} />;
    case "operacao":   return <OperacaoPanel   values={query.data as OperacaoSettings}   canEdit={canEdit} onSave={save} />;
    case "comercial":  return <ComercialPanel  values={query.data as ComercialSettings}  canEdit={canEdit} onSave={save} />;
    case "producao":   return <ProducaoPanel   values={query.data as ProducaoSettings}   canEdit={canEdit} onSave={save} />;
    case "financeiro": return <FinanceiroPanel values={query.data as FinanceiroSettings} canEdit={canEdit} onSave={save} />;
    case "documentos": return <DocumentosPanel values={query.data as DocumentosSettings} canEdit={canEdit} onSave={save} />;
    case "interface":  return <InterfacePanel  values={query.data as InterfaceSettings}  canEdit={canEdit} onSave={save} />;
    case "usuarios":   return <UsuariosPanel   values={query.data as UsuariosSettings}   canEdit={canEdit} onSave={save} />;
    case "sistema":    return <SistemaPanel    values={query.data as SistemaSettings}    canEdit={canEdit} onSave={save} />;
  }
}

// =============================================================================
// EMPRESA
// =============================================================================
function EmpresaPanel({
  values, canEdit, onSave,
}: { values: EmpresaSettings; canEdit: boolean; onSave: (v: Partial<EmpresaSettings>) => Promise<void> }) {
  const empresaFields: SettingsField<EmpresaSettings>[] = [
    { name: "nome_fantasia", label: "Nome fantasia", colSpan: 2 },
    { name: "razao_social", label: "Razão social", colSpan: 2 },
    { name: "cnpj", label: "CNPJ", maxLength: 20 },
    { name: "inscricao_estadual", label: "Inscrição estadual", maxLength: 30 },
    { name: "inscricao_municipal", label: "Inscrição municipal", maxLength: 30 },
    { name: "email", label: "E-mail", maxLength: 160 },
    { name: "telefone", label: "Telefone" },
    { name: "whatsapp", label: "WhatsApp" },
    { name: "site", label: "Site", colSpan: 2 },
  ];
  const enderecoFields: SettingsField<EmpresaSettings>[] = [
    { name: "cep", label: "CEP" },
    { name: "endereco", label: "Logradouro", colSpan: 3 },
    { name: "numero", label: "Número" },
    { name: "complemento", label: "Complemento", colSpan: 2 },
    { name: "bairro", label: "Bairro", colSpan: 2 },
    { name: "cidade", label: "Cidade" },
    { name: "uf", label: "UF", maxLength: 2 },
  ];
  const marcaFields: SettingsField<EmpresaSettings>[] = [
    { name: "cor_primaria", label: "Cor principal", type: "color" },
    { name: "idioma", label: "Idioma padrão", type: "select", options: [
      { value: "pt-BR", label: "Português (Brasil)" },
      { value: "en-US", label: "English (US)" },
      { value: "es-ES", label: "Español" },
    ]},
    { name: "fuso_horario", label: "Fuso horário", type: "select", options: [
      { value: "America/Sao_Paulo", label: "America/Sao_Paulo (BRT)" },
      { value: "America/Manaus", label: "America/Manaus (AMT)" },
      { value: "America/Belem", label: "America/Belem (BRT)" },
      { value: "America/Rio_Branco", label: "America/Rio_Branco (ACT)" },
    ]},
  ];

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Empresa"
        description="Dados institucionais utilizados em documentos, PDFs e comunicação."
        icon={Building2}
        columns={2}
        fields={empresaFields}
        values={values}
        schema={CATEGORY_SCHEMAS.empresa}
        onSave={onSave}
        canEdit={canEdit}
        headerSlot={<LogoUploader value={values.logo_url} onSave={onSave} canEdit={canEdit} />}
      />
      <SettingsSection
        title="Endereço"
        icon={Building2}
        columns={4}
        fields={enderecoFields}
        values={values}
        schema={CATEGORY_SCHEMAS.empresa}
        onSave={onSave}
        canEdit={canEdit}
      />
      <SettingsSection
        title="Marca e localização"
        icon={Palette}
        columns={3}
        fields={marcaFields}
        values={values}
        schema={CATEGORY_SCHEMAS.empresa}
        onSave={onSave}
        canEdit={canEdit}
      />
    </div>
  );
}

function LogoUploader({
  value, onSave, canEdit,
}: { value: string; onSave: (v: Partial<EmpresaSettings>) => Promise<void>; canEdit: boolean }) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    try {
      setUploading(true);
      const url = await storageService.uploadCompanyAsset(`logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`, file);
      await onSave({ logo_url: url });
      toast.success("Logo atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    try {
      await onSave({ logo_url: "" });
      toast.success("Logo removida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-md border border-dashed border-border p-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {value
          ? <img src={value} alt="Logo" className="max-h-full max-w-full object-contain" />
          : <Building2 className="h-8 w-8 text-muted-foreground" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-sm font-medium">Logo da empresa</div>
        <p className="text-xs text-muted-foreground">PNG, JPG ou SVG até 2MB. Usada em PDFs e cabeçalhos.</p>
        <div className="flex gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <Button
            type="button" size="sm" variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={!canEdit || uploading}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {value ? "Trocar" : "Enviar"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={!canEdit}>
              <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// OPERAÇÃO
// =============================================================================
function OperacaoPanel({
  values, canEdit, onSave,
}: { values: OperacaoSettings; canEdit: boolean; onSave: (v: Partial<OperacaoSettings>) => Promise<void> }) {
  const fields: SettingsField<OperacaoSettings>[] = [
    { name: "fluxo_documentos", label: "Fluxo de documentos", colSpan: 2, type: "select", options: [
      { value: "orcamento", label: "Somente orçamentos" },
      { value: "pedido", label: "Somente pedidos" },
      { value: "ambos", label: "Orçamentos e pedidos" },
    ]},
    { name: "fluxo_operacional", label: "Fluxo operacional", colSpan: 2, type: "select", options: [
      { value: "simplificado", label: "Simplificado (empresas menores)" },
      { value: "completo", label: "Completo (com aprovações e produção)" },
    ]},
    { name: "permitir_pedido_direto", label: "Permitir pedido direto", type: "switch",
      description: "Emissão de pedido sem passar por orçamento." },
    { name: "exigir_aprovacao_orcamento", label: "Exigir aprovação de orçamento", type: "switch",
      description: "Só permite converter/enviar após aprovação interna." },
    { name: "exigir_aprovacao_pedido", label: "Exigir aprovação de pedido", type: "switch",
      description: "Pedido nasce como pendente até aprovação." },
  ];
  return (
    <SettingsSection
      title="Operação" icon={Workflow} columns={2}
      description="Define como sua empresa vende e aprova documentos."
      fields={fields} values={values} schema={CATEGORY_SCHEMAS.operacao}
      onSave={onSave} canEdit={canEdit}
    />
  );
}

// =============================================================================
// COMERCIAL
// =============================================================================
function ComercialPanel({
  values, canEdit, onSave,
}: { values: ComercialSettings; canEdit: boolean; onSave: (v: Partial<ComercialSettings>) => Promise<void> }) {
  const fields: SettingsField<ComercialSettings>[] = [
    { name: "desconto_maximo_pct", label: "Desconto máximo (%)", type: "number", min: 0, max: 100, step: 0.5 },
    { name: "meta_mensal_valor", label: "Meta mensal (R$)", type: "number", min: 0, step: 100 },
    { name: "exigir_vendedor", label: "Exigir vendedor no orçamento", type: "switch" },
    { name: "usar_comissao", label: "Utilizar comissão de vendas", type: "switch" },
    { name: "comissao_padrao_pct", label: "Comissão padrão (%)", type: "number", min: 0, max: 100, step: 0.5,
      visible: (v) => v.usar_comissao },
  ];
  return (
    <SettingsSection
      title="Comercial" icon={ShoppingCart} columns={2}
      description="Regras de venda utilizadas por orçamentos, pedidos e futuras metas."
      fields={fields} values={values} schema={CATEGORY_SCHEMAS.comercial}
      onSave={onSave} canEdit={canEdit}
    />
  );
}

// =============================================================================
// PRODUÇÃO
// =============================================================================
function ProducaoPanel({
  values, canEdit, onSave,
}: { values: ProducaoSettings; canEdit: boolean; onSave: (v: Partial<ProducaoSettings>) => Promise<void> }) {
  const fields: SettingsField<ProducaoSettings>[] = [
    { name: "utiliza_producao", label: "Utiliza módulo de produção", type: "switch",
      description: "Ativa/oculta a área de produção no menu conforme evolução do módulo." },
    { name: "producao_por_setores", label: "Produção por setores", type: "switch",
      visible: (v) => v.utiliza_producao,
      description: "Kanban dividido por etapas configuráveis." },
    { name: "controle_atraso", label: "Controlar atraso de OP", type: "switch",
      visible: (v) => v.utiliza_producao },
    { name: "motivo_obrigatorio_atraso", label: "Motivo obrigatório no atraso", type: "switch",
      visible: (v) => v.utiliza_producao && v.controle_atraso },
  ];
  return (
    <SettingsSection
      title="Produção" icon={Factory} columns={2}
      description="Configurações preparadas para o módulo de produção."
      fields={fields} values={values} schema={CATEGORY_SCHEMAS.producao}
      onSave={onSave} canEdit={canEdit}
    />
  );
}

// =============================================================================
// FINANCEIRO
// =============================================================================
function FinanceiroPanel({
  values, canEdit, onSave,
}: { values: FinanceiroSettings; canEdit: boolean; onSave: (v: Partial<FinanceiroSettings>) => Promise<void> }) {
  const fields: SettingsField<FinanceiroSettings>[] = [
    { name: "utiliza_financeiro", label: "Utiliza módulo financeiro", type: "switch", colSpan: 2 },
    { name: "contas_a_receber", label: "Contas a receber", type: "switch", visible: (v) => v.utiliza_financeiro },
    { name: "contas_a_pagar", label: "Contas a pagar", type: "switch", visible: (v) => v.utiliza_financeiro },
    { name: "vencimento_dias_padrao", label: "Vencimento padrão (dias)", type: "number", min: 0, max: 365 },
    { name: "parcelamento_padrao", label: "Parcelamento padrão (x)", type: "number", min: 1, max: 48 },
    { name: "juros_padrao_pct", label: "Juros padrão (%)", type: "number", min: 0, max: 100, step: 0.1 },
    { name: "multa_padrao_pct", label: "Multa padrão (%)", type: "number", min: 0, max: 100, step: 0.1 },
  ];
  return (
    <SettingsSection
      title="Financeiro" icon={Wallet} columns={2}
      description="Regras armazenadas agora, aplicadas quando o módulo financeiro for ativado."
      fields={fields} values={values} schema={CATEGORY_SCHEMAS.financeiro}
      onSave={onSave} canEdit={canEdit}
    />
  );
}

// =============================================================================
// DOCUMENTOS
// =============================================================================
function DocumentosPanel({
  values, canEdit, onSave,
}: { values: DocumentosSettings; canEdit: boolean; onSave: (v: Partial<DocumentosSettings>) => Promise<void> }) {
  const numeracao: SettingsField<DocumentosSettings>[] = [
    { name: "prefixo_orcamento", label: "Prefixo do orçamento", placeholder: "ORC", maxLength: 10 },
    { name: "prefixo_pedido", label: "Prefixo do pedido", placeholder: "PED", maxLength: 10 },
    { name: "validade_orcamento_dias", label: "Validade padrão (dias)", type: "number", min: 1, max: 365 },
    { name: "prazos_validade_disponiveis", label: "Opções de prazo", type: "csv-numbers", colSpan: 3,
      description: "Prazos oferecidos ao emitir orçamento. Ex: 30, 60, 90." },
  ];
  const pdf: SettingsField<DocumentosSettings>[] = [
    { name: "exibir_logo_pdf", label: "Exibir logo no PDF", type: "switch" },
    { name: "exibir_rodape_pdf", label: "Exibir rodapé no PDF", type: "switch" },
    { name: "texto_rodape_pdf", label: "Texto do rodapé", type: "textarea", colSpan: 2, rows: 2, maxLength: 500,
      visible: (v) => v.exibir_rodape_pdf },
    { name: "exibir_observacoes_padrao", label: "Aplicar observações padrão", type: "switch" },
    { name: "observacoes_padrao_orcamento", label: "Observações padrão", type: "textarea", colSpan: 2, rows: 3,
      visible: (v) => v.exibir_observacoes_padrao },
    { name: "condicoes_pagamento_padrao", label: "Condições de pagamento padrão", colSpan: 2, maxLength: 300 },
    { name: "prazo_entrega_padrao", label: "Prazo de entrega padrão", colSpan: 2, maxLength: 120 },
  ];
  const assinatura: SettingsField<DocumentosSettings>[] = [
    { name: "assinatura_automatica", label: "Assinatura automática", type: "switch", colSpan: 2,
      description: "Preenche automaticamente nome e cargo em novos orçamentos." },
    { name: "assinatura_nome", label: "Nome padrão", visible: (v) => v.assinatura_automatica },
    { name: "assinatura_cargo", label: "Cargo padrão", visible: (v) => v.assinatura_automatica },
  ];
  return (
    <div className="space-y-4">
      <SettingsSection
        title="Numeração e validade" icon={FileText} columns={3}
        fields={numeracao} values={values} schema={CATEGORY_SCHEMAS.documentos}
        onSave={onSave} canEdit={canEdit}
      />
      <SettingsSection
        title="PDFs e defaults" icon={FileText} columns={2}
        fields={pdf} values={values} schema={CATEGORY_SCHEMAS.documentos}
        onSave={onSave} canEdit={canEdit}
      />
      <SettingsSection
        title="Assinatura" icon={FileText} columns={2}
        fields={assinatura} values={values} schema={CATEGORY_SCHEMAS.documentos}
        onSave={onSave} canEdit={canEdit}
      />
    </div>
  );
}

// =============================================================================
// INTERFACE
// =============================================================================
function InterfacePanel({
  values, canEdit, onSave,
}: { values: InterfaceSettings; canEdit: boolean; onSave: (v: Partial<InterfaceSettings>) => Promise<void> }) {
  const fields: SettingsField<InterfaceSettings>[] = [
    { name: "tema", label: "Tema padrão", type: "select", options: [
      { value: "claro", label: "Claro" },
      { value: "escuro", label: "Escuro" },
      { value: "automatico", label: "Automático (segue o sistema)" },
    ]},
    { name: "menu_padrao", label: "Menu lateral", type: "select", options: [
      { value: "expandido", label: "Expandido" },
      { value: "recolhido", label: "Recolhido (apenas ícones)" },
    ]},
    { name: "densidade", label: "Densidade das listas", type: "select", options: [
      { value: "confortavel", label: "Confortável" },
      { value: "compacta", label: "Compacta" },
    ]},
  ];
  return (
    <SettingsSection
      title="Interface" icon={Palette} columns={3}
      description="Padrões visuais aplicados a novos usuários e sessões."
      fields={fields} values={values} schema={CATEGORY_SCHEMAS.interface}
      onSave={onSave} canEdit={canEdit}
    />
  );
}

// =============================================================================
// USUÁRIOS
// =============================================================================
function UsuariosPanel({
  values, canEdit, onSave,
}: { values: UsuariosSettings; canEdit: boolean; onSave: (v: Partial<UsuariosSettings>) => Promise<void> }) {
  const fields: SettingsField<UsuariosSettings>[] = [
    { name: "cadastro_livre", label: "Permitir cadastro livre", type: "switch",
      description: "Qualquer pessoa pode se cadastrar sem convite." },
    { name: "convite_por_email", label: "Convite por e-mail", type: "switch",
      description: "Admin envia convites; usuários entram só quando convidados." },
    { name: "exigir_troca_senha_primeiro_login", label: "Trocar senha no 1º acesso", type: "switch" },
    { name: "mfa_obrigatorio", label: "MFA obrigatório (futuro)", type: "switch", disabled: true,
      description: "Será ativado quando o suporte a MFA for lançado." },
  ];
  return (
    <SettingsSection
      title="Usuários e acesso" icon={UserCog} columns={2}
      description="Regras de admissão e segurança de acesso."
      fields={fields} values={values} schema={CATEGORY_SCHEMAS.usuarios}
      onSave={onSave} canEdit={canEdit}
    />
  );
}

// =============================================================================
// SISTEMA
// =============================================================================
function SistemaPanel({
  values, canEdit, onSave,
}: { values: SistemaSettings; canEdit: boolean; onSave: (v: Partial<SistemaSettings>) => Promise<void> }) {
  const fields: SettingsField<SistemaSettings>[] = [
    { name: "ambiente", label: "Ambiente", type: "select", options: [
      { value: "producao", label: "Produção" },
      { value: "homologacao", label: "Homologação" },
      { value: "desenvolvimento", label: "Desenvolvimento" },
    ]},
    { name: "atualizacoes_automaticas", label: "Atualizações automáticas", type: "switch" },
    { name: "recursos_experimentais", label: "Recursos experimentais", type: "switch",
      description: "Habilita features em beta para esta empresa." },
    { name: "reter_logs_dias", label: "Reter logs (dias)", type: "number", min: 1, max: 3650 },
  ];
  return (
    <div className="space-y-4">
      <SettingsSection
        title="Sistema" icon={Cog} columns={2}
        description="Parâmetros gerais do ambiente."
        fields={fields} values={values} schema={CATEGORY_SCHEMAS.sistema}
        onSave={onSave} canEdit={canEdit}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Versão</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex items-center justify-between">
            <span>CloudGest ERP</span>
            <span className="font-mono text-muted-foreground">
              {import.meta.env.VITE_APP_VERSION ?? "dev"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Placeholder para linter — usamos Save via SettingsSection.
void Save;
