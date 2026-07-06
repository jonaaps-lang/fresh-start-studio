import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, Search, Pencil, Trash2, FileText, CheckCircle2,
  XCircle, Copy, Eye, PackageCheck, Printer, FileDown, MessageCircle,
} from "lucide-react";
import { printQuote } from "@/lib/document-print";
import { z } from "zod";


import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { quotesService, customersService, productsService, settingsService } from "@/services";
import { EntityFormDialog, type SectionConfig } from "@/components/entity-form-dialog";
import { useAuth, useUserRoles } from "@/hooks/use-auth";

type ProductLite = {
  id: string;
  nome: string;
  codigo: string | null;
  unidade: string;
  preco_base: number;
};


export const Route = createFileRoute("/_authenticated/orcamentos")({
  component: OrcamentosPage,
});

type QuoteStatus =
  | "rascunho"
  | "nao_enviado"
  | "enviado"
  | "pendente"
  | "aprovado"
  | "rejeitado"
  | "convertido"
  | "cancelado";

type QuoteItem = {
  id?: string;
  ordem: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  desconto: number;
  total: number;
};

type Quote = {
  id: string;
  numero: string;
  customer_id: string;
  status: QuoteStatus;
  data_emissao: string;
  data_validade: string | null;
  prazo_entrega: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  assinatura_nome: string | null;
  assinatura_cargo: string | null;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  created_at: string;
  customers?: { nome: string; whatsapp?: string | null; telefone?: string | null } | null;
};

type CustomerLite = { id: string; nome: string; ativo: boolean };

const STATUS_LABEL: Record<QuoteStatus, string> = {
  rascunho: "Rascunho",
  nao_enviado: "Não Enviado",
  enviado: "Enviado",
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  convertido: "Convertido",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<QuoteStatus, "secondary" | "default" | "destructive" | "outline"> = {
  rascunho: "outline",
  nao_enviado: "secondary",
  enviado: "default",
  pendente: "secondary",
  aprovado: "default",
  rejeitado: "destructive",
  convertido: "default",
  cancelado: "destructive",
};

/** Status considerados "ainda não enviados" — usados para auto-transição para "Enviado". */
const PRE_SEND_STATUSES: QuoteStatus[] = ["rascunho", "nao_enviado", "pendente"];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function sendQuoteWhatsApp(q: Quote) {
  const raw = q.customers?.whatsapp || q.customers?.telefone || "";
  const digits = raw.replace(/\D/g, "");
  const phone = digits
    ? (digits.startsWith("55") ? digits : `55${digits}`)
    : "";
  const link = `${window.location.origin}/orcamentos`;
  const cliente = q.customers?.nome ?? "Cliente";
  const total = fmtBRL(Number(q.total));
  const msg =
    `Olá, ${cliente}!\n\n` +
    `Segue o orçamento *${q.numero}* no valor de *${total}*.\n\n` +
    `Prévia: ${link}\n\n` +
    `Qualquer dúvida estamos à disposição.\n— Express Print`;
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  if (!phone) {
    toast.warning("Cliente sem WhatsApp cadastrado — abrindo WhatsApp sem número.");
  }
  window.open(url, "_blank", "noopener,noreferrer");
}


const itemSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(300),
  quantidade: z.number().min(0.001, "Qtd > 0"),
  unidade: z.string().trim().max(10),
  preco_unitario: z.number().min(0),
  desconto: z.number().min(0),
});

const quoteSchema = z.object({
  customer_id: z.string().uuid("Selecione um cliente"),
  status: z.enum([
    "rascunho",
    "nao_enviado",
    "enviado",
    "pendente",
    "aprovado",
    "rejeitado",
    "convertido",
    "cancelado",
  ]),
  data_emissao: z.string().min(1, "Data obrigatória"),
  data_validade: z.string().optional().or(z.literal("")),
  prazo_entrega: z.string().max(120).optional().or(z.literal("")),
  condicoes_pagamento: z.string().max(300).optional().or(z.literal("")),
  observacoes: z.string().max(2000).optional().or(z.literal("")),
  assinatura_nome: z.string().max(120).optional().or(z.literal("")),
  assinatura_cargo: z.string().max(120).optional().or(z.literal("")),
  desconto: z.number().min(0),
  acrescimo: z.number().min(0),
  items: z.array(itemSchema).min(1, "Adicione ao menos 1 item"),
});

function emptyItem(ordem = 0): QuoteItem {
  return { ordem, descricao: "", quantidade: 1, unidade: "un", preco_unitario: 0, desconto: 0, total: 0 };
}

function calcItemTotal(it: QuoteItem) {
  return Math.max(0, (it.quantidade || 0) * (it.preco_unitario || 0) - (it.desconto || 0));
}

function OrcamentosPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, hasRole } = useUserRoles(user?.id);
  const canDelete = isAdmin || hasRole("gerente");


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendentes" | "aprovados" | QuoteStatus>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [viewing, setViewing] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState<Quote | null>(null);

  const quotesQ = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => (await quotesService.list()) as unknown as Quote[],
  });

  const customersQ = useQuery({
    queryKey: ["customers", "lite"],
    queryFn: async () => (await customersService.listLite()) as CustomerLite[],
  });

  const productsQ = useQuery({
    queryKey: ["products", "lite"],
    queryFn: async () => (await productsService.listLite()) as ProductLite[],
  });

  const itemsQ = useQuery({
    queryKey: ["quote_items", editing?.id ?? viewing?.id],
    enabled: !!(editing?.id || viewing?.id),
    queryFn: async () => {
      const id = (editing?.id ?? viewing?.id)!;
      return (await quotesService.listItems(id)) as QuoteItem[];
    },
  });

  const filtered = useMemo(() => {
    const list = quotesQ.data ?? [];
    return list.filter((q) => {
      if (
        statusFilter === "pendentes" &&
        !["rascunho", "nao_enviado", "enviado", "pendente"].includes(q.status)
      )
        return false;
      if (statusFilter === "aprovados" && !["aprovado", "convertido"].includes(q.status)) return false;
      if (!["todos", "pendentes", "aprovados"].includes(statusFilter) && q.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${q.numero} ${q.customers?.nome ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [quotesQ.data, search, statusFilter]);

  const stats = useMemo(() => {
    const list = quotesQ.data ?? [];
    const pendentes = list.filter((q) =>
      ["rascunho", "nao_enviado", "enviado", "pendente"].includes(q.status),
    );
    const aprovados = list.filter((q) => ["aprovado", "convertido"].includes(q.status));
    return {
      total: list.length,
      pendentes: pendentes.length,
      aprovados: aprovados.length,
      valorAprovado: aprovados.reduce((s, q) => s + Number(q.total || 0), 0),
    };
  }, [quotesQ.data]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => quotesService.remove(id),
    onSuccess: () => {
      toast.success("Orçamento excluído");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      quotesService.setStatus(id, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: async (q: Quote) => {
      const numero = await quotesService.nextNumber();
      const items = await quotesService.listItems(q.id);
      const newId = await quotesService.create({
        numero,
        customer_id: q.customer_id,
        status: "rascunho",
        data_emissao: new Date().toISOString().slice(0, 10),
        data_validade: q.data_validade,
        prazo_entrega: q.prazo_entrega,
        condicoes_pagamento: q.condicoes_pagamento,
        observacoes: q.observacoes,
        assinatura_nome: q.assinatura_nome,
        assinatura_cargo: q.assinatura_cargo,
        subtotal: q.subtotal,
        desconto: q.desconto,
        acrescimo: q.acrescimo,
        total: q.total,
        created_by: user?.id,
      });
      if (items.length) {
        await quotesService.insertItems(
          items.map((it) => ({
            quote_id: newId,
            ordem: it.ordem,
            descricao: it.descricao,
            quantidade: it.quantidade,
            unidade: it.unidade,
            preco_unitario: it.preco_unitario,
            desconto: it.desconto,
            total: it.total,
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Orçamento duplicado");
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertMut = useMutation({
    mutationFn: (q: Quote) => quotesService.convertToOrder(q.id),
    onSuccess: () => {
      toast.success("Orçamento convertido em pedido");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      navigate({ to: "/pedidos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  /**
   * Marca o orçamento como "enviado" automaticamente ao gerar PDF, imprimir
   * ou enviar por WhatsApp — desde que ainda esteja em algum status anterior
   * a "enviado". Executa em background e não bloqueia a ação do usuário.
   */
  function markAsSent(q: Quote) {
    if (!PRE_SEND_STATUSES.includes(q.status)) return;
    quotesService.setStatus(q.id, "enviado").then(() => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
    }).catch(() => { /* silencioso — a ação principal já ocorreu */ });
  }

  function handlePrint(q: Quote, print: boolean) {
    printQuote(q.id, print);
    markAsSent(q);
  }

  function handleWhatsApp(q: Quote) {
    sendQuoteWhatsApp(q);
    markAsSent(q);
  }



  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(q: Quote) {
    setEditing(q);
    setDialogOpen(true);
  }

  return (
    <AppShell title="Orçamentos">
      <PageHeader title="Orçamentos" description="Emissão e gestão de orçamentos.">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo orçamento
        </Button>
      </PageHeader>


      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total" value={stats.total.toString()} />
        <StatCard label="Pendentes" value={stats.pendentes.toString()} />
        <StatCard label="Aprovados" value={stats.aprovados.toString()} />
        <StatCard label="Valor aprovado" value={fmtBRL(stats.valorAprovado)} />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              <TabsTrigger value="enviado">Enviados</TabsTrigger>
              <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
              <TabsTrigger value="rejeitado">Rejeitados</TabsTrigger>
              <TabsTrigger value="cancelado">Cancelados</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {quotesQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum orçamento encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.numero}</TableCell>
                    <TableCell>{q.customers?.nome ?? "—"}</TableCell>
                    <TableCell>{new Date(q.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {q.data_validade ? new Date(q.data_validade).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(Number(q.total))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewing(q)} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(q, true)} title="Imprimir">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(q, false)} title="Exportar PDF">
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(q)} title="Enviar por WhatsApp">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => duplicateMut.mutate(q)} title="Duplicar">
                          <Copy className="h-4 w-4" />
                        </Button>
                        {["nao_enviado", "enviado", "pendente"].includes(q.status) && (
                          <Button
                            variant="ghost" size="icon" title="Aprovar"
                            onClick={() => statusMut.mutate({ id: q.id, status: "aprovado" })}
                          >
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {q.status === "aprovado" && (
                          <Button
                            variant="ghost" size="icon" title="Converter em pedido"
                            disabled={convertMut.isPending}
                            onClick={() => convertMut.mutate(q)}
                          >
                            <PackageCheck className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {["rascunho", "nao_enviado", "enviado", "pendente"].includes(q.status) && (
                          <Button
                            variant="ghost" size="icon" title="Rejeitar"
                            onClick={() => statusMut.mutate({ id: q.id, status: "rejeitado" })}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(q)} title="Excluir">
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
        <QuoteFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          existingItems={editing?.id ? itemsQ.data ?? [] : []}
          customers={customersQ.data ?? []}
          products={productsQ.data ?? []}

          userId={user?.id}
        />
      )}

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
                  <div><span className="text-muted-foreground">Status: </span><Badge variant={STATUS_VARIANT[viewing.status]}>{STATUS_LABEL[viewing.status]}</Badge></div>
                  <div><span className="text-muted-foreground">Emissão: </span>{new Date(viewing.data_emissao).toLocaleDateString("pt-BR")}</div>
                  <div><span className="text-muted-foreground">Validade: </span>{viewing.data_validade ? new Date(viewing.data_validade).toLocaleDateString("pt-BR") : "—"}</div>
                  <div><span className="text-muted-foreground">Prazo: </span>{viewing.prazo_entrega ?? "—"}</div>
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
                <div className="flex justify-end gap-6 text-sm">
                  <div>Subtotal: <strong>{fmtBRL(Number(viewing.subtotal))}</strong></div>
                  <div>Desconto: <strong>{fmtBRL(Number(viewing.desconto))}</strong></div>
                  <div>Acréscimo: <strong>{fmtBRL(Number(viewing.acrescimo))}</strong></div>
                  <div className="text-base">Total: <strong>{fmtBRL(Number(viewing.total))}</strong></div>
                </div>
                {viewing.observacoes && (
                  <div><div className="font-medium">Observações</div><p className="text-muted-foreground whitespace-pre-wrap">{viewing.observacoes}</p></div>
                )}
                {(viewing.assinatura_nome || viewing.assinatura_cargo) && (
                  <div><div className="font-medium">Assinatura</div><p className="text-muted-foreground">{[viewing.assinatura_nome, viewing.assinatura_cargo].filter(Boolean).join(" — ")}</p></div>
                )}
                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => handleWhatsApp(viewing)}>
                    <MessageCircle className="mr-2 h-4 w-4 text-green-600" /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint(viewing, false)}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
                  </Button>
                  <Button size="sm" onClick={() => handlePrint(viewing, true)}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento {deleting?.numero}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-semibold">{value}</div></CardContent>
    </Card>
  );
}

type QuoteFormValues = {
  customer_id: string;
  status: QuoteStatus;
  data_emissao: string;
  data_validade: string;
  prazo_entrega: string;
  condicoes_pagamento: string;
  observacoes: string;
  assinatura_nome: string;
  assinatura_cargo: string;
  desconto: number;
  acrescimo: number;
  items: QuoteItem[];
};

function QuoteFormDialog({
  open, onOpenChange, editing, existingItems, customers, products, userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Quote | null;
  existingItems: QuoteItem[];
  customers: CustomerLite[];
  products: ProductLite[];
  userId?: string;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const defaultValues: QuoteFormValues = useMemo(() => ({
    customer_id: editing?.customer_id ?? "",
    status: editing?.status ?? "rascunho",
    data_emissao: editing?.data_emissao ?? today,
    data_validade: editing?.data_validade ?? "",
    prazo_entrega: editing?.prazo_entrega ?? "",
    condicoes_pagamento: editing?.condicoes_pagamento ?? "",
    observacoes: editing?.observacoes ?? "",
    assinatura_nome: editing?.assinatura_nome ?? "",
    assinatura_cargo: editing?.assinatura_cargo ?? "",
    desconto: Number(editing?.desconto ?? 0),
    acrescimo: Number(editing?.acrescimo ?? 0),
    items: editing && existingItems.length
      ? existingItems.map((it) => ({
          ...it,
          quantidade: Number(it.quantidade),
          preco_unitario: Number(it.preco_unitario),
          desconto: Number(it.desconto),
          total: Number(it.total),
        }))
      : [emptyItem()],
  }), [editing, existingItems, today]);

  const saveMut = useMutation({
    mutationFn: async (v: QuoteFormValues) => {
      const cleanItems = v.items.map((it, i) => ({ ...it, ordem: i, total: calcItemTotal(it) }));
      const subtotal = cleanItems.reduce((s, it) => s + it.total, 0);
      // Regra da Fase 7: salvar sem imprimir/PDF/e-mail promove para "Não Enviado".
      const nextStatus: QuoteStatus =
        !editing && v.status === "rascunho" ? "nao_enviado" : v.status;
      const total = Math.max(0, subtotal - v.desconto + v.acrescimo);

      const payload = {
        customer_id: v.customer_id,
        status: nextStatus,
        data_emissao: v.data_emissao,
        data_validade: v.data_validade || null,
        prazo_entrega: v.prazo_entrega || null,
        condicoes_pagamento: v.condicoes_pagamento || null,
        observacoes: v.observacoes || null,
        assinatura_nome: v.assinatura_nome || null,
        assinatura_cargo: v.assinatura_cargo || null,
        subtotal,
        desconto: v.desconto,
        acrescimo: v.acrescimo,
        total,
      };

      let quoteId = editing?.id;
      if (editing) {
        await quotesService.update(editing.id, payload);
      } else {
        const numero = await quotesService.nextNumber();
        quoteId = await quotesService.create({ ...payload, numero, created_by: userId });
      }
      await quotesService.replaceItems(
        quoteId!,
        cleanItems.map((it) => ({
          quote_id: quoteId!,
          ordem: it.ordem,
          descricao: it.descricao,
          quantidade: it.quantidade,
          unidade: it.unidade || "un",
          preco_unitario: it.preco_unitario,
          desconto: it.desconto,
          total: it.total,
        })),
      );
    },
    onSuccess: () => {
      toast.success(editing ? "Orçamento atualizado" : "Orçamento criado");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote_items"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Motor de Configuração: lê os prazos rápidos e a validade padrão em documentos
  const docsSettingsQ = useQuery({
    queryKey: ["settings", "documentos"],
    queryFn: () => settingsService.get("documentos"),
    staleTime: 5 * 60 * 1000,
  });
  const prazosRapidos = docsSettingsQ.data?.prazos_validade_disponiveis ?? [15, 30, 60, 90];

  const statusOptions = (Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => ({
    value: s, label: STATUS_LABEL[s],
  }));
  const customerOptions = customers.map((c) => ({ value: c.id, label: c.nome }));

  const sections: SectionConfig<QuoteFormValues>[] = [
    {
      columns: 2,
      fields: [
        { name: "customer_id", label: "Cliente *", type: "select", options: customerOptions },
        { name: "status", label: "Status", type: "select", options: statusOptions },
        { name: "data_emissao", label: "Data emissão *", type: "date" },
        { name: "data_validade", label: "Data validade", type: "date" },
        { name: "prazo_entrega", label: "Prazo de entrega", placeholder: "Ex: 5 dias úteis" },
        { name: "condicoes_pagamento", label: "Condições de pagamento", placeholder: "Ex: 50% entrada / 50% entrega" },
      ],
    },
    {
      columns: 1,
      fields: [
        {
          name: "data_validade",
          label: "Atalhos de validade",
          type: "custom",
          render: ({ values, setField }) => (
            <div className="flex flex-wrap items-center gap-2">
              {prazosRapidos.map((dias) => (
                <Button
                  key={dias}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const base = values.data_emissao ? new Date(values.data_emissao) : new Date();
                    const d = new Date(base);
                    d.setDate(d.getDate() + dias);
                    setField("data_validade", d.toISOString().slice(0, 10));
                  }}
                >
                  {dias} dias
                </Button>
              ))}
              <span className="text-xs text-muted-foreground">
                Aplica automaticamente à data de validade.
              </span>
            </div>
          ),
        },
      ],
    },
    {
      columns: 1,
      fields: [
        {
          name: "items",
          label: "",
          type: "custom",
          render: ({ values, setField }) => (
            <QuoteItemsEditor
              items={values.items}
              products={products}
              onChange={(items) => setField("items", items)}
            />
          ),
        },
      ],
    },
    {
      columns: 3,
      fields: [
        { name: "desconto", label: "Desconto (R$)", type: "number" },
        { name: "acrescimo", label: "Acréscimo (R$)", type: "number" },
        {
          name: "acrescimo", // reused key just to satisfy typing; render is custom & read-only
          label: "Total",
          type: "custom",
          render: ({ values }) => {
            const subtotal = values.items.reduce((s: number, it: QuoteItem) => s + calcItemTotal(it), 0);
            const total = Math.max(0, subtotal - (values.desconto || 0) + (values.acrescimo || 0));
            return (
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-base font-semibold">
                {fmtBRL(total)}
              </div>
            );
          },
        },
      ],
    },
    {
      columns: 1,
      fields: [
        { name: "observacoes", label: "Observações", type: "textarea", rows: 3 },
      ],
    },
    {
      columns: 2,
      fields: [
        { name: "assinatura_nome", label: "Assinatura — Nome (opcional)", placeholder: "Ex.: João Silva", inputProps: { maxLength: 120 } },
        { name: "assinatura_cargo", label: "Assinatura — Cargo (opcional)", placeholder: "Ex.: Responsável Comercial", inputProps: { maxLength: 120 } },
      ],
    },
  ];

  return (
    <EntityFormDialog<QuoteFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Editar ${editing.numero}` : "Novo orçamento"}
      description="Preencha os dados, itens e valores."
      schema={quoteSchema}
      defaultValues={defaultValues}
      sections={sections}
      onSubmit={(v) => saveMut.mutate(v)}
      isSubmitting={saveMut.isPending}
      maxWidthClassName="sm:max-w-4xl"
    />
  );
}

function QuoteItemsEditor({
  items, products, onChange,
}: {
  items: QuoteItem[];
  products: ProductLite[];
  onChange: (items: QuoteItem[]) => void;
}) {
  function update(idx: number, patch: Partial<QuoteItem>) {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    next[idx].total = calcItemTotal(next[idx]);
    onChange(next);
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Itens</Label>
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => onChange([...items, emptyItem(items.length)])}
        >
          <Plus className="mr-1 h-4 w-4" /> Adicionar item
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Descrição</TableHead>
              <TableHead className="w-24">Qtd</TableHead>
              <TableHead className="w-20">Un.</TableHead>
              <TableHead className="w-32">Preço unit.</TableHead>
              <TableHead className="w-28">Desc.</TableHead>
              <TableHead className="w-32 text-right">Total</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, i) => (
              <TableRow key={i}>
                <TableCell>
                  <ProductPicker
                    value={it.descricao}
                    products={products}
                    onChange={(descricao) => update(i, { descricao })}
                    onSelect={(p) => update(i, {
                      descricao: p.nome,
                      unidade: p.unidade,
                      preco_unitario: Number(p.preco_base),
                    })}
                  />
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.001" value={it.quantidade}
                    onChange={(e) => update(i, { quantidade: Number(e.target.value) })} />
                </TableCell>
                <TableCell>
                  <Input value={it.unidade} onChange={(e) => update(i, { unidade: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.01" value={it.preco_unitario}
                    onChange={(e) => update(i, { preco_unitario: Number(e.target.value) })} />
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.01" value={it.desconto}
                    onChange={(e) => update(i, { desconto: Number(e.target.value) })} />
                </TableCell>
                <TableCell className="text-right font-medium">{fmtBRL(calcItemTotal(it))}</TableCell>
                <TableCell>
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => items.length > 1 && onChange(items.filter((_, x) => x !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


function ProductPicker({
  value, products, onChange, onSelect,
}: {
  value: string;
  products: ProductLite[];
  onChange: (v: string) => void;
  onSelect: (p: ProductLite) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Digite ou selecione um produto/serviço"
          autoComplete="off"
        />
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[360px]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter>
          <CommandInput placeholder="Buscar no catálogo..." />
          <CommandList>
            <CommandEmpty>Nenhum item no catálogo.</CommandEmpty>
            <CommandGroup heading="Catálogo">
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.nome} ${p.codigo ?? ""}`}
                  onSelect={() => {
                    onSelect(p);
                    setOpen(false);
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.nome}</div>
                      {p.codigo && (
                        <div className="truncate text-xs text-muted-foreground">{p.codigo}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.preco_base) || 0)} / {p.unidade}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

