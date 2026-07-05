import { supabase } from "./_client";

const BUCKET = "company-assets";

export const storageService = {
  async uploadCompanyAsset(path: string, file: File): Promise<string> {
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) throw up.error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Faz upload de um arquivo e retorna o path armazenado (sem URL).
   * Use com createSignedUrl para exibição — evita expor arquivo em bucket privado.
   */
  async uploadCompanyAssetPath(path: string, file: File): Promise<string> {
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) throw up.error;
    return path;
  },

  async createSignedUrl(path: string, expiresInSec = 3600): Promise<string | null> {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSec);
    if (error) return null;
    return data.signedUrl;
  },
};

