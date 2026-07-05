import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Printer, Trash2, Wallet, TrendingDown, TrendingUp } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityPicker, type EntityOption } from "@/components/entity-picker";

import {
  customersService,
  suppliersService,
  financeService,
  settingsService,
} from "@/services";
import { usePermissions } from "@/hooks/use-permissions";
import { printFinanceTitle } from "@/lib/documents";
import type { FinanceTipo, FinanceCategoriaTipo } from "@/domain/finance";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—";

function FinanceiroPage() {
  return (
    <AppShell title="Financeiro">
      <PageHeader title="Financeiro" description="Contas a receber, a pagar, fluxo de caixa e categorias." />
      <Tabs defaultValue="receber">
        <TabsList>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="receber" className="mt-4"><TitlesTab tipo="receivable" /></TabsContent>
        <TabsContent value="pagar" className="mt-4"><TitlesTab tipo="payable" /></TabsContent>
        <TabsContent value="fluxo" className="mt-4"><CashflowTab /></TabsContent>
        <TabsContent value="categorias" className="mt-4"><CategoriesTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Títulos (a receber / a pagar) — mesma tela para ambos
// ---------------------------------------------------------------------------
function TitlesTab({ tipo }: { tipo: FinanceTipo }) {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [openNew, setOpenNew] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["finance", "titles", tipo],
    queryFn: () => financeService.listTitles(tipo),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => financeService.remove(id),
    onSuccess: () => {
      toast.success("Título removido");
      qc.invalidateQueries({ queryKey: ["finance", "titles", tipo] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalAberto = (q.data ?? []).reduce((acc, t) => acc + Number(t.saldo), 0);
  const totalGeral = (q.data ?? []).reduce((acc, t) => acc + Number(t.valor_total), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard icon={<Wallet className="h-4 w-4" />} label="Total emitido" value={fmtBRL(totalGeral)} />
        <SummaryCard
          icon={tipo === "receivable" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          label="Saldo em aberto"
          value={fmtBRL(totalAberto)}
        />
        <SummaryCard label="Títulos" value={String((q.data ?? []).length)} />
      </div>

      <div className="flex justify-end">
        {can("financeiro.create") && (
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo título
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {q.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>{tipo === "receivable" ? "Cliente" : "Fornecedor"}</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(q.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum título registrado.</TableCell></TableRow>
                ) : (
                  q.data!.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetailId(t.id)}>
                      <TableCell className="font-mono text-xs">{t.numero}</TableCell>
                      <TableCell>{t.customers?.nome ?? t.suppliers?.razao_social ?? "—"}</TableCell>
                      <TableCell>
                        {t.finance_categories?.nome ? (
                          <Badge variant="secondary">{t.finance_categories.nome}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{fmtDate(t.data_emissao)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(t.valor_total)}</TableCell>
                      <TableCell className="text-right">
                        {t.saldo <= 0 ? <Badge className="bg-emerald-500">Pago</Badge> : fmtBRL(t.saldo)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => printFinanceTitle(t.id)} title="Imprimir">
                          <Printer className="h-4 w-4" />
                        </Button>
                        {can("financeiro.delete") && (
                          <Button variant="ghost" size="sm" onClick={() => removeMut.mutate(t.id)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {openNew && <NewTitleDialog tipo={tipo} onClose={() => setOpenNew(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["finance", "titles", tipo] })} />}
      {detailId && <TitleDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pt-0"><div className="text-xl font-semibold">{value}</div></CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Novo título: usa EntityPicker + Motor de Configuração (parcelamento/vencimento)
// ---------------------------------------------------------------------------
function NewTitleDialog({ tipo, onClose, onCreated }: { tipo: FinanceTipo; onClose: () => void; onCreated: () => void }) {
  const qc = useQueryClient();
  const cfgQ = useQuery({ queryKey: ["settings", "financeiro"], queryFn: () => settingsService.get("financeiro") });
  const [partyId, setPartyId] = React.useState<string | null>(null);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [descricao, setDescricao] = React.useState("");
  const [valorTotal, setValorTotal] = React.useState<string>("");
  const [nParcelas, setNParcelas] = React.useState<number>(1);
  const [primeiraData, setPrimeiraData] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = React.useState("");

  React.useEffect(() => {
    if (cfgQ.data) {
      setNParcelas(cfgQ.data.parcelamento_padrao);
      const d = new Date();
      d.setDate(d.getDate() + cfgQ.data.vencimento_dias_padrao);
      setPrimeiraData(d.toISOString().slice(0, 10));
    }
  }, [cfgQ.data]);

  const parcelas = React.useMemo(() => {
    const total = Number(valorTotal || 0);
    if (!total || nParcelas < 1) return [];
    const base = new Date(primeiraData + "T00:00:00");
    const valorParcela = Math.round((total / nParcelas) * 100) / 100;
    const rows = Array.from({ length: nParcelas }).map((_, i) => {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i);
      return { vencimento: d.toISOString().slice(0, 10), valor: valorParcela };
    });
    // Ajuste centavos
    const diff = Math.round((total - valorParcela * nParcelas) * 100) / 100;
    rows[rows.length - 1].valor = Math.round((rows[rows.length - 1].valor + diff) * 100) / 100;
    return rows;
  }, [valorTotal, nParcelas, primeiraData]);

  const mut = useMutation({
    mutationFn: () =>
      financeService.create({
        tipo,
        customer_id: tipo === "receivable" ? partyId : null,
        supplier_id: tipo === "payable" ? partyId : null,
        category_id: categoryId,
        descricao: descricao || null,
        valor_total: Number(valorTotal),
        observacoes: obs || null,
        parcelas,
      }),
    onSuccess: () => {
      toast.success("Título criado");
      qc.invalidateQueries({ queryKey: ["finance"] });
      onCreated();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadParty = React.useCallback(
    async (search: string): Promise<EntityOption[]> => {
      const list = tipo === "receivable"
        ? await customersService.listLite()
        : (await suppliersService.list()).map((s) => ({ id: s.id, nome: s.razao_social }));
      return list
        .filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 40)
        .map((c) => ({ value: c.id, label: c.nome }));
    },
    [tipo],
  );

  const loadCategories = React.useCallback(async (search: string): Promise<EntityOption[]> => {
    const list = await financeService.listCategories(tipo === "receivable" ? "receita" : "despesa");
    return list
      .filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
      .map((c) => ({ value: c.id, label: c.nome }));
  }, [tipo]);

  const createCategoryInline = React.useCallback(
    async (term: string) => {
      const nome = term.trim();
      if (!nome) return;
      await financeService.createCategory({ tipo: tipo === "receivable" ? "receita" : "despesa", nome });
      const list = await financeService.listCategories(tipo === "receivable" ? "receita" : "despesa");
      const created = list.find((c) => c.nome === nome);
      if (created) return { value: created.id, label: created.nome };
    },
    [tipo],
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova conta a {tipo === "receivable" ? "receber" : "pagar"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>{tipo === "receivable" ? "Cliente" : "Fornecedor"}</Label>
            <EntityPicker
              value={partyId}
              onChange={(v) => setPartyId(v)}
              loadOptions={loadParty}
              cacheKey={tipo === "receivable" ? "customers" : "suppliers"}
              placeholder={tipo === "receivable" ? "Selecione o cliente…" : "Selecione o fornecedor…"}
            />
          </div>
          <div className="col-span-2">
            <Label>Categoria</Label>
            <EntityPicker
              value={categoryId}
              onChange={(v) => setCategoryId(v)}
              loadOptions={loadCategories}
              cacheKey={`fin-cat-${tipo}`}
              placeholder="Sem categoria"
              onCreateNew={createCategoryInline}
              createLabel="Cadastrar categoria"
            />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <Label>Valor total</Label>
            <Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
          </div>
          <div>
            <Label>Parcelas</Label>
            <Input type="number" min={1} max={48} value={nParcelas} onChange={(e) => setNParcelas(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div>
            <Label>Primeira parcela</Label>
            <Input type="date" value={primeiraData} onChange={(e) => setPrimeiraData(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
          {parcelas.length > 0 && (
            <div className="col-span-2 rounded-md border p-2 text-xs">
              <div className="mb-1 font-medium">Previsão de parcelas</div>
              {parcelas.map((p, i) => (
                <div key={i} className="flex justify-between py-0.5">
                  <span>{i + 1}. {fmtDate(p.vencimento)}</span>
                  <span>{fmtBRL(p.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !partyId || !valorTotal}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Detalhe do título + pagamentos
// ---------------------------------------------------------------------------
function TitleDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const titleQ = useQuery({ queryKey: ["finance", "title", id], queryFn: () => financeService.getTitle(id) });
  const instQ = useQuery({ queryKey: ["finance", "installments", id], queryFn: () => financeService.listInstallments(id) });
  const payQ = useQuery({ queryKey: ["finance", "payments", id], queryFn: () => financeService.listPayments(id) });
  const [paying, setPaying] = React.useState<string | null>(null);
  const [valor, setValor] = React.useState("");
  const [forma, setForma] = React.useState("dinheiro");
  const [dataPg, setDataPg] = React.useState(new Date().toISOString().slice(0, 10));

  const payMut = useMutation({
    mutationFn: () => financeService.applyPayment({ installment_id: paying!, valor: Number(valor), data: dataPg, forma }),
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setPaying(null); setValor("");
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = titleQ.data;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t?.numero ?? "…"} — {t?.customers?.nome ?? t?.suppliers?.razao_social ?? ""}
          </DialogTitle>
        </DialogHeader>
        {!t ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><span className="text-muted-foreground">Valor: </span>{fmtBRL(t.valor_total)}</div>
              <div><span className="text-muted-foreground">Saldo: </span>{fmtBRL(t.saldo)}</div>
              <div><span className="text-muted-foreground">Emissão: </span>{fmtDate(t.data_emissao)}</div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Parcelas</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead><TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(instQ.data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.numero_parcela}</TableCell>
                      <TableCell>{fmtDate(p.vencimento)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(p.valor)}</TableCell>
                      <TableCell className="text-right">{p.saldo <= 0 ? <Badge className="bg-emerald-500">Quitada</Badge> : fmtBRL(p.saldo)}</TableCell>
                      <TableCell className="text-right">
                        {p.saldo > 0 && can("financeiro.edit") && (
                          <Button size="sm" variant="outline" onClick={() => { setPaying(p.id); setValor(String(p.saldo)); }}>
                            Baixar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pagamentos</h4>
              {(payQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Forma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {payQ.data!.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{fmtDate(p.data_pagamento)}</TableCell>
                        <TableCell>{p.forma_pagamento ?? "—"}</TableCell>
                        <TableCell className="text-right">{fmtBRL(p.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => printFinanceTitle(id)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>

        {paying && (
          <Dialog open onOpenChange={(v) => !v && setPaying(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Valor</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
                <div><Label>Data</Label><Input type="date" value={dataPg} onChange={(e) => setDataPg(e.target.value)} /></div>
                <div>
                  <Label>Forma</Label>
                  <Select value={forma} onValueChange={setForma}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPaying(null)}>Cancelar</Button>
                <Button onClick={() => payMut.mutate()} disabled={payMut.isPending || !valor}>
                  {payMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Fluxo de caixa
// ---------------------------------------------------------------------------
function CashflowTab() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().slice(0, 10);
  const [from, setFrom] = React.useState(start);
  const [to, setTo] = React.useState(end);

  const q = useQuery({
    queryKey: ["finance", "cashflow", from, to],
    queryFn: () => financeService.cashflow({ from, to }),
  });

  const totals = (q.data ?? []).reduce(
    (acc, r) => ({
      receber: acc.receber + r.receber,
      pagar: acc.pagar + r.pagar,
      recebido: acc.recebido + r.recebido,
      pago: acc.pago + r.pago,
    }),
    { receber: 0, pagar: 0, recebido: 0, pago: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Previsto a receber" value={fmtBRL(totals.receber)} />
        <SummaryCard label="Previsto a pagar" value={fmtBRL(totals.pagar)} />
        <SummaryCard label="Recebido no período" value={fmtBRL(totals.recebido)} />
        <SummaryCard label="Pago no período" value={fmtBRL(totals.pago)} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">A receber</TableHead>
              <TableHead className="text-right">A pagar</TableHead>
              <TableHead className="text-right">Saldo previsto</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Pago</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Sem movimentação no período.</TableCell></TableRow>
              ) : (
                q.data!.map((r) => (
                  <TableRow key={r.data}>
                    <TableCell>{fmtDate(r.data)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(r.receber)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(r.pagar)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(r.receber - r.pagar)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{fmtBRL(r.recebido)}</TableCell>
                    <TableCell className="text-right text-rose-600">{fmtBRL(r.pago)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------
function CategoriesTab() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [tipo, setTipo] = React.useState<FinanceCategoriaTipo>("receita");
  const [nome, setNome] = React.useState("");

  const q = useQuery({
    queryKey: ["finance", "categories", tipo],
    queryFn: () => financeService.listCategories(tipo),
  });

  const createMut = useMutation({
    mutationFn: () => financeService.createCategory({ tipo, nome }),
    onSuccess: () => { setNome(""); toast.success("Categoria criada"); qc.invalidateQueries({ queryKey: ["finance", "categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => financeService.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "categories"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as FinanceCategoriaTipo)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {can("financeiro.create") && (
          <>
            <div className="flex-1 min-w-[200px]">
              <Label>Nova categoria</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da categoria" />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!nome || createMut.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">Nenhuma categoria.</TableCell></TableRow>
              ) : q.data!.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell>{c.ativo ? <Badge>Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {can("financeiro.delete") && (
                      <Button variant="ghost" size="sm" onClick={() => removeMut.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
