import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -----------------------------------------------------------------------------
// Users management — admin-only server functions.
// Aceita todos os papéis do catálogo em src/domain/permissions.ts. Só admin
// (Dono ou Desenvolvedor no modelo novo, admin legado por compatibilidade)
// pode gerenciar usuários; enforce via has_permission('usuarios.manage')
// depois da UI estar migrada — nesta fase mantemos ensureAdmin p/ compat.
// -----------------------------------------------------------------------------

const APP_ROLES = [
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

async function ensureAdmin(context: {
  supabase: any;
  userId: string;
}): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

// ---------- List ----------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Profiles (com campos novos: cargo, cpf, matricula, assinatura_url, ultimo_acesso)
    const profilesRes = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, email, phone, cargo, cpf, matricula, assinatura_url, ultimo_acesso, created_at",
      );
    if (profilesRes.error) throw new Error(profilesRes.error.message);

    // Roles
    const rolesRes = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (rolesRes.error) throw new Error(rolesRes.error.message);

    // Auth users — for ban / last sign-in
    const authRes = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (authRes.error) throw new Error(authRes.error.message);

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }
    const authByUser = new Map<string, { banned_until: string | null; last_sign_in_at: string | null }>();
    for (const u of authRes.data.users ?? []) {
      authByUser.set(u.id, {
        banned_until: (u as any).banned_until ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }

    return (profilesRes.data ?? []).map((p: any) => {
      const auth = authByUser.get(p.id);
      const bannedUntil = auth?.banned_until ?? null;
      const isBanned = bannedUntil ? new Date(bannedUntil).getTime() > Date.now() : false;
      return {
        id: p.id as string,
        full_name: p.full_name as string | null,
        email: p.email as string | null,
        phone: p.phone as string | null,
        cargo: (p.cargo ?? null) as string | null,
        cpf: (p.cpf ?? null) as string | null,
        matricula: (p.matricula ?? null) as string | null,
        assinatura_url: (p.assinatura_url ?? null) as string | null,
        ultimo_acesso: (p.ultimo_acesso ?? null) as string | null,
        created_at: p.created_at as string,
        roles: rolesByUser.get(p.id) ?? [],
        ativo: !isBanned,
        last_sign_in_at: auth?.last_sign_in_at ?? p.ultimo_acesso ?? null,
      };
    });
  });

// ---------- Create ----------
const profileFields = {
  cargo: z.string().trim().max(120).optional().nullable(),
  cpf: z.string().trim().max(20).optional().nullable(),
  matricula: z.string().trim().max(40).optional().nullable(),
  assinatura_url: z.string().trim().max(500).optional().nullable(),
};

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Senha mínima de 6 caracteres"),
  full_name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(APP_ROLES),
  ...profileFields,
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (created.error) throw new Error(created.error.message);
    const newId = created.data.user!.id;

    // handle_new_user trigger creates the profile row and inserts a default role.
    // Overwrite profile fields + enforce single role.
    const profUpd = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        cargo: data.cargo ?? null,
        cpf: data.cpf ?? null,
        matricula: data.matricula ?? null,
        assinatura_url: data.assinatura_url ?? null,
      } as any)
      .eq("id", newId);
    if (profUpd.error) throw new Error(profUpd.error.message);

    const roleDel = await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    if (roleDel.error) throw new Error(roleDel.error.message);
    const roleIns = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (roleIns.error) throw new Error(roleIns.error.message);

    return { id: newId };
  });

// ---------- Update ----------
const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(APP_ROLES),
  ...profileFields,
});

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const profUpd = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone ?? null,
        cargo: data.cargo ?? null,
        cpf: data.cpf ?? null,
        matricula: data.matricula ?? null,
        assinatura_url: data.assinatura_url ?? null,
      } as any)
      .eq("id", data.id);
    if (profUpd.error) throw new Error(profUpd.error.message);

    // Single-role model: replace existing roles with the chosen one.
    const roleDel = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    if (roleDel.error) throw new Error(roleDel.error.message);
    const roleIns = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.role });
    if (roleIns.error) throw new Error(roleIns.error.message);
    return { ok: true };
  });

// ---------- Set active (ban/unban) ----------
const activeSchema = z.object({ id: z.string().uuid(), ativo: z.boolean() });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id === context.userId && !data.ativo) {
      throw new Error("Você não pode desativar a si mesmo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upd = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.ativo ? "none" : "876000h", // ~100 anos
    } as any);
    if (upd.error) throw new Error(upd.error.message);
    return { ok: true };
  });

// ---------- Reset password ----------
const passwordSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(6),
});

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => passwordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upd = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (upd.error) throw new Error(upd.error.message);
    return { ok: true };
  });

// ---------- Delete ----------
const deleteSchema = z.object({ id: z.string().uuid() });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id === context.userId) {
      throw new Error("Você não pode excluir a si mesmo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const del = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (del.error) throw new Error(del.error.message);
    return { ok: true };
  });
