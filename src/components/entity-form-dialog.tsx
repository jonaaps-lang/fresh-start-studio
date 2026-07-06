import * as React from "react";
import { Loader2 } from "lucide-react";
import type { ZodTypeAny } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// -----------------------------------------------------------------------------
// EntityFormDialog
// -----------------------------------------------------------------------------
// Declarative dialog form used by every entity CRUD screen (clientes,
// fornecedores, produtos, ...). Factors out the recurring boilerplate:
//   - Dialog shell (title, description, footer, cancel/submit buttons)
//   - Local form state + generic field renderers (text/email/number/textarea/select)
//   - Zod validation with the first error surfaced as a toast
//   - Multi-column sections with column-span control per field
//   - Per-field conditional visibility, dynamic labels, and value transforms
//
// Non-goals:
//   - We do NOT hide the actual mutation logic here — routes still own the
//     data mapping (nullify, service call, invalidation). This component
//     only produces validated values and hands them to `onSubmit`.
// -----------------------------------------------------------------------------

// Values are intentionally loose: forms range from simple primitive-only
// entities (clientes) to composite forms with nested arrays (orçamentos:
// items[]). Field renderers guard the primitive types; `custom` fields own
// their own rendering and typing.
type Primitive = string | number | boolean | null;
type Values = Record<string, any>;

export type FieldType = "text" | "email" | "number" | "textarea" | "select" | "date" | "custom";

export interface SelectOption {
  value: string;
  label: string;
}

export type FieldRenderContext<V extends Values = Values> = {
  values: V;
  setField: <K extends keyof V>(name: K, value: V[K]) => void;
};

export interface FieldConfig<V extends Values = Values> {
  name: keyof V & string;
  /** Label. Function form lets the label react to sibling values. Pass `""` to hide. */
  label: string | ((values: V) => string);
  type?: FieldType;
  placeholder?: string;
  /** Options for `type: "select"`. Boolean fields can use two options with values "true"/"false". */
  options?: SelectOption[];
  /** Column span within the section grid. Defaults to 1. */
  colSpan?: number;
  rows?: number;
  /** Extra props forwarded to the underlying Input/Textarea. */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  /** Sanitize/normalize a value before it enters state (e.g. uppercase UF). */
  transform?: (raw: string) => string;
  /** Hide the field when this returns false. */
  visible?: (values: V) => boolean;
  /** Required for `type: "custom"`. Renders any UI, reading/writing via ctx.setField. */
  render?: (ctx: FieldRenderContext<V>) => React.ReactNode;
}

export interface SectionConfig<V extends Values = Values> {
  title?: string;
  /** Number of grid columns on sm+. Defaults to 2. Mobile is always single column. */
  columns?: number;
  fields: FieldConfig<V>[];
}

export interface EntityFormDialogProps<V extends Values> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodTypeAny;
  defaultValues: V;
  sections: SectionConfig<V>[];
  onSubmit: (values: V) => void | Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  /** Max width class for DialogContent. Defaults to `sm:max-w-2xl`. */
  maxWidthClassName?: string;
}

export function EntityFormDialog<V extends Values>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  sections,
  onSubmit,
  submitLabel = "Salvar",
  isSubmitting = false,
  maxWidthClassName = "sm:max-w-2xl",
}: EntityFormDialogProps<V>) {
  const [values, setValues] = React.useState<V>(defaultValues);

  // Reset internal state every time the dialog opens with (possibly new) defaults.
  React.useEffect(() => {
    if (open) setValues(defaultValues);
    // We intentionally depend on `open` so re-opening the dialog re-seeds the form
    // even if the caller re-passes the same object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setField<K extends keyof V>(name: K, raw: V[K]) {
    setValues((prev) => ({ ...prev, [name]: raw }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    void onSubmit(parsed.data as V);
  }

  const formId = React.useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${maxWidthClassName}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
          {sections.map((section, idx) => (
            <SectionBlock
              key={idx}
              section={section}
              values={values}
              setField={setField}
              hasTitle={!!section.title}
              isFirst={idx === 0}
            />
          ))}
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Section / Field renderers (internal)
// -----------------------------------------------------------------------------

function SectionBlock<V extends Values>({
  section,
  values,
  setField,
  hasTitle,
  isFirst,
}: {
  section: SectionConfig<V>;
  values: V;
  setField: <K extends keyof V>(name: K, value: V[K]) => void;
  hasTitle: boolean;
  isFirst: boolean;
}) {
  const columns = section.columns ?? 2;
  // Tailwind can't generate arbitrary column counts at build time, so we drive
  // the grid with CSS custom properties + arbitrary-variant utilities. Mobile
  // stacks (grid-cols-1); at sm+ we switch to the requested column count.
  const sectionStyle = {
    ["--cols" as string]: `repeat(${columns}, minmax(0, 1fr))`,
  } as React.CSSProperties;

  return (
    <div className={hasTitle && !isFirst ? "border-t border-border pt-4" : undefined}>
      {section.title && (
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">{section.title}</h3>
      )}
      <div
        className="grid grid-cols-1 gap-4 sm:[grid-template-columns:var(--cols)]"
        style={sectionStyle}
      >
        {section.fields.map((field) => {
          if (field.visible && !field.visible(values)) return null;
          const colSpan = field.colSpan ?? 1;
          const cellStyle = {
            ["--span" as string]: `span ${colSpan} / span ${colSpan}`,
          } as React.CSSProperties;
          const labelText = typeof field.label === "function" ? field.label(values) : field.label;
          const isCustom = (field.type ?? "text") === "custom";
          return (
            <div
              key={field.name}
              className={`min-w-0 sm:[grid-column:var(--span)] ${isCustom ? "space-y-2" : "space-y-1.5"}`}
              style={cellStyle}
            >
              {isCustom
                ? (labelText ? <Label className="text-xs font-medium text-muted-foreground">{labelText}</Label> : null)
                : null}
              {isCustom
                ? field.render?.({ values, setField })
                : <FieldRenderer field={field} values={values} setField={setField} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldRenderer<V extends Values>({
  field,
  values,
  setField,
}: {
  field: FieldConfig<V>;
  values: V;
  setField: <K extends keyof V>(name: K, value: V[K]) => void;
}) {
  const label = typeof field.label === "function" ? field.label(values) : field.label;
  const type = field.type ?? "text";
  const currentRaw = values[field.name];

  const commonProps = {
    placeholder: field.placeholder,
    ...field.inputProps,
  };

  function commitString(raw: string) {
    const next = field.transform ? field.transform(raw) : raw;
    setField(field.name, next as V[typeof field.name]);
  }

  return (
    <>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {type === "textarea" ? (
        <Textarea
          {...commonProps}
          rows={field.rows ?? 3}
          value={(currentRaw as string | null) ?? ""}
          onChange={(e) => commitString(e.target.value)}
        />
      ) : type === "select" ? (
        <Select
          value={String(currentRaw ?? "")}
          onValueChange={(v) => {
            // Coerce back to boolean when the field is boolean-typed.
            const original = values[field.name];
            const next: Primitive =
              typeof original === "boolean" ? v === "true" : v;
            setField(field.name, next as V[typeof field.name]);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === "number" ? (
        <Input
          type="number"
          step="0.01"
          {...commonProps}
          value={
            currentRaw === null || currentRaw === undefined
              ? ""
              : (currentRaw as number | string).toString()
          }
          onChange={(e) => {
            const v = e.target.value;
            setField(
              field.name,
              (v === "" ? 0 : Number(v)) as V[typeof field.name],
            );
          }}
        />
      ) : (
        <Input
          type={type}
          {...commonProps}
          value={(currentRaw as string | null) ?? ""}
          onChange={(e) => commitString(e.target.value)}
        />
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Ready-made option sets
// -----------------------------------------------------------------------------
export const YES_NO_OPTIONS: SelectOption[] = [
  { value: "true", label: "Ativo" },
  { value: "false", label: "Inativo" },
];
