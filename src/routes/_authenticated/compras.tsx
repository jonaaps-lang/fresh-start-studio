import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PlaceholderPage } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/compras")({
  component: () => (
    <AppShell title="Compras">
      <PlaceholderPage title="Compras" description="Ordens de compra de insumos, com entrada de estoque e conta a pagar." />
    </AppShell>
  ),
});
