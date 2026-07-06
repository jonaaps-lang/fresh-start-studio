import {
  listUsers,
  createUser,
  updateUser,
  setUserActive,
  resetUserPassword,
  deleteUser,
  type AppRole,
} from "@/lib/users.functions";

export type ManagedUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cargo: string | null;
  cpf: string | null;
  matricula: string | null;
  assinatura_url: string | null;
  ultimo_acesso: string | null;
  created_at: string;
  roles: string[];
  ativo: boolean;
  last_sign_in_at: string | null;
};

type UserPayload = {
  full_name: string;
  phone?: string | null;
  cargo?: string | null;
  cpf?: string | null;
  matricula?: string | null;
  assinatura_url?: string | null;
  role: AppRole;
};

export const usersService = {
  list: () => listUsers() as Promise<ManagedUser[]>,
  create: (data: UserPayload & { email: string; password: string }) => createUser({ data }),
  update: (data: UserPayload & { id: string }) => updateUser({ data }),
  setAtivo: (id: string, ativo: boolean) => setUserActive({ data: { id, ativo } }),
  resetPassword: (id: string, password: string) =>
    resetUserPassword({ data: { id, password } }),
  remove: (id: string) => deleteUser({ data: { id } }),
};
