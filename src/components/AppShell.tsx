import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarClock,
  ChevronLeft,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Receipt,
  Search,
  Settings as SettingsIcon,
  Sun,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
// Supabase removed — using local MySQL auth
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { useHydrated } from "@/hooks/use-hydrated";
import { billTotal, can, useClinic } from "@/store/clinic";
import { cn } from "@/lib/utils";
import { formatDate, initials, inr, todayISO } from "@/lib/format";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "dashboard" },
  { to: "/patients", label: "Patients", icon: Users, feature: "patients" },
  { to: "/patients/new", label: "Register Patient", icon: UserPlus, feature: "registration" },
  { to: "/prescriptions/new", label: "Prescription", icon: Receipt, feature: "prescription" },
  { to: "/billing", label: "Billing", icon: Receipt, feature: "billing" },
  { to: "/inventory", label: "Inventory", icon: Package, feature: "inventory" },
  { to: "/follow-ups", label: "Follow-Ups", icon: CalendarClock, feature: "followUp" },
  { to: "/visit-search", label: "Visit Search", icon: FileSearch, feature: "patients" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, feature: "settings" },
] as const;

function SidebarNav({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed: boolean }) {
  const role = useClinic((s) => s.role);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.filter((n) => can(role, n.feature) !== "hidden").map((item) => {
        const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to + "/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary-soft-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {active && <span className="absolute left-0 h-6 w-1 rounded-r-full bg-primary" />}
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalSearch() {
  const patients = useClinic((s) => s.patients);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const t = q.toLowerCase();
    return patients
      .filter((p) => p.name.toLowerCase().includes(t) || p.phone.includes(t) || p.regNo.toLowerCase().includes(t))
      .slice(0, 6);
  }, [q, patients]);

  return (
    <div className="relative hidden w-full max-w-sm md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search patients by name, phone or reg no."
        aria-label="Global patient search"
        className="rounded-xl bg-secondary/60 pl-9"
      />
      {results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setQ("");
                navigate({ to: "/patients/$id", params: { id: p.id } });
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-secondary"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary-soft text-[11px] text-primary-soft-foreground">
                  {initials(p.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.regNo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { followUps, bills, medicines, settings, patients } = useClinic();
  const today = todayISO();
  const dueToday = followUps.filter((f) => f.status === "Pending" && f.dueDate === today);
  const pendingBills = bills.filter((b) => b.status !== "Paid").slice(0, 3);
  const lowStock = medicines.filter((m) => m.stock < settings.lowStockThreshold);
  const count = dueToday.length + lowStock.length;
  const nameOf = (id: string) => patients.find((p) => p.id === id)?.name ?? "Patient";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-80 overflow-auto p-2 text-sm">
          {dueToday.map((f) => (
            <div key={f.id} className="rounded-lg px-2 py-2 hover:bg-secondary">
              <p className="font-medium">Follow-up due today</p>
              <p className="text-xs text-muted-foreground">
                {nameOf(f.patientId)} — {f.reason}
              </p>
            </div>
          ))}
          {lowStock.slice(0, 4).map((m) => (
            <div key={m.id} className="rounded-lg px-2 py-2 hover:bg-secondary">
              <p className="font-medium text-destructive">Low stock: {m.name}</p>
              <p className="text-xs text-muted-foreground">{m.stock} units remaining</p>
            </div>
          ))}
          {pendingBills.map((b) => (
            <div key={b.id} className="rounded-lg px-2 py-2 hover:bg-secondary">
              <p className="font-medium">Payment {b.status.toLowerCase()}</p>
              <p className="text-xs text-muted-foreground">
                {b.invoiceNo} · {inr(billTotal(b) - b.amountReceived)} · {formatDate(b.date)}
              </p>
            </div>
          ))}
          {count === 0 && pendingBills.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function signOutEverywhere() {
  sessionStorage.removeItem("hc_token");
  document.cookie = "hc_token=; path=/; max-age=0";
  useClinic.getState().clear();
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); };

  const submit = async () => {
    if (next.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    if (next !== confirm) { toast.error("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { changeOwnPassword } = await import("@/lib/staff.functions");
      await changeOwnPassword({ data: { currentPassword: current, newPassword: next } });
      toast.success("Password changed successfully!");
      reset();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password, then choose a new one (min. 8 characters).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Your current password" />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Min. 8 characters" />
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Saving…" : "Save password"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const { role, loggedIn, loaded, dark, toggleDark, userName, followUps } = useClinic();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [overdubDismissed, setOverdueDismissed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const today = todayISO();
  const overdueCount = followUps.filter((f) => f.status === "Pending" && f.dueDate < today).length;

  useEffect(() => {
    if (hydrated && loaded && !loggedIn) navigate({ to: "/", replace: true });
  }, [hydrated, loaded, loggedIn, navigate]);

  if (!hydrated || !loaded || !loggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 font-medium text-muted-foreground animate-pulse tracking-wide">Loading...</p>
      </div>
    );
  }

  const meName = userName || "Staff";

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar py-5 transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div className="mb-6 flex items-center justify-between px-4">
          <Logo compact={collapsed} />
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="mt-auto px-3">
          {collapsed && (
            <Button variant="ghost" className="w-full" aria-label="Expand sidebar" onClick={() => setCollapsed(false)}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 pt-6">
          <div className="mb-6 px-5">
            <Logo />
          </div>
          <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Toggle theme" onClick={toggleDark}>
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </Button>
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-secondary" aria-label="User menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {initials(meName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-xs font-semibold">{meName}</span>
                    <span className="block text-[11px] capitalize text-muted-foreground">{role}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="flex items-center justify-between">
                  {meName}
                  <Badge variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setChangePwOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" /> Change password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOutEverywhere();
                    navigate({ to: "/", replace: true });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChangePasswordDialog open={changePwOpen} onClose={() => setChangePwOpen(false)} />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 px-4 py-6 md:px-8 md:py-8"
          >
            {overdueCount > 0 && !overdubDismissed && (
              <div className="no-print mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-danger-soft px-4 py-3 text-sm">
                <CalendarClock className="h-4 w-4 shrink-0 text-destructive" />
                <span className="flex-1 text-destructive">
                  <strong>{overdueCount} patient{overdueCount > 1 ? "s have" : " has"} overdue follow-up{overdueCount > 1 ? "s" : ""}.</strong>{" "}
                  <Link to="/follow-ups" className="underline underline-offset-2">View &amp; action now →</Link>
                </span>
                <button onClick={() => setOverdueDismissed(true)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-destructive/10">
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            )}
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
