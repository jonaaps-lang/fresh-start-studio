// =============================================================================
// Motor de Configuração — Service
// -----------------------------------------------------------------------------
// Interface única para ler/escrever configurações de qualquer categoria.
// - Categorias em `APP_SETTINGS_CATEGORIES` persistem na tabela `app_settings`
//   (JSONB, versionada, com histórico automático via trigger).
// - Categoria `empresa` persiste em `company_settings` (compatibilidade com
//   fluxos existentes — PDFs, logo, etc.).
// - Toda leitura mescla os defaults do domínio garantindo shape estável mesmo
//   com registros antigos ou parcialmente preenchidos.
// =============================================================================

import { supabase } from "./_client";
import { companySettingsService } from "./company-settings";
import {
  APP_SETTINGS_CATEGORIES,
  CATEGORY_DEFAULTS,
  CATEGORY_SCHEMAS,
  DEFAULT_EMPRESA,
  type EmpresaSettings,
  type SettingsCategory,
  type SettingsShape,
} from "@/domain/settings";

type Historico = {
  version: number;
  data: unknown;
  changed_at: string;
  changed_by: string | null;
};

function mergeDefaults<C extends SettingsCategory>(
  category: C,
  raw: unknown,
): SettingsShape[C] {
  const defaults = CATEGORY_DEFAULTS[category];
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { ...defaults, ...source } as SettingsShape[C];
}

async function getEmpresa(): Promise<EmpresaSettings> {
  const row = await companySettingsService.get();
  if (!row) return { ...DEFAULT_EMPRESA };
  return {
    ...DEFAULT_EMPRESA,
    nome_fantasia: row.nome_fantasia ?? "",
    razao_social: row.razao_social ?? "",
    cnpj: row.cnpj ?? "",
    inscricao_estadual: row.inscricao_estadual ?? "",
    inscricao_municipal: row.inscricao_municipal ?? "",
    cep: row.cep ?? "",
    endereco: row.endereco ?? "",
    numero: row.numero ?? "",
    complemento: row.complemento ?? "",
    bairro: row.bairro ?? "",
    cidade: row.cidade ?? "",
    uf: row.uf ?? "",
    telefone: row.telefone ?? "",
    whatsapp: row.whatsapp ?? "",
    email: row.email ?? "",
    site: row.site ?? "",
    logo_url: row.logo_url ?? "",
    cor_primaria: row.cor_primaria ?? DEFAULT_EMPRESA.cor_primaria,
    // idioma/fuso não existem em company_settings — mantidos em app_settings/empresa_meta futuramente
  };
}

async function saveEmpresa(patch: Partial<EmpresaSettings>): Promise<void> {
  // Somente os campos suportados por company_settings são persistidos aqui.
  // Campos futuros (idioma, fuso) serão movidos para app_settings.empresa_meta.
  const mapped: Record<string, unknown> = {};
  const passthrough = [
    "nome_fantasia","razao_social","cnpj","inscricao_estadual","inscricao_municipal",
    "cep","endereco","numero","complemento","bairro","cidade","uf",
    "telefone","whatsapp","email","site","logo_url","cor_primaria",
  ] as const;
  for (const k of passthrough) {
    if (k in patch) mapped[k] = (patch as Record<string, unknown>)[k] ?? null;
  }
  if (Object.keys(mapped).length === 0) return;
  await companySettingsService.update(mapped);
}

export const settingsService = {
  async get<C extends SettingsCategory>(category: C): Promise<SettingsShape[C]> {
    if (category === "empresa") {
      return (await getEmpresa()) as SettingsShape[C];
    }
    const { data, error } = await supabase
      .from("app_settings")
      .select("data")
      .eq("category", category)
      .maybeSingle();
    if (error) throw error;
    return mergeDefaults(category, data?.data);
  },

  async update<C extends SettingsCategory>(
    category: C,
    patch: Partial<SettingsShape[C]>,
  ): Promise<SettingsShape[C]> {
    if (category === "empresa") {
      await saveEmpresa(patch as Partial<EmpresaSettings>);
      return (await getEmpresa()) as SettingsShape[C];
    }

    if (!APP_SETTINGS_CATEGORIES.includes(category)) {
      throw new Error(`Categoria desconhecida: ${category}`);
    }

    const current = await this.get(category);
    const merged = { ...current, ...patch } as SettingsShape[C];
    const parsed = CATEGORY_SCHEMAS[category].safeParse(merged);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Configuração inválida");
    }
    const value = parsed.data as SettingsShape[C];

    const { data: existing, error: findErr } = await supabase
      .from("app_settings")
      .select("id")
      .eq("category", category)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing?.id) {
      const { error } = await supabase
        .from("app_settings")
        .update({ data: value as never })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      // empresa_id é preenchida pelo gatilho tg_fill_tenant_fields.
      const { error } = await supabase
        .from("app_settings")
        .insert({ category, data: value as never } as never);
      if (error) throw error;
    }
    return value;
  },

  async history(category: SettingsCategory, limit = 20): Promise<Historico[]> {
    const { data, error } = await supabase
      .from("app_settings_history")
      .select("version, data, changed_at, changed_by")
      .eq("category", category)
      .order("changed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Historico[];
  },
};
