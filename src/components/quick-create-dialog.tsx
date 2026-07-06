import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// -----------------------------------------------------------------------------
// Motor de Cadastro Contextual (QuickCreateDialog)
// -----------------------------------------------------------------------------
// Wrapper genérico para embutir QUALQUER formulário de cadastro (cliente,
// produto, fornecedor, categoria, centro de custo, etc.) dentro de outro
// fluxo sem que o usuário perca contexto.
//
// Uso típico dentro de um formulário de orçamento/pedido/título financeiro:
//
//   const [openNewCustomer, setOpen] = useState(false);
//   <QuickCreateDialog
//     open={openNewCustomer}
//     onOpenChange={setOpen}
//     title="Novo cliente"
//   >
//     <CustomerQuickForm
//       onCreated={(c) => { setCustomerId(c.id); setOpen(false); }}
//     />
//   </QuickCreateDialog>
//
// O componente NÃO conhece o formulário — só provê o shell. Assim cada módulo
// reutiliza seus próprios formulários já validados sem duplicar código.
// -----------------------------------------------------------------------------

export interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClass?: string;
}

export function QuickCreateDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  widthClass = "sm:max-w-lg",
}: QuickCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={widthClass}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
