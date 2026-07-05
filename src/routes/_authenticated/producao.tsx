import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, Printer, Trash2, Paperclip, Play, Pause,
  CircleCheck, CircleAlert, Clock, LayoutGrid, List,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { productionService, ordersService, workflowService } from "@/services";
import { usePermissions } from "@/hooks/use-permissions";
import { useWorkflow } from "@/hooks/use-workflow";
import { PRIORITY_LABEL, PRODUCTION_PRIORITIES, PRODUCTION_ENTITY } from "@/domain/production";
import type { AvailableTransition, WorkflowState } from "@/domain/workflow";
import { printProductionOrder } from "@/lib/production-print";

export const Route = createFileRoute("/_authenticated/producao")({
  component: ProducaoPage,
});

function ProducaoPage() {
  const qc = useQueryClient();
  const { can, isDeveloper } = usePermissions();
  const canCreate = isDeveloper || can("producao.create");
  const canDelete = isDeveloper || can("producao.delete");

  const [tab, setTab] = useState<"kanban" | "lista">("kanban");
  const [openNew, setOpenNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const opsQ = useQuery({ queryKey: ["production_orders"], queryFn: () => productionService.list() });

  // Estados do workflow padrão de produção — colunas do Kanban.
  const wfQ = useQuery({
    queryKey: ["workflows", "production"],
    queryFn: () => workflowService.listWorkflows(PRODUCTION_ENTITY),
  });
  const defaultWf = wfQ.data?.find((w) => w.is_default) ?? wfQ.data?.[0] ?? null;
  const statesQ = useQuery({
    queryKey: ["workflow_states", defaultWf?.id],
    enabled: !!defaultWf?.id,
    queryFn: () => workflowService.listStates(defaultWf!.id),
  });

  // Instâncias de workflow para todas as OPs — usado no Kanban para agrupar.
  const instancesQ = useQuery({
    queryKey: ["production_wf_instances", opsQ.data?.map((o) => o.id).join(",")],
    enabled: !!opsQ.data?.length,
    queryFn: async () => {
      const results = await Promise.all(
        (opsQ.data ?? []).map((o) =>
          workflowService.getInstance(PRODUCTION_ENTITY, o.id).then((i) => [o.id, i] as const),
        ),
      );
      return Object.fromEntries(results);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productionService.softDelete(id),
    onSuccess: () => {
      toast.success("OP excluída");
      qc.invalidateQueries({ queryKey: ["production_orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Produção">
      <PageHeader title="Produção" description="Ordens de produção controladas pelo Motor de Workflow.">
        {canCreate && (
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova OP
          </Button>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="kanban"><LayoutGrid className="mr-2 h-4 w-4" /> Kanban</TabsTrigger>
          <TabsTrigger value="lista"><List className="mr-2 h-4 w-4" /> Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {opsQ.isLoading || statesQ.isLoading ? (
            <LoadingBlock />
          ) : (
            <KanbanBoard
              states={statesQ.data ?? []}
              instances={instancesQ.data ?? {}}
              ops={opsQ.data ?? []}
              onOpen={setDetailId}
            />
          )}
        </TabsContent>

        <TabsContent value="lista" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {opsQ.isLoading ? (
                <LoadingBlock />
              ) : (opsQ.data ?? []).length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma Ordem de Produção. Clique em "Nova OP" para começar.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(opsQ.data ?? []).map((op) => {
                      const inst = instancesQ.data?.[op.id];
                      const state = inst?.workflow_states;
                      return (
                        <TableRow key={op.id} className="cursor-pointer" onClick={() => setDetailId(op.id)}>
                          <TableCell className="font-medium">{op.numero}</TableCell>
                          <TableCell>{op.customers?.nome ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{op.orders?.numero ?? "—"}</TableCell>
                          <TableCell><PriorityBadge value={op.prioridade} /></TableCell>
                          <TableCell>{op.prazo_producao ? new Date(op.prazo_producao).toLocaleDateString("pt-BR") : "—"}</TableCell>
                          <TableCell>
                            {state ? (
                              <Badge style={{ backgroundColor: `${state.cor ?? "#64748b"}20`, color: state.cor ?? "#334155" }}>
                                {state.nome}
                              </Badge>
                            ) : (
                              <Badge variant="outline">—</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" onClick={() => printProductionOrder(op.id, true)} title="Imprimir">
                                <Printer className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost" size="icon" title="Excluir"
                                  onClick={() => confirm(`Excluir OP ${op.numero}?`) && deleteMut.mutate(op.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {openNew && (
        <NewOpDialog onClose={() => setOpenNew(false)} onCreated={(id) => { setOpenNew(false); setDetailId(id); }} />
      )}

      {detailId && (
        <OpDetailDialog opId={detailId} onClose={() => setDetailId(null)} />
      )}
    </AppShell>
  );
}

function LoadingBlock() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    baixa: "bg-slate-100 text-slate-700",
    media: "bg-blue-100 text-blue-700",
    alta: "bg-amber-100 text-amber-700",
    urgente: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${map[value] ?? map.media}`}>
    {PRIORITY_LABEL[value as keyof typeof PRIORITY_LABEL] ?? value}
  </span>;
}

// -----------------------------------------------------------------------------
// Kanban — colunas dinâmicas geradas pelos estados do workflow.
// -----------------------------------------------------------------------------
type Op = Awaited<ReturnType<typeof productionService.list>>[number];
type InstMap = Record<string, Awaited<ReturnType<typeof workflowService.getInstance>>>;

function KanbanBoard({
  states, instances, ops, onOpen,
}: {
  states: WorkflowState[];
  instances: InstMap;
  ops: Op[];
  onOpen: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<string, Op[]> = {};
    for (const s of states) g[s.id] = [];
    for (const op of ops) {
      const inst = instances[op.id];
      if (inst?.current_state_id && g[inst.current_state_id]) g[inst.current_state_id].push(op);
    }
    return g;
  }, [ops, states, instances]);

  if (!states.length) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
      Nenhum workflow de produção configurado.
    </div>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {states.map((s) => (
        <div key={s.id} className="flex flex-col rounded-md border bg-muted/30">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.cor ?? "#64748b" }} />
              <span className="text-sm font-medium">{s.nome}</span>
            </div>
            <span className="text-xs text-muted-foreground">{grouped[s.id]?.length ?? 0}</span>
          </div>
          <div className="flex flex-col gap-2 p-2 min-h-[120px]">
            {(grouped[s.id] ?? []).map((op) => (
              <button
                key={op.id}
                onClick={() => onOpen(op.id)}
                className="rounded-md border bg-background p-3 text-left transition hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{op.numero}</span>
                  <PriorityBadge value={op.prioridade} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{op.customers?.nome ?? "—"}</div>
                {op.prazo_producao && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {new Date(op.prazo_producao).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Nova OP — dialog. Pode ser criada a partir de um pedido.
// -----------------------------------------------------------------------------
function NewOpDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [orderId, setOrderId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const ordersQ = useQuery({ queryKey: ["orders", "lite"], queryFn: () => ordersService.list() });

  const createMut = useMutation({
    mutationFn: async () => {
      const selected = ordersQ.data?.find((o) => o.id === orderId);
      return productionService.create({
        order_id: orderId || null,
        customer_id: selected?.customer_id ?? null,
        descricao_servico: descricao || null,
        prioridade: prioridade as (typeof PRODUCTION_PRIORITIES)[number],
        prazo_producao: prazo || null,
        observacoes: observacoes || null,
      });
    },
    onSuccess: (id) => {
      toast.success("OP criada");
      qc.invalidateQueries({ queryKey: ["production_orders"] });
      onCreated(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Produção</DialogTitle>
          <DialogDescription>Numeração e workflow são atribuídos automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Pedido vinculado (opcional)</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger><SelectValue placeholder="Selecionar pedido" /></SelectTrigger>
              <SelectContent>
                {(ordersQ.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.numero} — {o.customers?.nome ?? "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição do serviço</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCTION_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar OP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Detalhe da OP — transições, apontamentos, anexos.
// -----------------------------------------------------------------------------
function OpDetailDialog({ opId, onClose }: { opId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const opQ = useQuery({ queryKey: ["production_order", opId], queryFn: () => productionService.getById(opId) });
  const itemsQ = useQuery({ queryKey: ["production_items", opId], queryFn: () => productionService.listItems(opId) });
  const attachQ = useQuery({ queryKey: ["production_attachments", opId], queryFn: () => productionService.listAttachments(opId) });
  const timeQ = useQuery({ queryKey: ["production_time", opId], queryFn: () => productionService.listTimeEntries(opId) });

  const wf = useWorkflow(PRODUCTION_ENTITY, opId);
  const [transitionTarget, setTransitionTarget] = useState<AvailableTransition | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["production_order", opId] });
    qc.invalidateQueries({ queryKey: ["production_time", opId] });
    qc.invalidateQueries({ queryKey: ["production_orders"] });
    qc.invalidateQueries({ queryKey: ["production_wf_instances"] });
    wf.refresh();
  };

  const apontar = useMutation({
    mutationFn: (input: { tipo: "inicio" | "pausa" | "retomada" | "termino" | "nota"; motivo?: string; observacao?: string }) =>
      productionService.addTimeEntry(opId, input.tipo, { motivo: input.motivo, observacao: input.observacao }),
    onSuccess: () => { toast.success("Apontamento registrado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMut = useMutation({
    mutationFn: (f: File) => productionService.addAttachment(opId, f),
    onSuccess: () => { toast.success("Anexo enviado"); qc.invalidateQueries({ queryKey: ["production_attachments", opId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const op = opQ.data;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {!op ? (
          <LoadingBlock />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                OP {op.numero}
                {wf.currentState && (
                  <Badge style={{ backgroundColor: `${wf.currentState.cor ?? "#64748b"}20`, color: wf.currentState.cor ?? "#334155" }}>
                    {wf.currentState.nome}
                  </Badge>
                )}
                <PriorityBadge value={op.prioridade} />
              </DialogTitle>
              <DialogDescription>{op.customers?.nome ?? "—"} · Pedido {op.orders?.numero ?? "—"}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Prazo: </span>{op.prazo_producao ? new Date(op.prazo_producao).toLocaleDateString("pt-BR") : "—"}</div>
              <div><span className="text-muted-foreground">Setor: </span>{op.setor ?? "—"}</div>
              {op.descricao_servico && <div className="col-span-2"><span className="text-muted-foreground">Serviço: </span>{op.descricao_servico}</div>}
              {op.observacoes && <div className="col-span-2"><span className="text-muted-foreground">Obs.: </span>{op.observacoes}</div>}
            </div>

            <Separator />

            {/* Transições do workflow */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações do workflow</h3>
              <div className="flex flex-wrap gap-2">
                {wf.transitions.length === 0 && <span className="text-sm text-muted-foreground">Sem transições disponíveis.</span>}
                {wf.transitions.map((t) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant={t.requires_approval ? "outline" : "default"}
                    disabled={!t.allowed || wf.isTransitioning}
                    onClick={() => {
                      if (t.requires_motivo || t.requires_observacao || t.requires_approval) {
                        setTransitionTarget(t);
                      } else {
                        wf.transition({ transition_id: t.id }).then(invalidate).catch((e: Error) => toast.error(e.message));
                      }
                    }}
                    title={t.allowed ? "" : `Requer permissão: ${t.permission_required}`}
                  >
                    {t.nome}
                    {t.requires_approval && <CircleAlert className="ml-1 h-3 w-3" />}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Apontamento rápido */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apontamento</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => apontar.mutate({ tipo: "inicio" })}>
                  <Play className="mr-1 h-3 w-3" /> Início
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const motivo = prompt("Motivo da pausa:");
                  if (motivo && motivo.trim().length >= 3) apontar.mutate({ tipo: "pausa", motivo });
                }}>
                  <Pause className="mr-1 h-3 w-3" /> Pausar
                </Button>
                <Button size="sm" variant="outline" onClick={() => apontar.mutate({ tipo: "retomada" })}>
                  <Play className="mr-1 h-3 w-3" /> Retomar
                </Button>
                <Button size="sm" variant="outline" onClick={() => apontar.mutate({ tipo: "termino" })}>
                  <CircleCheck className="mr-1 h-3 w-3" /> Término
                </Button>
              </div>
              {(timeQ.data ?? []).length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {(timeQ.data ?? []).slice(0, 8).map((t) => (
                    <li key={t.id} className="flex justify-between border-b py-1">
                      <span>{new Date(t.occurred_at).toLocaleString("pt-BR")} — <strong>{t.tipo}</strong>{t.motivo ? ` (${t.motivo})` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            {/* Anexos */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anexos</h3>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                <Paperclip className="h-4 w-4" /> Anexar arquivo
                <input
                  type="file" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMut.mutate(f); e.currentTarget.value = ""; }}
                />
              </label>
              <ul className="mt-2 space-y-1 text-sm">
                {(attachQ.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between border-b py-1">
                    <button
                      className="truncate text-primary hover:underline"
                      onClick={async () => {
                        const url = await productionService.attachmentUrl(a.storage_path);
                        if (url) window.open(url, "_blank");
                      }}
                    >{a.nome}</button>
                    <Button variant="ghost" size="icon" onClick={() => productionService.removeAttachment(a.id).then(() => qc.invalidateQueries({ queryKey: ["production_attachments", opId] }))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            {(itemsQ.data ?? []).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens</h3>
                  <Table>
                    <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead>Un.</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(itemsQ.data ?? []).map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.descricao}</TableCell>
                          <TableCell className="text-right">{it.quantidade}</TableCell>
                          <TableCell>{it.unidade ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => printProductionOrder(opId, false)}>
                <Printer className="mr-2 h-4 w-4" /> Visualizar
              </Button>
              <Button onClick={() => printProductionOrder(opId, true)}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            </DialogFooter>

            {transitionTarget && (
              <TransitionDialog
                transition={transitionTarget}
                onClose={() => setTransitionTarget(null)}
                onConfirm={({ motivo, observacao }) => {
                  wf.transition({ transition_id: transitionTarget.id, motivo, observacao })
                    .then(() => {
                      toast.success(transitionTarget.requires_approval ? "Aprovação solicitada" : "Estado alterado");
                      setTransitionTarget(null);
                      invalidate();
                    })
                    .catch((e: Error) => toast.error(e.message));
                }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransitionDialog({
  transition, onClose, onConfirm,
}: {
  transition: AvailableTransition;
  onClose: () => void;
  onConfirm: (v: { motivo?: string; observacao?: string }) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const canSubmit =
    (!transition.requires_motivo || motivo.trim().length >= 3) &&
    (!transition.requires_observacao || observacao.trim().length >= 3);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{transition.nome}</DialogTitle>
          <DialogDescription>
            {transition.requires_approval
              ? "Esta ação exige aprovação. Um pedido será criado no sistema de aprovações."
              : "Confirme os dados abaixo para concluir a transição."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {transition.requires_motivo && (
            <div>
              <Label>Motivo <span className="text-destructive">*</span></Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
            </div>
          )}
          {transition.requires_observacao && (
            <div>
              <Label>Observação <span className="text-destructive">*</span></Label>
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!canSubmit} onClick={() => onConfirm({ motivo: motivo || undefined, observacao: observacao || undefined })}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
