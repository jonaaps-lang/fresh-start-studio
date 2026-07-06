import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  FileText,
  PauseCircle,
  ShoppingCart,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { customersService, suppliersService } from "@/services";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type CustomerRow = {
  id: string;
  nome: string;
  tipo: "pf" | "pj";
  ativo: boolean;
  created_at: string;
};

type SupplierRow = {
  id: string;
  razao_social: string;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
};

type Stats = {
  customers: CustomerRow[];
  suppliers: SupplierRow[];
};

const CMYK = {
  cyan: "#00AEEF",
  magenta: "#EC008C",
  yellow: "#FFC700",
  black: "#1E1E1E",
};

function DashboardPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [customers, suppliers] = await Promise.all([
        customersService.listForDashboard(),
        suppliersService.listForDashboard(),
      ]);
      if (!active) return;
      setData({
        customers: customers as CustomerRow[],
        suppliers: suppliers as SupplierRow[],
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell title="Dashboard">
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação com base nos dados cadastrados."
      />

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent data={data} />
      )}
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function DashboardContent({ data }: { data: Stats }) {
  const { customers, suppliers } = data;

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.ativo).length;
  const inactiveCustomers = totalCustomers - activeCustomers;
  const pjCount = customers.filter((c) => c.tipo === "pj").length;
  const pfCount = customers.filter((c) => c.tipo === "pf").length;

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.ativo).length;

  // últimos 6 meses
  const months = lastNMonths(6);
  const customersByMonth = months.map((m) => ({
    label: m.label,
    Clientes: customers.filter((c) => sameMonth(c.created_at, m.date)).length,
    Fornecedores: suppliers.filter((s) => sameMonth(s.created_at, m.date)).length,
  }));

  const typePie = [
    { name: "Pessoa Jurídica", value: pjCount, color: CMYK.cyan },
    { name: "Pessoa Física", value: pfCount, color: CMYK.magenta },
  ].filter((d) => d.value > 0);

  const supplierCategories = aggregateCategories(suppliers);

  const recentCustomers = customers.slice(0, 5);
  const recentSuppliers = suppliers.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Clientes"
          value={totalCustomers}
          hint={`${activeCustomers} ativos · ${inactiveCustomers} inativos`}
          icon={Users}
          accent="text-[var(--cmyk-cyan)]"
        />
        <KpiCard
          label="Fornecedores"
          value={totalSuppliers}
          hint={`${activeSuppliers} ativos`}
          icon={Truck}
          accent="text-[var(--cmyk-magenta)]"
        />
        <KpiCard
          label="Orçamentos abertos"
          value={0}
          hint="Disponível na Fase 2"
          icon={FileText}
          accent="text-[var(--cmyk-yellow)]"
          muted
        />
        <KpiCard
          label="Pedidos em produção"
          value={0}
          hint="Disponível na Fase 2"
          icon={ShoppingCart}
          accent="text-foreground"
          muted
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadastros nos últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customersByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Clientes" fill={CMYK.cyan} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Fornecedores" fill={CMYK.magenta} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes por tipo</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {typePie.length === 0 ? (
              <EmptyState message="Nenhum cliente cadastrado ainda." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {typePie.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {typePie.length > 0 && (
              <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
                {typePie.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2.5 rounded-sm"
                      style={{ background: d.color }}
                    />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Clientes recentes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/clientes">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <EmptyState
                message="Nenhum cliente cadastrado."
                action={
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/clientes">
                      <UserPlus className="mr-2 size-4" /> Cadastrar cliente
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentCustomers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.tipo === "pj" ? "Pessoa Jurídica" : "Pessoa Física"} ·{" "}
                        {formatDate(c.created_at)}
                      </p>
                    </div>
                    <Badge variant={c.ativo ? "default" : "secondary"}>
                      {c.ativo ? (
                        <>
                          <CheckCircle2 className="mr-1 size-3" /> Ativo
                        </>
                      ) : (
                        <>
                          <PauseCircle className="mr-1 size-3" /> Inativo
                        </>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fornecedores recentes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/fornecedores">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSuppliers.length === 0 ? (
              <EmptyState message="Nenhum fornecedor cadastrado." />
            ) : (
              <ul className="divide-y divide-border">
                {recentSuppliers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.razao_social}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.categoria ?? "Sem categoria"}
                      </p>
                    </div>
                    <Badge variant={s.ativo ? "default" : "secondary"}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {supplierCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fornecedores por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 12 }} width={140} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" fill={CMYK.cyan} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  muted,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Users;
  accent: string;
  muted?: boolean;
}) {
  return (
    <Card className={muted ? "opacity-70" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`size-4 ${accent}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-6 text-center">
      <Building2 className="mb-2 size-8 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

function lastNMonths(n: number) {
  const out: { label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      date: d,
    });
  }
  return out;
}

function sameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function aggregateCategories(suppliers: SupplierRow[]) {
  const map = new Map<string, number>();
  for (const s of suppliers) {
    const key = s.categoria?.trim() || "Sem categoria";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
