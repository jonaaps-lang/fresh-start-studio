import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, Search, Pencil, Trash2, Power, PowerOff,
  Building2, User as UserIcon, Mail, Phone,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EntityFormDialog,
  YES_NO_OPTIONS,
  type SectionConfig,
} from "@/components/entity-form-dialog";
import { customersService } from "@/services";
import { useAuth, useUserRoles } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

type CustomerType = "pf" | "pj";
type Customer = {
  id: string;
  tipo: CustomerType;
  nome: string;
  cpf_cnpj: string | null;
  rg_ie: string | null;
  contato_nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

const customerSchema = z.object({
  tipo: z.enum(["pf", "pj"]),
  nome: z.string().trim().min(2, "Informe o nome").max(200),
  cpf_cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  rg_ie: z.string().trim().max(30).optional().or(z.literal("")),
  contato_nome: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
  telefone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  endereco: z.string().trim().max(200).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(100).optional().or(z.literal("")),
  bairro: z.string().trim().max(100).optional().or(z.literal("")),
  cidade: z.string().trim().max(100).optional().or(z.literal("")),
  uf: z.string().trim().max(2).optional().or(z.literal("")),
  observacoes: z.string().trim().max(1000).optional().or(z.literal("")),
  ativo: z.boolean(),
});

type CustomerForm = z.infer<typeof customerSchema>;

const emptyForm: CustomerForm = {
  tipo: "pj", nome: "", cpf_cnpj: "", rg_ie: "", contato_nome: "",
  email: "", telefone: "", whatsapp: "",
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  observacoes: "", ativo: true,
};

type FilterAtivo = "todos" | "ativos" | "inativos";

function ClientesPage() {
  const { user } = useAuth();
  const { hasRole } = useUserRoles(user?.id);
  const canDelete = hasRole("admin") || hasRole("gerente");

  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | CustomerType>("todos");
  const [ativoFilter, setAtivoFilter] = useState<FilterAtivo>("todos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await customersService.list()) as Customer[],
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (tipoFilter !== "todos" && c.tipo !== tipoFilter) return false;
      if (ativoFilter === "ativos" && !c.ativo) return false;
      if (ativoFilter === "inativos" && c.ativo) return false;
      if (!s) return true;
      return (
        c.nome.toLowerCase().includes(s) ||
        (c.cpf_cnpj ?? "").toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s) ||
        (c.telefone ?? "").toLowerCase().includes(s) ||
        (c.cidade ?? "").toLowerCase().includes(s)
      );
    });
  }, [customers, search, tipoFilter, ativoFilter]);

  const stats = useMemo(() => ({
    total: customers.length,
    ativos: customers.filter((c) => c.ativo).length,
    pj: customers.filter((c) => c.tipo === "pj").length,
    pf: customers.filter((c) => c.tipo === "pf").length,
  }), [customers]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CustomerForm) => {
      const nullify = (s: string | undefined | null) =>
        s === undefined || s === null || s === "" ? null : s;
      const row = {
        tipo: payload.tipo,
        nome: payload.nome,
        cpf_cnpj: nullify(payload.cpf_cnpj),
        rg_ie: nullify(payload.rg_ie),
        contato_nome: nullify(payload.contato_nome),
        email: nullify(payload.email),
        telefone: nullify(payload.telefone),
        whatsapp: nullify(payload.whatsapp),
        cep: nullify(payload.cep),
        endereco: nullify(payload.endereco),
        numero: nullify(payload.numero),
        complemento: nullify(payload.complemento),
        bairro: nullify(payload.bairro),
        cidade: nullify(payload.cidade),
        uf: nullify(payload.uf),
        observacoes: nullify(payload.observacoes),
        ativo: payload.ativo,
      };
      if (editing) {
        await customersService.update(editing.id, row);
      } else {
        await customersService.create({ ...row, created_by: user?.id ?? null });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado." : "Cliente criado.");
      qc.invalidateQueries({ queryKey: ["customers"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: (c: Customer) => customersService.setAtivo(c.id, !c.ativo),
    onSuccess: (_d, c) => {
      toast.success(c.ativo ? "Cliente inativado." : "Cliente ativado.");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.remove(id),
    onSuccess: () => {
      toast.success("Cliente excluído.");
      qc.invalidateQueries({ queryKey: ["customers"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    setDialogOpen(true);
  }

  // Values fed into EntityFormDialog. Rebuilt whenever `editing` changes and
  // re-seeded inside the dialog on open.
  const formDefaults: CustomerForm = editing
    ? {
        tipo: editing.tipo,
        nome: editing.nome,
        cpf_cnpj: editing.cpf_cnpj ?? "",
        rg_ie: editing.rg_ie ?? "",
        contato_nome: editing.contato_nome ?? "",
        email: editing.email ?? "",
        telefone: editing.telefone ?? "",
        whatsapp: editing.whatsapp ?? "",
        cep: editing.cep ?? "",
        endereco: editing.endereco ?? "",
        numero: editing.numero ?? "",
        complemento: editing.complemento ?? "",
        bairro: editing.bairro ?? "",
        cidade: editing.cidade ?? "",
        uf: editing.uf ?? "",
        observacoes: editing.observacoes ?? "",
        ativo: editing.ativo,
      }
    : emptyForm;

  const customerSections: SectionConfig<CustomerForm>[] = [
    {
      columns: 2,
      fields: [
        {
          name: "tipo",
          label: "Tipo *",
          type: "select",
          options: [
            { value: "pj", label: "Pessoa Jurídica" },
            { value: "pf", label: "Pessoa Física" },
          ],
        },
        {
          name: "ativo",
          label: "Status",
          type: "select",
          options: YES_NO_OPTIONS,
        },
        {
          name: "nome",
          label: (v) => (v.tipo === "pj" ? "Razão social *" : "Nome completo *"),
          colSpan: 2,
        },
        { name: "cpf_cnpj", label: (v) => (v.tipo === "pj" ? "CNPJ" : "CPF") },
        {
          name: "rg_ie",
          label: (v) => (v.tipo === "pj" ? "Inscrição estadual" : "RG"),
        },
        {
          name: "contato_nome",
          label: "Pessoa de contato",
          colSpan: 2,
          visible: (v) => v.tipo === "pj",
        },
        { name: "email", label: "E-mail", type: "email" },
        { name: "telefone", label: "Telefone", placeholder: "(00) 0000-0000" },
        {
          name: "whatsapp",
          label: "WhatsApp",
          colSpan: 2,
          placeholder: "(00) 00000-0000",
        },
      ],
    },
    {
      title: "Endereço",
      columns: 6,
      fields: [
        { name: "cep", label: "CEP", colSpan: 2, placeholder: "00000-000" },
        { name: "endereco", label: "Endereço", colSpan: 4 },
        { name: "numero", label: "Número", colSpan: 2 },
        { name: "complemento", label: "Complemento", colSpan: 4 },
        { name: "bairro", label: "Bairro", colSpan: 2 },
        { name: "cidade", label: "Cidade", colSpan: 3 },
        {
          name: "uf",
          label: "UF",
          colSpan: 1,
          inputProps: { maxLength: 2 },
          transform: (v) => v.toUpperCase().slice(0, 2),
        },
      ],
    },
    {
      columns: 1,
      fields: [
        { name: "observacoes", label: "Observações", type: "textarea", rows: 3 },
      ],
    },
  ];

  return (
    <AppShell title="Clientes">
      <PageHeader
        title="Clientes"
        description="Cadastro de pessoas físicas e jurídicas atendidas pela gráfica."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Novo cliente
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Ativos" value={stats.ativos} />
        <StatCard label="PJ" value={stats.pj} />
        <StatCard label="PF" value={stats.pf} />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, e-mail, telefone ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={tipoFilter} onValueChange={(v) => setTipoFilter(v as typeof tipoFilter)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="pj">PJ</TabsTrigger>
            <TabsTrigger value="pf">PF</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={ativoFilter} onValueChange={(v) => setAtivoFilter(v as FilterAtivo)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="ativos">Apenas ativos</SelectItem>
            <SelectItem value="inativos">Apenas inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Carregando clientes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <p>Nenhum cliente encontrado.</p>
            {customers.length === 0 && (
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Cadastrar primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Documento</TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className={c.ativo ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.tipo === "pj" ? (
                        <Building2 className="size-4 text-muted-foreground" />
                      ) : (
                        <UserIcon className="size-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{c.nome}</div>
                        {c.contato_nome && (
                          <div className="text-xs text-muted-foreground">{c.contato_nome}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {c.cpf_cnpj || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="space-y-0.5 text-xs">
                      {c.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="size-3" /> {c.email}
                        </div>
                      )}
                      {(c.whatsapp || c.telefone) && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="size-3" /> {c.whatsapp || c.telefone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {[c.cidade, c.uf].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.ativo ? "default" : "secondary"}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={c.ativo ? "Inativar" : "Ativar"}
                        onClick={() => toggleAtivoMutation.mutate(c)}
                        disabled={toggleAtivoMutation.isPending}
                      >
                        {c.ativo ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          onClick={() => setToDelete(c)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <EntityFormDialog<CustomerForm>
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Editar cliente" : "Novo cliente"}
        description="Preencha os dados do cliente. Campos marcados com * são obrigatórios."
        schema={customerSchema}
        defaultValues={formDefaults}
        sections={customerSections}
        submitLabel={editing ? "Salvar alterações" : "Criar cliente"}
        isSubmitting={saveMutation.isPending}
        onSubmit={(values) => saveMutation.mutate(values)}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente{" "}
              <strong>{toDelete?.nome}</strong> será removido permanentemente.
              Considere inativar em vez de excluir para preservar o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
