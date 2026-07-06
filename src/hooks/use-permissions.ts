import { useQuery } from "@tanstack/react-query";
import { permissionsService, type MyPermissions } from "@/services/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/domain/permissions";

// -----------------------------------------------------------------------------
// Hook central de permissões.
//
// Uso:
//   const { can, isDeveloper, roles, loading } = usePermissions();
//   if (!can("pedidos.cancel")) return null;
//
// Nunca use este hook como única barreira em ações críticas — o backend
// (RLS + has_permission RPC) valida de novo antes de qualquer escrita.
// -----------------------------------------------------------------------------

export function usePermissions() {
  const { user, loading: authLoading } = useAuth();

  const q = useQuery<MyPermissions>({
    queryKey: ["my-permissions", user?.id],
    queryFn: () => permissionsService.getMine(),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const roles = (q.data?.roles ?? []) as AppRole[];
  const perms = new Set(q.data?.permissions ?? []);
  const isDeveloper = roles.includes("desenvolvedor") || perms.has("*");

  function can(permission: string): boolean {
    if (isDeveloper) return true;
    return perms.has(permission);
  }

  function canAny(list: string[]): boolean {
    if (isDeveloper) return true;
    return list.some((p) => perms.has(p));
  }

  function hasRole(role: AppRole): boolean {
    return roles.includes(role);
  }

  return {
    loading: authLoading || q.isLoading,
    roles,
    permissions: q.data?.permissions ?? [],
    isDeveloper,
    can,
    canAny,
    hasRole,
    refresh: q.refetch,
  };
}
