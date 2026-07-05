import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Projeto em branco
        </h1>
        <p className="mt-4 text-muted-foreground">
          Comece a construir o seu app a partir daqui.
        </p>
      </div>
    </main>
  );
}
