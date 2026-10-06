import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { format, isSameMonth, parseISO, subDays } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  IndianRupee,
  Package,
  Phone,
  Plus,
  Receipt,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AppShell, PageTitle } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { billTotal, useClinic } from "@/store/clinic";
import { formatDate, initials, inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Daily clinic overview: visits, revenue, follow-ups and stock alerts." },
      { property: "og:title", content: "Dashboard — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Daily clinic overview: visits, revenue, follow-ups and stock alerts." },
    ],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card-soft p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const role = useClinic((s) => s.role);
  const patients = useClinic((s) => s.patients);
  const visits = useClinic((s) => s.visits);
  const bills = useClinic((s) => s.bills);
  const medicines = useClinic((s) => s.medicines);
  const followUps = useClinic((s) => s.followUps);
  const settings = useClinic((s) => s.settings);

  const today = todayISO();
  const now = useMemo(() => new Date(), [today]);

  const {
    todaysVisits,
    todaysBills,
    todaysRevenue,
    pendingAmount,
    lowStockCount,
    todaysFollowUps,
    overdueFollowUps,
    thisMonthRevenue,
    revenueSeries,
    monthlySeries,
    modeSeries,
  } = useMemo(() => {
    const tVisits = visits.filter((v) => v.date === today);
    const tBills = bills.filter((b) => b.date === today);
    const tRev = tBills.reduce((s, b) => s + b.amountReceived, 0);
    const pending = bills
      .filter((b) => b.status !== "Paid")
      .reduce((s, b) => s + (billTotal(b) - b.amountReceived), 0);

    let lowCount = 0;
    for (const m of medicines) {
      if (m && m.stock < settings.lowStockThreshold) lowCount++;
    }

    const tFollowUps = followUps.filter((f) => f.status === "Pending" && f.dueDate === today);
    const odFollowUps = followUps.filter((f) => f.status === "Pending" && f.dueDate < today);
    const tmRev = bills
      .filter((b) => isSameMonth(parseISO(b.date), now))
      .reduce((s, b) => s + b.amountReceived, 0);

    const revSeries = Array.from({ length: 7 }, (_, i) => {
      const day = format(subDays(now, 6 - i), "yyyy-MM-dd");
      return {
        day: format(subDays(now, 6 - i), "EEE"),
        revenue: bills.filter((b) => b.date === day).reduce((s, b) => s + b.amountReceived, 0),
      };
    });

    const mSeries = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: format(dt, "MMM"),
        patients: patients.filter((p) => isSameMonth(parseISO(p.registeredOn), dt)).length,
      };
    });

    const modes = ["Cash", "UPI", "Card"] as const;
    const mModeSeries = modes.map((m, i) => ({
      name: m,
      value: bills.filter((b) => b.paymentMode === m).length,
      fill: ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)"][i]!,
    }));

    return {
      todaysVisits: tVisits,
      todaysBills: tBills,
      todaysRevenue: tRev,
      pendingAmount: pending,
      lowStockCount: lowCount,
      todaysFollowUps: tFollowUps,
      overdueFollowUps: odFollowUps,
      thisMonthRevenue: tmRev,
      revenueSeries: revSeries,
      monthlySeries: mSeries,
      modeSeries: mModeSeries,
    };
  }, [visits, bills, medicines, followUps, patients, today, now, settings.lowStockThreshold]);

  const recent = useMemo(() => {
    return [...patients]
      .sort((a, b) => b.registeredOn.localeCompare(a.registeredOn))
      .slice(0, 5);
  }, [patients]);

  const nameOf = (id: string) => patients.find((p) => p.id === id);
  const isDoctor = role === "doctor";

  return (
    <>
      <PageTitle
        title={isDoctor ? "Good day, Doctor" : "Front desk overview"}
        subtitle={format(now, "EEEE, dd MMM yyyy")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/patients/new">
                <UserPlus className="mr-2 h-4 w-4" /> New Patient
              </Link>
            </Button>
            {isDoctor && (
              <Button asChild className="rounded-xl">
                <Link to="/prescriptions/new" search={{}}>
                  <Plus className="mr-2 h-4 w-4" /> New Prescription
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/billing">
                <Receipt className="mr-2 h-4 w-4" /> Billing
              </Link>
            </Button>
          </div>
        }
      />

      {isDoctor ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard index={0} label="Total Registered Patients" value={patients.length} icon={Users} trend={8} to="/patients" />
          <StatCard index={1} label="Today's Follow-ups" value={todaysFollowUps.length} icon={CalendarClock} tone="info" to="/follow-ups" />
          <StatCard index={2} label="Today's Visits" value={todaysVisits.length} icon={CalendarClock} tone="gold" to="/patients" />
          <StatCard index={3} label="Today's Revenue" value={todaysRevenue} icon={IndianRupee} tone="success" format={inr} trend={5} to="/billing" />
          <StatCard index={4} label="This Month Revenue" value={thisMonthRevenue} icon={Wallet} tone="primary" format={inr} to="/billing" />
          <StatCard index={5} label="Pending Payments" value={pendingAmount} icon={Wallet} tone="warning" format={inr} to="/billing" />
          <StatCard index={6} label="Low Stock Medicines" value={lowStockCount} icon={Package} tone="danger" to="/inventory" />
          <StatCard index={7} label="Overdue Follow-Ups" value={overdueFollowUps.length} icon={CalendarClock} tone="danger" to="/follow-ups" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard index={0} label="Today's Registrations" value={patients.filter((p) => p.registeredOn === today).length} icon={UserPlus} to="/patients" />
          <StatCard index={1} label="Revenue Today" value={todaysRevenue} icon={IndianRupee} tone="success" format={inr} to="/billing" />
          <StatCard index={2} label="Pending Payments" value={pendingAmount} icon={Wallet} tone="warning" format={inr} to="/billing" />
          <StatCard index={3} label="Overdue Follow-Ups" value={overdueFollowUps.length} icon={CalendarClock} tone="danger" to="/follow-ups" />
        </div>
      )}

      {isDoctor && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="card-soft p-5 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Revenue · last 7 days
            </h3>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={revenueSeries} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={64} tickFormatter={(v) => inr(v)} />
                <Tooltip
                  formatter={(v: number) => inr(v)}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-popover)" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <Panel title="Payment modes">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={modeSeries} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {modeSeries.map((m) => (
                    <Cell key={m.name} fill={m.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-popover)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              {modeSeries.map((m) => (
                <span key={m.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.fill }} /> {m.name}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {isDoctor && (
        <div className="mt-6">
          <Panel title="New patients · last 6 months">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySeries} margin={{ left: -24, right: 6 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-secondary)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-popover)" }}
                />
                <Bar dataKey="patients" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recent patients"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/patients">All patients</Link>
            </Button>
          }
        >
          <div className="divide-y">
            {recent.map((p) => (
              <Link
                key={p.id}
                to="/patients/$id"
                params={{ id: p.id }}
                className="flex items-center gap-3 py-2.5 first:pt-0 hover:opacity-80"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-secondary text-xs">{initials(p.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.regNo} · {p.age}y {p.gender}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(p.registeredOn)}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          title="Bills awaiting payment"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/billing">Open billing</Link>
            </Button>
          }
        >
          <div className="divide-y">
            {bills
              .filter((b) => b.status !== "Paid")
              .slice(0, 5)
              .map((b) => (
                <Link
                  key={b.id}
                  to="/billing/$id"
                  params={{ id: b.id }}
                  className="flex items-center gap-3 py-2.5 first:pt-0 hover:opacity-80"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{nameOf(b.patientId)?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.invoiceNo} · {formatDate(b.date)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{inr(billTotal(b) - b.amountReceived)}</span>
                </Link>
              ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
