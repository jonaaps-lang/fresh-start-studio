import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Search, Pencil, Trash2, Power, Package } from "lucide-react";
import { z } from "zod";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityFormDialog, type SectionConfig } from "@/components/entity-form-dialog";
import { productsService } from "@/services";
import { useAuth, useUserRoles } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: ProdutosPage,
});

type ProductType = "produto" | "servico";

type Product = {
  id: string;
  tipo: ProductType;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  unidade: string;
  preco_base: number;
  custo: number;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
};

const schema = z.object({
  tipo: z.enum(["produto", "servico"]),
  codigo: z.string().max(50).optional().or(z.literal("")),
  nome: z.string().trim().min(2, "Nome obrigatório").max(200),
  descricao: z.string().max(1000).optional().or(z.literal("")),
  unidade: z.string().trim().min(1, "Unidade obrigatória").max(10),
  preco_base: z.number().min(0),
  custo: z.number().min(0),
  categoria: z.string().max(80).optional().or(z.literal("")),
});

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function ProdutosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, hasRole } = useUserRoles(user?.id);
  const canEdit = isAdmin || hasRole("gerente") || hasRole("vendedor");
  const canDelete = isAdmin;

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | ProductType>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const productsQ = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await productsService.list()) as Product[],
  });

  const filtered = useMemo(() => {
    const list = productsQ.data ?? [];
    return list.filter((p) => {
      if (tipoFilter !== "todos" && p.tipo !== tipoFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${p.nome} ${p.codigo ?? ""} ${p.categoria ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [productsQ.data, search, tipoFilter]);

  const stats = useMemo(() => {
    const list = productsQ.data ?? [];
    return {
      total: list.length,
      produtos: list.filter((p) => p.tipo === "produto").length,
      servicos: list.filter((p) => p.tipo === "servico").length,
      ativos: list.filter((p) => p.ativo).length,
    };
  }, [productsQ.data]);

  const toggleMut = useMutation({
    mutationFn: (p: Product) => productsService.setAtivo(p.id, !p.ativo),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      toast.success("Produto excluído");
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setDialogOpen(true);
  }

  return (
    <AppShell title="Produtos e Serviços">
      <PageHeader
        title="Produtos e Serviços"
        description="Catálogo de itens usados em orçamentos e pedidos."
      >
        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo item
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total" value={stats.total.toString()} />
        <StatCard label="Produtos" value={stats.produtos.toString()} />
        <StatCard label="Serviços" value={stats.servicos.toString()} />
        <StatCard label="Ativos" value={stats.ativos.toString()} />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou categoria"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={tipoFilter} onValueChange={(v) => setTipoFilter(v as typeof tipoFilter)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="produto">Produtos</TabsTrigger>
              <TabsTrigger value="servico">Serviços</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {productsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Nenhum item encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.codigo ?? "—"}</TableCell>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>
                      <Badge variant={p.tipo === "servico" ? "secondary" : "outline"}>
                        {p.tipo === "servico" ? "Serviço" : "Produto"}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.categoria ?? "—"}</TableCell>
                    <TableCell>{p.unidade}</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(Number(p.preco_base))}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? "default" : "destructive"}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => toggleMut.mutate(p)} title={p.ativo ? "Inativar" : "Ativar"}>
                              <Power className={`h-4 w-4 ${p.ativo ? "text-destructive" : "text-primary"}`} />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(p)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <ProductFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          userId={user?.id}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item <strong>{deleting?.nome}</strong> será removido do catálogo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMut.mutate(deleting.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

type ProductForm = {
  tipo: ProductType;
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  preco_base: number;
  custo: number;
  categoria: string;
};

function ProductFormDialog({
  open, onOpenChange, editing, userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Product | null;
  userId?: string;
}) {
  const qc = useQueryClient();

  const defaults: ProductForm = {
    tipo: editing?.tipo ?? "produto",
    codigo: editing?.codigo ?? "",
    nome: editing?.nome ?? "",
    descricao: editing?.descricao ?? "",
    unidade: editing?.unidade ?? "un",
    preco_base: Number(editing?.preco_base ?? 0),
    custo: Number(editing?.custo ?? 0),
    categoria: editing?.categoria ?? "",
  };

  const sections: SectionConfig<ProductForm>[] = [
    {
      fields: [
        {
          name: "tipo",
          label: "Tipo *",
          type: "select",
          options: [
            { value: "produto", label: "Produto" },
            { value: "servico", label: "Serviço" },
          ],
        },
        { name: "codigo", label: "Código (SKU)", placeholder: "Ex.: BC-4x0-90g" },
        {
          name: "nome",
          label: "Nome *",
          colSpan: 2,
          placeholder: "Ex.: Cartão de visita 4x0 - 90g",
        },
        {
          name: "descricao",
          label: "Descrição",
          type: "textarea",
          rows: 2,
          colSpan: 2,
        },
        {
          name: "unidade",
          label: "Unidade *",
          placeholder: "un, mil, m², h",
          inputProps: { maxLength: 10 },
        },
        {
          name: "categoria",
          label: "Categoria",
          placeholder: "Ex.: Impressão offset",
        },
        { name: "preco_base", label: "Preço base (R$) *", type: "number" },
        { name: "custo", label: "Custo (R$)", type: "number" },
      ],
    },
  ];

  const saveMut = useMutation({
    mutationFn: async (values: ProductForm) => {
      const payload = {
        tipo: values.tipo,
        codigo: values.codigo || null,
        nome: values.nome.trim(),
        descricao: values.descricao || null,
        unidade: values.unidade.trim(),
        preco_base: values.preco_base,
        custo: values.custo,
        categoria: values.categoria || null,
      };
      if (editing) {
        await productsService.update(editing.id, payload);
      } else {
        await productsService.create({ ...payload, created_by: userId });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Item atualizado" : "Item cadastrado");
      qc.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <EntityFormDialog<ProductForm>
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar item" : "Novo item"}
      description="Cadastro do catálogo de produtos e serviços."
      schema={schema}
      defaultValues={defaults}
      sections={sections}
      submitLabel={editing ? "Salvar alterações" : "Salvar"}
      isSubmitting={saveMut.isPending}
      onSubmit={(values) => saveMut.mutate(values)}
    />
  );
}
