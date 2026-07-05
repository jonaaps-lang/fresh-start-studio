import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PlaceholderPage } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/despesas")({
  component: () => (
    <AppShell title="Despesas">
      <PlaceholderPage title="Despesas" description="Controle de despesas operacionais por categoria." />
    </AppShell>
  ),
});
