import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, PackageCheck, Wallet, Truck } from "lucide-react";

import { AppShell, PageHeader, PlaceholderPage } from "@/components/app-shell";
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { EntityPicker, type EntityOption } from "@/components/entity-picker";
import { QuickCreateDialog } from "@/components/quick-create-dialog";

import {
  purchasesService,
  suppliersService,
  productsService,
  settingsService,
  workflowService,
} from "@/services";
import { PURCHASE_ENTITY } from "@/domain/purchases";

export const Route = createFileRoute("/_authenticated/compras")({
  component: ComprasPage,
});

// ---------- Loaders para o Motor de Seletores Inteligentes -----------------
async function loadSuppliers(search: string): Promise<EntityOption[]> {
  const rows = await suppliersService.list();
  const term = search.trim().toLowerCase();
  return rows
    .filter((s) => !term || s.razao_social.toLowerCase().includes(term))
    .slice(0, 30)
    .map((s) => ({ value: s.id, label: s.razao_social, description: s.categoria ?? null }));
}
async function loadProducts(search: string): Promise<EntityOption[]> {
  const rows = await productsService.listLite();
  const term = search.trim().toLowerCase();
  return rows
    .filter((p) => !term || p.nome.toLowerCase().includes(term))
    .slice(0, 30)
    .map((p) => ({ value: p.id, label: p.nome, description: p.codigo ?? p.unidade }));
}

// ============================================================================
function ComprasPage() {
  const qc = useQueryClient();

  // --- Motor de Configuração: só exibe se `utiliza_compras` estiver ativo. ---
  const configQ = useQuery({
    queryKey: ["settings", "compras"],
    queryFn: () => settingsService.get("compras"),
  });

  const listQ = useQuery({
    queryKey: ["purchases"],
    queryFn: () => purchasesService.list(),
    enabled: configQ.data?.utiliza_compras !== false,
  });

  const [openNew, setOpenNew] = useState(false);
  const [receiving, setReceiving] = useState<string | null>(null);

  const receiveMut = useMutation({
    mutationFn: (id: string) => purchasesService.receive(id),
    onSuccess: (count) => {
      toast.success(count > 0 ? `Recebido — ${count} item(ns) baixado(s) em estoque.` : "Compra recebida.");
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setReceiving(null),
  });

  const apMut = useMutation({
    mutationFn: (id: string) => purchasesService.generateAP(id),
    onSuccess: (r) => {
      if (r) toast.success("Contas a Pagar gerada.");
      else toast.info("Nada a gerar (verifique configuração).");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (configQ.isLoading) {
    return (
      <AppShell title="Compras">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      </AppShell>
    );
  }

  if (configQ.data?.utiliza_compras === false) {
    return (
      <AppShell title="Compras">
        <PlaceholderPage
          title="Módulo de Compras desativado"
          description="Ative em Configurações → Compras para começar a registrar solicitações e pedidos de compra."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Compras">
      <PageHeader
        title="Compras"
        description="Solicitações, cotações, pedidos e recebimento — usando o Motor de Workflow."
      >
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova compra
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ordens de compra</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listQ.isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !listQ.data?.length ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma compra registrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.numero}</TableCell>
                    <TableCell>{p.suppliers?.razao_social ?? "—"}</TableCell>
                    <TableCell>{p.data_emissao}</TableCell>
                    <TableCell>
                      {p.data_recebimento ? (
                        <Badge variant="secondary">{p.data_recebimento}</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(p.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!p.data_recebimento && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={receiving === p.id}
                            onClick={() => { setReceiving(p.id); receiveMut.mutate(p.id); }}
                            title="Registrar recebimento"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!p.finance_title_id}
                          onClick={() => apMut.mutate(p.id)}
                          title="Gerar Contas a Pagar"
                        >
                          <Wallet className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewPurchaseDialog open={openNew} onOpenChange={setOpenNew} />
    </AppShell>
  );
}

// ============================================================================
// Novo cadastro — usa EntityPicker + QuickCreateDialog (cadastro contextual)
// ============================================================================
type ItemDraft = {
  product_id: string | null;
  product_label: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  desconto: number;
};

function NewPurchaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [dataEmissao, setDataEmissao] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataPrevista, setDataPrevista] = useState("");
  const [condicoes, setCondicoes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemDraft[]>([]);
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState<{ index: number } | null>(null);

  const subtotal = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade * i.preco_unitario - i.desconto, 0),
    [itens],
  );

  const createMut = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("Selecione o fornecedor");
      if (!itens.length) throw new Error("Adicione ao menos um item");
      return purchasesService.create({
        supplier_id: supplierId,
        data_emissao: dataEmissao,
        data_prevista: dataPrevista || null,
        condicoes_pagamento: condicoes || null,
        observacoes: observacoes || null,
        itens: itens.map((i) => ({
          product_id: i.product_id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          unidade: i.unidade,
          preco_unitario: i.preco_unitario,
          desconto: i.desconto,
        })),
      });
    },
    onSuccess: () => {
      toast.success("Compra registrada.");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      onOpenChange(false);
      setSupplierId(null); setItens([]); setObservacoes(""); setCondicoes(""); setDataPrevista("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addItem() {
    setItens((prev) => [
      ...prev,
      { product_id: null, product_label: "", descricao: "", quantidade: 1, unidade: "un", preco_unitario: 0, desconto: 0 },
    ]);
  }
  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nova compra</DialogTitle>
            <DialogDescription>
              Estados são controlados pelo Motor de Workflow (Solicitado → Cotação → Pedido → Recebido).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1 block">Fornecedor</Label>
              <EntityPicker
                cacheKey="suppliers"
                value={supplierId}
                onChange={(v) => setSupplierId(v)}
                loadOptions={loadSuppliers}
                placeholder="Selecione um fornecedor…"
                createLabel="Cadastrar novo fornecedor"
                onCreateNew={async () => { setQuickSupplierOpen(true); return; }}
              />
            </div>
            <div>
              <Label className="mb-1 block">Data emissão</Label>
              <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block">Previsão de entrega</Label>
              <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1 block">Condições de pagamento</Label>
              <Input value={condicoes} onChange={(e) => setCondicoes(e.target.value)} placeholder="Ex: 30/60/90" />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <Label>Itens</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar item
              </Button>
            </div>

            {itens.length === 0 ? (
              <p className="rounded border border-dashed py-6 text-center text-sm text-muted-foreground">
                Nenhum item ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {itens.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 rounded border p-2">
                    <div className="col-span-12 sm:col-span-4">
                      <EntityPicker
                        cacheKey="products"
                        value={it.product_id}
                        onChange={(v, opt) =>
                          updateItem(idx, {
                            product_id: v,
                            product_label: opt?.label ?? "",
                            descricao: it.descricao || (opt?.label ?? ""),
                            unidade: opt?.description || it.unidade,
                          })
                        }
                        loadOptions={loadProducts}
                        placeholder="Produto/Serviço"
                        createLabel="Cadastrar novo produto"
                        onCreateNew={async () => { setQuickProductOpen({ index: idx }); return; }}
                      />
                    </div>
                    <Input
                      className="col-span-8 sm:col-span-3"
                      placeholder="Descrição"
                      value={it.descricao}
                      onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                    />
                    <Input
                      className="col-span-4 sm:col-span-1"
                      type="number" min={0} step="0.001"
                      value={it.quantidade}
                      onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) })}
                    />
                    <Input
                      className="col-span-4 sm:col-span-1"
                      value={it.unidade}
                      onChange={(e) => updateItem(idx, { unidade: e.target.value })}
                    />
                    <Input
                      className="col-span-4 sm:col-span-2"
                      type="number" min={0} step="0.01"
                      value={it.preco_unitario}
                      onChange={(e) => updateItem(idx, { preco_unitario: Number(e.target.value) })}
                    />
                    <Button
                      variant="ghost" size="icon"
                      className="col-span-12 sm:col-span-1"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Label className="mb-1 block">Observações</Label>
            <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          <div className="mt-2 flex justify-end text-sm text-muted-foreground">
            Subtotal:{" "}
            <span className="ml-2 font-medium text-foreground">
              {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <PackageCheck className="mr-2 h-4 w-4" /> Registrar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cadastro contextual — Fornecedor */}
      <QuickCreateDialog
        open={quickSupplierOpen}
        onOpenChange={setQuickSupplierOpen}
        title="Novo fornecedor"
        description="Cadastro rápido — retorna automaticamente à compra em andamento."
      >
        <QuickSupplierForm
          onCreated={(id) => {
            setSupplierId(id);
            setQuickSupplierOpen(false);
          }}
        />
      </QuickCreateDialog>

      {/* Cadastro contextual — Produto */}
      <QuickCreateDialog
        open={!!quickProductOpen}
        onOpenChange={(v) => !v && setQuickProductOpen(null)}
        title="Novo produto"
        description="Cadastro rápido — retorna automaticamente à compra em andamento."
      >
        {quickProductOpen && (
          <QuickProductForm
            onCreated={(id, label, unidade) => {
              updateItem(quickProductOpen.index, {
                product_id: id, product_label: label, descricao: label, unidade,
              });
              setQuickProductOpen(null);
            }}
          />
        )}
      </QuickCreateDialog>
    </>
  );
}

// ----- Formulários de cadastro contextual (mínimos, reusam o próprio service)
function QuickSupplierForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [razao, setRazao] = useState("");
  const [cnpj, setCnpj] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      await suppliersService.create({ razao_social: razao, cnpj_cpf: cnpj } as never);
      // suppliersService.list para recuperar o ID recém-criado
      const rows = await suppliersService.list();
      const found = rows.find((r) => r.razao_social === razao);
      if (!found) throw new Error("Não foi possível recuperar o fornecedor recém criado");
      return found.id;
    },
    onSuccess: (id) => onCreated(id),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-1 block">Razão social</Label>
        <Input value={razao} onChange={(e) => setRazao(e.target.value)} />
      </div>
      <div>
        <Label className="mb-1 block">CNPJ/CPF</Label>
        <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
      </div>
      <Button disabled={!razao || mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar
      </Button>
    </div>
  );
}
function QuickProductForm({ onCreated }: { onCreated: (id: string, label: string, unidade: string) => void }) {
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [preco, setPreco] = useState(0);
  const mut = useMutation({
    mutationFn: async () => {
      await productsService.create({ nome, unidade, preco_base: preco, tipo: "produto" } as never);
      const rows = await productsService.listLite();
      const found = rows.find((r) => r.nome === nome);
      if (!found) throw new Error("Não foi possível recuperar o produto recém criado");
      return { id: found.id, label: found.nome, unidade: found.unidade };
    },
    onSuccess: (r) => onCreated(r.id, r.label, r.unidade),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-1 block">Nome</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">Unidade</Label>
          <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block">Preço base</Label>
          <Input type="number" min={0} step="0.01" value={preco} onChange={(e) => setPreco(Number(e.target.value))} />
        </div>
      </div>
      <Button disabled={!nome || mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar
      </Button>
    </div>
  );
}

// Referência silenciosa — mantém o Motor de Workflow explicitamente no import graph
void workflowService;
void PURCHASE_ENTITY;
