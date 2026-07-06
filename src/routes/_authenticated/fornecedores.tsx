import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, Search, Pencil, Trash2, Power, PowerOff,
  Truck, Mail, Phone,
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
import {
  EntityFormDialog,
  YES_NO_OPTIONS,
  type SectionConfig,
} from "@/components/entity-form-dialog";
import { suppliersService } from "@/services";
import { useAuth, useUserRoles } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  component: FornecedoresPage,
});

type Supplier = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  categoria: string | null;
  contato_nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  site: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

const supplierSchema = z.object({
  razao_social: z.string().trim().min(2, "Informe a razão social").max(200),
  nome_fantasia: z.string().trim().max(200).optional().or(z.literal("")),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  inscricao_estadual: z.string().trim().max(30).optional().or(z.literal("")),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  contato_nome: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
  telefone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  site: z.string().trim().max(200).optional().or(z.literal("")),
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  endereco: z.string().trim().max(200).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(100).optional().or(z.literal("")),
  bairro: z.string().trim().max(100).optional().or(z.literal("")),
  cidade: z.string().trim().max(100).optional().or(z.literal("")),
  uf: z.string().trim().max(2).optional().or(z.literal("")),
  condicoes_pagamento: z.string().trim().max(200).optional().or(z.literal("")),
  observacoes: z.string().trim().max(1000).optional().or(z.literal("")),
  ativo: z.boolean(),
});

type SupplierForm = z.infer<typeof supplierSchema>;

const emptyForm: SupplierForm = {
  razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "",
  categoria: "", contato_nome: "", email: "", telefone: "", whatsapp: "", site: "",
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  condicoes_pagamento: "", observacoes: "", ativo: true,
};

type FilterAtivo = "todos" | "ativos" | "inativos";

function FornecedoresPage() {
  const { user } = useAuth();
  const { hasRole } = useUserRoles(user?.id);
  const canDelete = hasRole("admin") || hasRole("gerente");

  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [ativoFilter, setAtivoFilter] = useState<FilterAtivo>("todos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await suppliersService.list()) as Supplier[],
  });

  const categorias = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => s.categoria && set.add(s.categoria));
    return Array.from(set).sort();
  }, [suppliers]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return suppliers.filter((sup) => {
      if (categoriaFilter !== "todas" && sup.categoria !== categoriaFilter) return false;
      if (ativoFilter === "ativos" && !sup.ativo) return false;
      if (ativoFilter === "inativos" && sup.ativo) return false;
      if (!s) return true;
      return (
        sup.razao_social.toLowerCase().includes(s) ||
        (sup.nome_fantasia ?? "").toLowerCase().includes(s) ||
        (sup.cnpj ?? "").toLowerCase().includes(s) ||
        (sup.email ?? "").toLowerCase().includes(s) ||
        (sup.telefone ?? "").toLowerCase().includes(s) ||
        (sup.cidade ?? "").toLowerCase().includes(s) ||
        (sup.categoria ?? "").toLowerCase().includes(s)
      );
    });
  }, [suppliers, search, categoriaFilter, ativoFilter]);

  const stats = useMemo(() => ({
    total: suppliers.length,
    ativos: suppliers.filter((s) => s.ativo).length,
    inativos: suppliers.filter((s) => !s.ativo).length,
    categorias: categorias.length,
  }), [suppliers, categorias]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SupplierForm) => {
      const nullify = (s: string | undefined | null) =>
        s === undefined || s === null || s === "" ? null : s;
      const row = {
        razao_social: payload.razao_social,
        nome_fantasia: nullify(payload.nome_fantasia),
        cnpj: nullify(payload.cnpj),
        inscricao_estadual: nullify(payload.inscricao_estadual),
        categoria: nullify(payload.categoria),
        contato_nome: nullify(payload.contato_nome),
        email: nullify(payload.email),
        telefone: nullify(payload.telefone),
        whatsapp: nullify(payload.whatsapp),
        site: nullify(payload.site),
        cep: nullify(payload.cep),
        endereco: nullify(payload.endereco),
        numero: nullify(payload.numero),
        complemento: nullify(payload.complemento),
        bairro: nullify(payload.bairro),
        cidade: nullify(payload.cidade),
        uf: nullify(payload.uf),
        condicoes_pagamento: nullify(payload.condicoes_pagamento),
        observacoes: nullify(payload.observacoes),
        ativo: payload.ativo,
      };
      if (editing) {
        await suppliersService.update(editing.id, row);
      } else {
        await suppliersService.create({ ...row, created_by: user?.id ?? null });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Fornecedor atualizado." : "Fornecedor criado.");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: (s: Supplier) => suppliersService.setAtivo(s.id, !s.ativo),
    onSuccess: (_d, s) => {
      toast.success(s.ativo ? "Fornecedor inativado." : "Fornecedor ativado.");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersService.remove(id),
    onSuccess: () => {
      toast.success("Fornecedor excluído.");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setDialogOpen(true);
  }

  const formDefaults: SupplierForm = editing
    ? {
        razao_social: editing.razao_social,
        nome_fantasia: editing.nome_fantasia ?? "",
        cnpj: editing.cnpj ?? "",
        inscricao_estadual: editing.inscricao_estadual ?? "",
        categoria: editing.categoria ?? "",
        contato_nome: editing.contato_nome ?? "",
        email: editing.email ?? "",
        telefone: editing.telefone ?? "",
        whatsapp: editing.whatsapp ?? "",
        site: editing.site ?? "",
        cep: editing.cep ?? "",
        endereco: editing.endereco ?? "",
        numero: editing.numero ?? "",
        complemento: editing.complemento ?? "",
        bairro: editing.bairro ?? "",
        cidade: editing.cidade ?? "",
        uf: editing.uf ?? "",
        condicoes_pagamento: editing.condicoes_pagamento ?? "",
        observacoes: editing.observacoes ?? "",
        ativo: editing.ativo,
      }
    : emptyForm;

  const supplierSections: SectionConfig<SupplierForm>[] = [
    {
      columns: 2,
      fields: [
        { name: "razao_social", label: "Razão social *", colSpan: 2 },
        { name: "nome_fantasia", label: "Nome fantasia" },
        { name: "cnpj", label: "CNPJ" },
        { name: "inscricao_estadual", label: "Inscrição estadual" },
        {
          name: "categoria",
          label: "Categoria",
          placeholder: "Ex: Papel, Tinta, Equipamentos...",
        },
        {
          name: "ativo",
          label: "Status",
          type: "select",
          options: YES_NO_OPTIONS,
        },
      ],
    },
    {
      title: "Contato",
      columns: 2,
      fields: [
        { name: "contato_nome", label: "Nome do contato" },
        { name: "email", label: "E-mail", type: "email" },
        { name: "telefone", label: "Telefone" },
        { name: "whatsapp", label: "WhatsApp" },
        { name: "site", label: "Site", colSpan: 2, placeholder: "https://" },
      ],
    },
    {
      title: "Endereço",
      columns: 6,
      fields: [
        { name: "cep", label: "CEP", colSpan: 2 },
        { name: "endereco", label: "Endereço", colSpan: 3 },
        { name: "numero", label: "Número", colSpan: 1 },
        { name: "complemento", label: "Complemento", colSpan: 3 },
        { name: "bairro", label: "Bairro", colSpan: 3 },
        { name: "cidade", label: "Cidade", colSpan: 4 },
        {
          name: "uf",
          label: "UF",
          colSpan: 2,
          inputProps: { maxLength: 2 },
          transform: (v) => v.toUpperCase().slice(0, 2),
        },
      ],
    },
    {
      title: "Comercial",
      columns: 1,
      fields: [
        {
          name: "condicoes_pagamento",
          label: "Condições de pagamento",
          placeholder: "Ex: 30/60/90 dias, à vista com 5% desc...",
        },
        { name: "observacoes", label: "Observações", type: "textarea", rows: 3 },
      ],
    },
  ];

  return (
    <AppShell title="Fornecedores">
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores de insumos, serviços e equipamentos da gráfica."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Novo fornecedor
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Ativos" value={stats.ativos} />
        <StatCard label="Inativos" value={stats.inativos} />
        <StatCard label="Categorias" value={stats.categorias} />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social, CNPJ, e-mail, cidade ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <Loader2 className="mr-2 size-5 animate-spin" /> Carregando fornecedores...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <p>Nenhum fornecedor encontrado.</p>
            {suppliers.length === 0 && (
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Cadastrar primeiro fornecedor
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className={s.ativo ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="size-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{s.nome_fantasia || s.razao_social}</div>
                        {s.nome_fantasia && (
                          <div className="text-xs text-muted-foreground">{s.razao_social}</div>
                        )}
                        {s.contato_nome && (
                          <div className="text-xs text-muted-foreground">Contato: {s.contato_nome}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {s.cnpj || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {s.categoria ? (
                      <Badge variant="outline">{s.categoria}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="space-y-0.5 text-xs">
                      {s.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="size-3" /> {s.email}
                        </div>
                      )}
                      {(s.whatsapp || s.telefone) && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="size-3" /> {s.whatsapp || s.telefone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {[s.cidade, s.uf].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? "default" : "secondary"}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={s.ativo ? "Inativar" : "Ativar"}
                        onClick={() => toggleAtivoMutation.mutate(s)}
                        disabled={toggleAtivoMutation.isPending}
                      >
                        {s.ativo ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          onClick={() => setToDelete(s)}
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

      <EntityFormDialog<SupplierForm>
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Editar fornecedor" : "Novo fornecedor"}
        description="Preencha os dados do fornecedor. Campos marcados com * são obrigatórios."
        schema={supplierSchema}
        defaultValues={formDefaults}
        sections={supplierSections}
        submitLabel={editing ? "Salvar alterações" : "Criar fornecedor"}
        isSubmitting={saveMutation.isPending}
        onSubmit={(values) => saveMutation.mutate(values)}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fornecedor <strong>{toDelete?.razao_social}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
