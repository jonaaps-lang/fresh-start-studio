import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -----------------------------------------------------------------------------
// Server functions do motor de permissões.
// - getMyPermissions: lista todas as permissões do usuário atual na empresa
//   corrente (união de todos os papéis + regra de desenvolvedor).
// - checkPermission: validação de permissão explícita no backend (uso em
//   fluxos críticos que precisam falhar mesmo se a UI for burlada).
// - touchLastAccess: registra último acesso do usuário no perfil.
// -----------------------------------------------------------------------------

export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1) Papéis do usuário
    const rolesRes = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    const roles = (rolesRes.data ?? []).map((r: { role: string }) => r.role);

    // Desenvolvedor tem acesso total — sinalizamos com o marker "*"
    if (roles.includes("desenvolvedor")) {
      return { roles, permissions: ["*"] as string[] };
    }

    if (roles.length === 0) return { roles: [] as string[], permissions: [] as string[] };

    // 2) Permissões da matriz para a empresa atual (RLS filtra por empresa do usuário)
    const permsRes = await supabase
      .from("role_permissions")
      .select("permission")
      .in("role", roles as any);
    if (permsRes.error) throw new Error(permsRes.error.message);

    const permissions = Array.from(
      new Set((permsRes.data ?? []).map((r: { permission: string }) => r.permission)),
    );
    return { roles, permissions };
  });

const checkSchema = z.object({ permission: z.string().min(1) });

export const checkPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permission: data.permission,
    });
    if (error) throw new Error(error.message);
    return { allowed: Boolean(ok) };
  });

export const touchLastAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Fire-and-forget; ignore error (não deve bloquear login)
    await context.supabase.rpc("touch_last_access");
    return { ok: true };
  });
