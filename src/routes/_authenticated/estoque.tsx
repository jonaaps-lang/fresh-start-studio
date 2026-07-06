import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, ArrowDown, ArrowUp, Scale, ClipboardList } from "lucide-react";

import { AppShell, PageHeader, PlaceholderPage } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EntityPicker, type EntityOption } from "@/components/entity-picker";
import { productsService, stockService, settingsService } from "@/services";
import type { StockMovementType } from "@/domain/stock";
import { STOCK_MOVEMENT_LABEL } from "@/domain/stock";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: EstoquePage,
});

async function loadProducts(search: string): Promise<EntityOption[]> {
  const rows = await productsService.listLite();
  const term = search.trim().toLowerCase();
  return rows
    .filter((p) => !term || p.nome.toLowerCase().includes(term))
    .slice(0, 30)
    .map((p) => ({ value: p.id, label: p.nome, description: p.codigo ?? p.unidade }));
}

function EstoquePage() {
  const qc = useQueryClient();
  const configQ = useQuery({
    queryKey: ["settings", "estoque"],
    queryFn: () => settingsService.get("estoque"),
  });
  const balancesQ = useQuery({
    queryKey: ["stock", "balances"],
    queryFn: () => stockService.balances(),
    enabled: configQ.data?.utiliza_estoque === true,
  });
  const movementsQ = useQuery({
    queryKey: ["stock", "movements"],
    queryFn: () => stockService.listMovements(),
    enabled: configQ.data?.utiliza_estoque === true,
  });

  const [openAdjust, setOpenAdjust] = useState<StockMovementType | null>(null);

  if (configQ.isLoading) {
    return (
      <AppShell title="Estoque">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      </AppShell>
    );
  }

  if (configQ.data?.utiliza_estoque !== true) {
    return (
      <AppShell title="Estoque">
        <PlaceholderPage
          title="Módulo de Estoque desativado"
          description="Ative em Configurações → Estoque para começar a controlar entradas, saídas e ajustes."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Estoque">
      <PageHeader title="Estoque" description="Movimentações e saldo atual (opcional — controlado pelo Motor de Configuração).">
        <Button variant="outline" onClick={() => setOpenAdjust("entrada")}>
          <ArrowDown className="mr-2 h-4 w-4" /> Entrada
        </Button>
        <Button variant="outline" onClick={() => setOpenAdjust("saida")}>
          <ArrowUp className="mr-2 h-4 w-4" /> Saída
        </Button>
        <Button variant="outline" onClick={() => setOpenAdjust("ajuste")}>
          <Scale className="mr-2 h-4 w-4" /> Ajuste
        </Button>
        <Button variant="outline" onClick={() => setOpenAdjust("inventario")}>
          <ClipboardList className="mr-2 h-4 w-4" /> Inventário
        </Button>
      </PageHeader>

      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">Saldo por produto</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="balances">
          <Card>
            <CardHeader><CardTitle className="text-base">Saldo atual</CardTitle></CardHeader>
            <CardContent className="p-0">
              {balancesQ.isLoading ? (
                <div className="py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
              ) : !balancesQ.data?.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Sem produtos.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balancesQ.data.map((b) => (
                      <TableRow key={b.product_id}>
                        <TableCell>{b.nome}</TableCell>
                        <TableCell>{b.codigo ?? "—"}</TableCell>
                        <TableCell>{b.unidade}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={b.saldo < 0 ? "text-destructive" : ""}>{b.saldo}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader><CardTitle className="text-base">Últimas movimentações</CardTitle></CardHeader>
            <CardContent className="p-0">
              {movementsQ.isLoading ? (
                <div className="py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
              ) : !movementsQ.data?.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementsQ.data.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{new Date(m.data_movimento).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{m.products?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{STOCK_MOVEMENT_LABEL[m.tipo]}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.quantidade}</TableCell>
                        <TableCell>{m.origem ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AdjustDialog
        tipo={openAdjust}
        onClose={() => setOpenAdjust(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["stock"] });
        }}
      />
    </AppShell>
  );
}

function AdjustDialog({
  tipo,
  onClose,
  onSaved,
}: {
  tipo: StockMovementType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productId, setProductId] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [custo, setCusto] = useState<number | "">("");
  const [obs, setObs] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!tipo) return;
      if (!productId) throw new Error("Selecione o produto");
      const qty = tipo === "saida" ? -Math.abs(quantidade) : Math.abs(quantidade);
      return stockService.adjust({
        product_id: productId,
        tipo,
        quantidade: qty,
        custo_unitario: custo === "" ? null : Number(custo),
        observacao: obs || null,
      });
    },
    onSuccess: () => {
      toast.success("Movimentação registrada.");
      onSaved(); onClose();
      setProductId(null); setQuantidade(0); setCusto(""); setObs("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!tipo} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tipo ? STOCK_MOVEMENT_LABEL[tipo] : ""} de estoque
          </DialogTitle>
          <DialogDescription>
            Registra movimentação no Motor de Estoque. Estoque é opcional — desative em Configurações se não usar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block">Produto</Label>
            <EntityPicker
              cacheKey="products"
              value={productId}
              onChange={(v) => setProductId(v)}
              loadOptions={loadProducts}
              placeholder="Selecione…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Quantidade</Label>
              <Input type="number" min={0} step="0.001" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
            </div>
            <div>
              <Label className="mb-1 block">Custo unitário</Label>
              <Input type="number" min={0} step="0.01" value={custo} onChange={(e) => setCusto(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Observação</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Silences unused import warnings (kept for parity with pattern)
void Select; void SelectContent; void SelectItem; void SelectTrigger; void SelectValue; void Plus;
