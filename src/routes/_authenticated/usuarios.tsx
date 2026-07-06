import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, Search, Pencil, Trash2, Power, PowerOff, KeyRound, ShieldAlert,
  Upload, ImageIcon,
} from "lucide-react";
import { z } from "zod";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  EntityFormDialog, type SectionConfig,
} from "@/components/entity-form-dialog";
import { usersService, storageService, type ManagedUser } from "@/services";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import {
  SELECTABLE_ROLES,
  APP_ROLE_LABEL,
  type AppRole,
} from "@/domain/permissions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

const ALL_ROLES = [
  "desenvolvedor", "dono", "admin", "gerente", "comercial",
  "vendedor", "producao", "financeiro",
] as const;

const ROLE_OPTIONS = SELECTABLE_ROLES.map((r) => ({
  value: r,
  label: APP_ROLE_LABEL[r],
}));

// Schemas — permitem os papéis selecionáveis + tolerância aos legados na edição.
const roleEnum = z.enum(ALL_ROLES);

const baseUserFields = {
  full_name: z.string().trim().min(2, "Informe o nome completo").max(200),
  cargo: z.string().trim().max(120).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  matricula: z.string().trim().max(40).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  role: roleEnum,
  assinatura_url: z.string().trim().max(500).optional().or(z.literal("")),
};

const createSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(160),
  password: z.string().min(6, "Senha mínima de 6 caracteres").max(72),
  ...baseUserFields,
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({ ...baseUserFields });
type EditForm = z.infer<typeof editSchema>;

function nullify(v: string | null | undefined): string | null {
  return !v ? null : v;
}

function UsuariosPage() {
  const { user } = useAuth();
  const { can, isDeveloper, hasRole, loading: permsLoading } = usePermissions();
  const qc = useQueryClient();

  const canManage = isDeveloper || hasRole("dono") || hasRole("admin") || can("usuarios.create");
  const canView = canManage || can("usuarios.view");

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [toDelete, setToDelete] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => usersService.list(),
    enabled: canView && !permsLoading,
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(s) ||
        (u.email ?? "").toLowerCase().includes(s) ||
        (u.cargo ?? "").toLowerCase().includes(s) ||
        (u.roles ?? []).some((r) => r.toLowerCase().includes(s)),
    );
  }, [users, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["managed-users"] });

  const createMut = useMutation({
    mutationFn: (v: CreateForm) =>
      usersService.create({
        email: v.email,
        password: v.password,
        full_name: v.full_name,
        phone: nullify(v.phone),
        cargo: nullify(v.cargo),
        cpf: nullify(v.cpf),
        matricula: nullify(v.matricula),
        assinatura_url: nullify(v.assinatura_url),
        role: v.role as AppRole,
      }),
    onSuccess: () => {
      toast.success("Usuário criado.");
      invalidate();
      setCreateOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (v: EditForm & { id: string }) =>
      usersService.update({
        id: v.id,
        full_name: v.full_name,
        phone: nullify(v.phone),
        cargo: nullify(v.cargo),
        cpf: nullify(v.cpf),
        matricula: nullify(v.matricula),
        assinatura_url: nullify(v.assinatura_url),
        role: v.role as AppRole,
      }),
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      invalidate();
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (u: ManagedUser) => usersService.setAtivo(u.id, !u.ativo),
    onSuccess: (_d, u) => {
      toast.success(u.ativo ? "Usuário desativado." : "Usuário ativado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      toast.success("Usuário excluído.");
      invalidate();
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersService.resetPassword(id, password),
    onSuccess: () => {
      toast.success("Senha redefinida.");
      setResetting(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // -------- Guarda --------
  if (permsLoading) {
    return (
      <AppShell title="Usuários">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Carregando permissões...
        </div>
      </AppShell>
    );
  }
  if (!canView) {
    return (
      <AppShell title="Usuários">
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <ShieldAlert className="size-8" />
          <p>Acesso restrito.</p>
        </div>
      </AppShell>
    );
  }

  // -------- Config dos formulários --------
  const commonFormSections: SectionConfig<any>[] = [
    {
      columns: 2,
      fields: [
        { name: "full_name", label: "Nome completo *", colSpan: 2 },
        { name: "cargo", label: "Cargo", placeholder: "Ex: Gerente de vendas" },
        { name: "matricula", label: "Matrícula" },
        { name: "cpf", label: "CPF", placeholder: "000.000.000-00" },
        { name: "phone", label: "Telefone", placeholder: "(00) 00000-0000" },
        {
          name: "role",
          label: "Perfil *",
          type: "select",
          colSpan: 2,
          options: ROLE_OPTIONS,
        },
        {
          name: "assinatura_url",
          label: "Assinatura (PNG)",
          type: "custom",
          colSpan: 2,
          render: ({ values, setField }) => (
            <SignatureField
              value={values.assinatura_url}
              userIdHint={editing?.id}
              onChange={(v) => setField("assinatura_url", v ?? "")}
            />
          ),
        },
      ],
    },
  ];

  const createSections: SectionConfig<CreateForm>[] = [
    {
      columns: 2,
      fields: [
        { name: "email", label: "E-mail *", type: "email" },
        { name: "password", label: "Senha inicial *", placeholder: "mínimo 6 caracteres" },
      ],
    },
    ...(commonFormSections as SectionConfig<CreateForm>[]),
  ];

  const editSections = commonFormSections as SectionConfig<EditForm>[];

  const createDefaults: CreateForm = {
    email: "", password: "",
    full_name: "", cargo: "", cpf: "", matricula: "", phone: "",
    assinatura_url: "", role: "comercial",
  };

  const primaryRole = (editing?.roles?.[0] as AppRole) ?? "comercial";
  const editDefaults: EditForm = editing
    ? {
        full_name: editing.full_name ?? "",
        cargo: editing.cargo ?? "",
        cpf: editing.cpf ?? "",
        matricula: editing.matricula ?? "",
        phone: editing.phone ?? "",
        assinatura_url: editing.assinatura_url ?? "",
        role: primaryRole,
      }
    : {
        full_name: "", cargo: "", cpf: "", matricula: "", phone: "",
        assinatura_url: "", role: "comercial",
      };

  return (
    <AppShell title="Usuários">
      <PageHeader
        title="Usuários"
        description="Cadastro de pessoas com acesso ao sistema, perfis e permissões."
      >
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Novo usuário
          </Button>
        )}
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, cargo ou perfil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Carregando usuários...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden md:table-cell">Cargo</TableHead>
                <TableHead className="hidden md:table-cell">Perfil</TableHead>
                <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-[180px] text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const self = u.id === user?.id;
                return (
                  <TableRow key={u.id} className={u.ativo ? "" : "opacity-60"}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {u.cargo || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r} variant="outline">
                              {APP_ROLE_LABEL[r as AppRole] ?? r}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                        : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? "default" : "secondary"}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Redefinir senha"
                            onClick={() => setResetting(u)}
                          >
                            <KeyRound className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title={u.ativo ? "Desativar" : "Ativar"}
                            disabled={self || activeMut.isPending}
                            onClick={() => activeMut.mutate(u)}
                          >
                            {u.ativo ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Editar"
                            onClick={() => setEditing(u)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Excluir"
                            disabled={self}
                            onClick={() => setToDelete(u)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create */}
      <EntityFormDialog<CreateForm>
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Novo usuário"
        description="O usuário poderá entrar imediatamente com este e-mail e senha."
        schema={createSchema}
        defaultValues={createDefaults}
        sections={createSections}
        submitLabel="Criar usuário"
        isSubmitting={createMut.isPending}
        onSubmit={(v) => createMut.mutate(v)}
      />

      {/* Edit */}
      <EntityFormDialog<EditForm>
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Editar usuário"
        description={editing?.email ?? ""}
        schema={editSchema}
        defaultValues={editDefaults}
        sections={editSections}
        submitLabel="Salvar alterações"
        isSubmitting={updateMut.isPending}
        onSubmit={(v) => { if (editing) updateMut.mutate({ ...v, id: editing.id }); }}
      />

      {/* Reset password */}
      <Dialog open={!!resetting} onOpenChange={(o) => { if (!o) { setResetting(null); setNewPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>{resetting?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Nova senha</Label>
            <Input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setResetting(null); setNewPassword(""); }}>
              Cancelar
            </Button>
            <Button
              disabled={newPassword.length < 6 || resetMut.isPending}
              onClick={() => resetting && resetMut.mutate({ id: resetting.id, password: newPassword })}
            >
              {resetMut.isPending && <Loader2 className="size-4 animate-spin" />}
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente <b>{toDelete?.email}</b> do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
              disabled={deleteMut.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

// -----------------------------------------------------------------------------
// SignatureField — upload de PNG para o bucket privado company-assets.
// Armazena o path no formulário; a exibição usa createSignedUrl.
// -----------------------------------------------------------------------------
function SignatureField({
  value,
  userIdHint,
  onChange,
}: {
  value: string;
  userIdHint?: string;
  onChange: (v: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Carrega preview via signed URL quando já existe assinatura salva
  useMemo(() => {
    if (!value) { setPreview(null); return; }
    storageService.createSignedUrl(value, 3600).then((url) => setPreview(url));
  }, [value]);

  async function handleFile(file: File) {
    if (!file.type.includes("png")) {
      toast.error("A assinatura deve estar em formato PNG.");
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error("A assinatura não pode passar de 500 KB.");
      return;
    }
    setUploading(true);
    try {
      const path = `signatures/${userIdHint ?? "new"}-${Date.now()}.png`;
      const stored = await storageService.uploadCompanyAssetPath(path, file);
      onChange(stored);
      toast.success("Assinatura enviada.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-3">
      <div className="flex size-16 items-center justify-center rounded bg-muted text-muted-foreground">
        {preview ? (
          <img src={preview} alt="Assinatura" className="max-h-16 max-w-full object-contain" />
        ) : (
          <ImageIcon className="size-6" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">
          PNG com fundo transparente, até 500 KB. Usada em orçamentos e pedidos impressos.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
            {value ? "Trocar" : "Enviar"}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={uploading}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
