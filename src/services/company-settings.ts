import { supabase } from "./_client";
import type { CompanySettings, CompanySettingsUpdate } from "@/domain";

export const companySettingsService = {
  async get(): Promise<CompanySettings | null> {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as CompanySettings | null;
  },

  // Loose fetch used by PDF/print (no singleton filter, tolerant of legacy rows).
  async getAny(): Promise<CompanySettings | null> {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as CompanySettings | null;
  },

  async update(patch: CompanySettingsUpdate): Promise<void> {
    const { error } = await supabase
      .from("company_settings")
      .update(patch)
      .eq("singleton", true);
    if (error) throw error;
  },
};
