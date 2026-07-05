import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PlaceholderPage } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: () => (
    <AppShell title="Estoque">
      <PlaceholderPage title="Estoque" description="Movimentações de entrada e saída, estoque mínimo e valor médio." />
    </AppShell>
  ),
});
