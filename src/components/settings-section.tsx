// =============================================================================
// SettingsSection — bloco inline (não modal) para editar uma categoria de
// configuração. Reutilizado por todas as telas do Motor de Configuração.
//
// Recursos:
//   - Grid responsivo com colSpan por campo (mobile stacka).
//   - Tipos: text, textarea, number, select, switch, color, csv-numbers.
//   - Validação Zod (surface a primeira mensagem no toast).
//   - Feedback visual: dirty (badge), loading no botão, success/error toast.
//   - Callback onSave assíncrono — o caller conhece o service e a categoria.
// =============================================================================

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import type { ZodTypeAny } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type SettingsFieldType =
  | "text" | "textarea" | "number" | "select" | "switch" | "color" | "csv-numbers";

export interface SettingsSelectOption { value: string; label: string }

export interface SettingsField<V extends object> {
  name: keyof V & string;
  label: string;
  description?: string;
  type?: SettingsFieldType;
  options?: SettingsSelectOption[];
  placeholder?: string;
  colSpan?: number;
  rows?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  visible?: (values: V) => boolean;
  disabled?: boolean;
}

export interface SettingsSectionProps<V extends object> {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  columns?: number;
  fields: SettingsField<V>[];
  values: V;
  schema: ZodTypeAny;
  onSave: (values: V) => Promise<void> | void;
  canEdit?: boolean;
  isLoading?: boolean;
  /** Slot livre acima dos campos (ex.: upload de logo). */
  headerSlot?: React.ReactNode;
}

export function SettingsSection<V extends object>({
  title, description, icon: Icon, columns = 2, fields,
  values: incoming, schema, onSave, canEdit = true, isLoading = false, headerSlot,
}: SettingsSectionProps<V>) {
  const [values, setValues] = React.useState<V>(incoming);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setValues(incoming);
    setDirty(false);
  }, [incoming]);

  function setField<K extends keyof V>(name: K, value: V[K]) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  }

  async function handleSave() {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    try {
      setSaving(true);
      await onSave(parsed.data as V);
      setDirty(false);
      toast.success("Configurações salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const gridStyle = { ["--cols" as string]: `repeat(${columns}, minmax(0, 1fr))` } as React.CSSProperties;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />} {title}
            {dirty && <Badge variant="secondary" className="ml-2">Não salvo</Badge>}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button onClick={handleSave} disabled={!canEdit || !dirty || saving || isLoading} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {headerSlot}
        <div
          className="grid grid-cols-1 gap-4 sm:[grid-template-columns:var(--cols)]"
          style={gridStyle}
        >
          {fields.map((f) => {
            if (f.visible && !f.visible(values)) return null;
            const cellStyle = {
              ["--span" as string]: `span ${f.colSpan ?? 1} / span ${f.colSpan ?? 1}`,
            } as React.CSSProperties;
            return (
              <div
                key={f.name}
                className="min-w-0 space-y-1.5 sm:[grid-column:var(--span)]"
                style={cellStyle}
              >
                <FieldRenderer
                  field={f}
                  value={(values as Record<string, unknown>)[f.name]}
                  disabled={!canEdit || f.disabled}
                  onChange={(v) => setField(f.name, v as V[typeof f.name])}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRenderer<V extends object>({
  field, value, disabled, onChange,
}: {
  field: SettingsField<V>;
  value: unknown;
  disabled?: boolean;
  onChange: (v: unknown) => void;
}) {
  const type = field.type ?? "text";

  if (type === "switch") {
    return (
      <div className="flex items-start justify-between rounded-md border border-border p-3">
        <div className="space-y-0.5 pr-3">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(v) => onChange(v)}
          disabled={disabled}
        />
      </div>
    );
  }

  const commonLabel = (
    <>
      <Label className="text-xs font-medium text-muted-foreground">{field.label}</Label>
      {field.description && (
        <p className="text-[11px] text-muted-foreground">{field.description}</p>
      )}
    </>
  );

  if (type === "textarea") {
    return (
      <>
        {commonLabel}
        <Textarea
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </>
    );
  }

  if (type === "select") {
    return (
      <>
        {commonLabel}
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }

  if (type === "number") {
    return (
      <>
        {commonLabel}
        <Input
          type="number"
          step={field.step ?? 1}
          min={field.min}
          max={field.max}
          disabled={disabled}
          placeholder={field.placeholder}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
      </>
    );
  }

  if (type === "color") {
    return (
      <>
        {commonLabel}
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
            disabled={disabled}
            value={(value as string) || "#000000"}
            onChange={(e) => onChange(e.target.value)}
          />
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="#000000"
            maxLength={20}
          />
        </div>
      </>
    );
  }

  if (type === "csv-numbers") {
    const arr = Array.isArray(value) ? (value as number[]) : [];
    return (
      <>
        {commonLabel}
        <Input
          value={arr.join(", ")}
          placeholder="Ex: 30, 60, 90"
          disabled={disabled}
          onChange={(e) => {
            const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
            const nums = parts.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
            onChange(nums);
          }}
        />
      </>
    );
  }

  return (
    <>
      {commonLabel}
      <Input
        type="text"
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        disabled={disabled}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}
