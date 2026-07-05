import * as React from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Motor de Seletores Inteligentes (EntityPicker)
// -----------------------------------------------------------------------------
// Componente único e reutilizável para selecionar QUALQUER entidade do ERP:
// clientes, produtos, fornecedores, categorias, centros de custo, funcionários,
// usuários, máquinas, setores, etc.
//
// Recursos:
//   - Pesquisa instantânea (client-side por padrão)
//   - Autocomplete + navegação por teclado (via cmdk)
//   - Carregamento assíncrono
//   - Ação de "criar novo" (cadastro contextual) opcional
//   - Retorno automático ao formulário de origem (Popover fecha ao selecionar)
//
// Nunca crie um seletor específico por módulo — use este componente.
// -----------------------------------------------------------------------------

export type EntityOption = {
  value: string;
  label: string;
  description?: string | null;
};

export interface EntityPickerProps {
  value: string | null;
  onChange: (value: string | null, option: EntityOption | null) => void;
  /** Fonte de opções. Se `search` for aceito, filtragem acontece no callback. */
  loadOptions: (search: string) => Promise<EntityOption[]>;
  /** Chave para memoização do cache (ex: "clientes"). */
  cacheKey: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Se informado, exibe "+ Novo" e delega criação. Deve retornar o novo id/label. */
  onCreateNew?: (searchTerm: string) => Promise<EntityOption | void>;
  createLabel?: string;
  className?: string;
}

export function EntityPicker({
  value,
  onChange,
  loadOptions,
  cacheKey,
  placeholder = "Selecione…",
  emptyText = "Nenhum resultado.",
  disabled,
  onCreateNew,
  createLabel = "Cadastrar novo",
  className,
}: EntityPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [options, setOptions] = React.useState<EntityOption[]>([]);
  const [creating, setCreating] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const doLoad = React.useCallback(
    async (term: string) => {
      setLoading(true);
      try {
        const rows = await loadOptions(term);
        setOptions(rows);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions],
  );

  React.useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void doLoad(search), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open, cacheKey]);

  // Carrega opção selecionada mesmo sem abrir (para exibir label)
  React.useEffect(() => {
    if (!value || selected) return;
    void doLoad("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function handleCreate() {
    if (!onCreateNew) return;
    setCreating(true);
    try {
      const created = await onCreateNew(search);
      if (created) {
        setOptions((prev) => [created, ...prev.filter((p) => p.value !== created.value)]);
        onChange(created.value, created);
        setOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Pesquisar…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onChange(opt.value, opt);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      {opt.description && (
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {onCreateNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem disabled={creating} onSelect={handleCreate}>
                    {creating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {createLabel}
                    {search ? `: "${search}"` : ""}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
