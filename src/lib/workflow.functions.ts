import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -----------------------------------------------------------------------------
// Server functions do Motor de Workflow.
// Toda mudança de estado passa por aqui — nenhum módulo escreve direto
// em `workflow_instances`. Validações (empresa, permissão, campos
// obrigatórios, aprovação) acontecem nas RPCs SECURITY DEFINER.
// -----------------------------------------------------------------------------

const startSchema = z.object({
  entidade: z.string().min(1),
  entidade_id: z.string().uuid(),
  workflow_id: z.string().uuid().optional(),
});

export const startWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("workflow_start", {
      _entidade: data.entidade,
      _entidade_id: data.entidade_id,
      ...(data.workflow_id ? { _workflow_id: data.workflow_id } : {}),
    });
    if (error) throw new Error(error.message);
    return { instance_id: id as unknown as string };
  });

const listSchema = z.object({ instance_id: z.string().uuid() });

export const listAvailableTransitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "workflow_available_transitions",
      { _instance_id: data.instance_id },
    );
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const transitionSchema = z.object({
  instance_id: z.string().uuid(),
  transition_id: z.string().uuid(),
  motivo: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
});

export const executeTransition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => transitionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc(
      "workflow_transition",
      {
        _instance_id: data.instance_id,
        _transition_id: data.transition_id,
        ...(data.motivo ? { _motivo: data.motivo } : {}),
        ...(data.observacao ? { _observacao: data.observacao } : {}),
      },
    );
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

const instanceLookupSchema = z.object({
  entidade: z.string().min(1),
  entidade_id: z.string().uuid(),
});

export const getInstanceByEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => instanceLookupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workflow_instances")
      .select("*, workflow_states!workflow_instances_current_state_id_fkey(*)")
      .eq("entidade", data.entidade)
      .eq("entidade_id", data.entidade_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const historySchema = z.object({ instance_id: z.string().uuid(), limit: z.number().int().positive().max(200).optional() });

export const listInstanceHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => historySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("workflow_history")
      .select("*")
      .eq("instance_id", data.instance_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
