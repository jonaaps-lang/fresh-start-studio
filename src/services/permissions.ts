import {
  getMyPermissions,
  checkPermission,
  touchLastAccess,
} from "@/lib/permissions.functions";

export type MyPermissions = {
  roles: string[];
  /** Array de strings. Se contiver "*", o usuário tem acesso total. */
  permissions: string[];
};

export const permissionsService = {
  getMine: () => getMyPermissions() as Promise<MyPermissions>,
  check: (permission: string) =>
    checkPermission({ data: { permission } }) as Promise<{ allowed: boolean }>,
  touchLastAccess: () => touchLastAccess(),
};
