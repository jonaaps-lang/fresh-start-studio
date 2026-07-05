import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, Eye, FileText, Trash2, Printer, FileDown, Wallet } from "lucide-react";
import { printOrder } from "@/lib/document-print";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ordersService } from "@/services";
import { useAuth, useUserRoles } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/pedidos")({
  component: PedidosPage,
});

type OrderStatus = "aberto" | "em_producao" | "concluido" | "entregue" | "cancelado";

type Order = {
  id: string;
  numero: string;
  quote_id: string | null;
  customer_id: string;
  status: OrderStatus;
  data_emissao: string;
  prazo_entrega: string | null;
  data_entrega: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  assinatura_nome: string | null;
  assinatura_cargo: string | null;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  created_at: string;
  customers?: { nome: string } | null;
  quotes?: { numero: string } | null;
};

type OrderItem = {
  id: string;
  ordem: number;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  preco_unitario: number;
  desconto: number;
  total: number;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  aberto: "Aberto",
  em_producao: "Em produção",
  concluido: "Concluído",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<OrderStatus, "secondary" | "default" | "destructive" | "outline"> = {
  aberto: "secondary",
  em_producao: "default",
  concluido: "default",
  entregue: "outline",
  cancelado: "destructive",
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function PedidosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, hasRole } = useUserRoles(user?.id);
  const canDelete = isAdmin || hasRole("gerente");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | OrderStatus>("todos");
  const [viewing, setViewing] = useState<Order | null>(null);

  const ordersQ = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await ordersService.list()) as unknown as Order[],
  });

  const itemsQ = useQuery({
    queryKey: ["order_items", viewing?.id],
    enabled: !!viewing?.id,
    queryFn: async () => (await ordersService.listItems(viewing!.id)) as OrderItem[],
  });

  const filtered = useMemo(() => {
    const list = ordersQ.data ?? [];
    return list.filter((o) => {
      if (statusFilter !== "todos" && o.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${o.numero} ${o.customers?.nome ?? ""} ${o.quotes?.numero ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [ordersQ.data, search, statusFilter]);

  const stats = useMemo(() => {
    const list = ordersQ.data ?? [];
    return {
      total: list.length,
      abertos: list.filter((o) => o.status === "aberto").length,
      producao: list.filter((o) => o.status === "em_producao").length,
      entregues: list.filter((o) => o.status === "entregue").length,
      valorTotal: list
        .filter((o) => o.status !== "cancelado")
        .reduce((s, o) => s + Number(o.total || 0), 0),
    };
  }, [ordersQ.data]);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.setStatus(id, status),
    onSuccess: (_r, vars) => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
      // Ao entrar em produção, o gatilho de banco pode ter gerado
      // automaticamente as Contas a Receber (se a config estiver ativa).
      if (vars.status === "em_producao") {
        qc.invalidateQueries({ queryKey: ["finance_titles"] });
        toast.info("Se a geração automática de Contas a Receber estiver ativa, o título foi criado.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const arMut = useMutation({
    mutationFn: (id: string) => ordersService.generateAR(id),
    onSuccess: (titleId) => {
      qc.invalidateQueries({ queryKey: ["finance_titles"] });
      if (titleId) toast.success("Contas a receber geradas para este pedido.");
      else toast.info("Geração automática está desativada nas Configurações › Financeiro.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ordersService.remove(id),
    onSuccess: () => {
      toast.success("Pedido excluído");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Pedidos">
      <PageHeader
        title="Pedidos"
        description="Pedidos convertidos a partir de orçamentos aprovados."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total" value={stats.total.toString()} />
        <StatCard label="Abertos" value={stats.abertos.toString()} />
        <StatCard label="Em produção" value={stats.producao.toString()} />
        <StatCard label="Valor total" value={fmtBRL(stats.valorTotal)} />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou orçamento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="aberto">Abertos</TabsTrigger>
              <TabsTrigger value="em_producao">Produção</TabsTrigger>
              <TabsTrigger value="concluido">Concluídos</TabsTrigger>
              <TabsTrigger value="entregue">Entregues</TabsTrigger>
              <TabsTrigger value="cancelado">Cancelados</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {ordersQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum pedido encontrado. Aprove um orçamento e clique em "Converter em pedido".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.numero}</TableCell>
                    <TableCell>{o.customers?.nome ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{o.quotes?.numero ?? "—"}</TableCell>
                    <TableCell>{new Date(o.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{o.prazo_entrega ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={(v) => statusMut.mutate({ id: o.id, status: v as OrderStatus })}
                      >
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue>
                            <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(Number(o.total))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewing(o)} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => printOrder(o.id, true)} title="Imprimir">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => printOrder(o.id, false)} title="Exportar PDF">
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Gerar Contas a Receber"
                          disabled={arMut.isPending}
                          onClick={() => arMut.mutate(o.id)}
                        >
                          <Wallet className="h-4 w-4 text-primary" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost" size="icon" title="Excluir"
                            onClick={() => {
                              if (confirm(`Excluir pedido ${o.numero}?`)) deleteMut.mutate(o.id);
                            }}
                          >
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

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> {viewing.numero}
                </DialogTitle>
                <DialogDescription>{viewing.customers?.nome}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Status: </span>
                    <Badge variant={STATUS_VARIANT[viewing.status]}>{STATUS_LABEL[viewing.status]}</Badge>
                  </div>
                  <div><span className="text-muted-foreground">Emissão: </span>
                    {new Date(viewing.data_emissao).toLocaleDateString("pt-BR")}
                  </div>
                  <div><span className="text-muted-foreground">Prazo: </span>{viewing.prazo_entrega ?? "—"}</div>
                  <div><span className="text-muted-foreground">Orçamento: </span>{viewing.quotes?.numero ?? "—"}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Pagamento: </span>{viewing.condicoes_pagamento ?? "—"}</div>
                  {viewing.observacoes && (
                    <div className="col-span-2"><span className="text-muted-foreground">Obs.: </span>{viewing.observacoes}</div>
                  )}
                  {(viewing.assinatura_nome || viewing.assinatura_cargo) && (
                    <div className="col-span-2"><span className="text-muted-foreground">Assinatura: </span>{[viewing.assinatura_nome, viewing.assinatura_cargo].filter(Boolean).join(" — ")}</div>
                  )}
                </div>
                <div>
                  <div className="mb-1 font-medium">Itens</div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(itemsQ.data ?? []).map((it) => (
                          <TableRow key={it.id}>
                            <TableCell>{it.descricao}</TableCell>
                            <TableCell className="text-right">{it.quantidade} {it.unidade}</TableCell>
                            <TableCell className="text-right">{fmtBRL(Number(it.preco_unitario))}</TableCell>
                            <TableCell className="text-right">{fmtBRL(Number(it.total))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="flex justify-end gap-4 border-t pt-3">
                  <div className="text-sm text-muted-foreground">Subtotal: {fmtBRL(Number(viewing.subtotal))}</div>
                  <div className="text-sm text-muted-foreground">Desc.: {fmtBRL(Number(viewing.desconto))}</div>
                  <div className="text-sm text-muted-foreground">Acr.: {fmtBRL(Number(viewing.acrescimo))}</div>
                  <div className="text-base font-semibold">Total: {fmtBRL(Number(viewing.total))}</div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => printOrder(viewing.id, false)}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
                  </Button>
                  <Button size="sm" onClick={() => printOrder(viewing.id, true)}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
