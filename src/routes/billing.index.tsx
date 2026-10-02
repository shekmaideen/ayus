import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { billTotal, useClinic } from "@/store/clinic";
import { formatDate, inr, todayISO } from "@/lib/format";
import type { Bill } from "@/data/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildBillingMessage, openWhatsAppMessage } from "@/lib/whatsapp";

export const Route = createFileRoute("/billing/")({
  head: () => ({
    meta: [
      { title: "Billing — HomeoCare Clinic Manager" },
      { name: "description", content: "Track clinic invoices, payment status and outstanding balances." },
      { property: "og:title", content: "Billing — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Track clinic invoices, payment status and outstanding balances." },
    ],
  }),
  component: () => (
    <AppShell>
      <Billing />
    </AppShell>
  ),
});

const statusClass = (s: string) =>
  s === "Paid"
    ? "bg-success-soft text-success"
    : s === "Partial"
      ? "bg-warning-soft text-warning-foreground"
      : "bg-danger-soft text-destructive";

function Billing() {
  const { bills, patients, role, settings, createManualBill } = useClinic();
  const navigate = useNavigate();
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [manualPatient, setManualPatient] = useState("");
  const [manualDate, setManualDate] = useState(todayISO());
  const [open, setOpen] = useState(false);

  const handleQuickWhatsApp = (b: Bill) => {
    const p = patients.find((pat) => pat.id === b.patientId);
    if (!p) {
      toast.error("Patient details not found for this bill.");
      return;
    }
    const message = buildBillingMessage({
      clinicName: settings.clinicName,
      patientName: p.name,
      billNo: b.invoiceNo,
      date: b.date,
      items: b.items.map((it) => ({
        label: it.label,
        qty: it.qty,
        rate: it.rate,
      })),
      totalAmount: billTotal(b),
    });
    openWhatsAppMessage(p.phone, message);
  };

  const nameOf = (id: string) => patients.find((p) => p.id === id)?.name ?? "Unknown";

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return bills
      .filter((b) => (tab === "All" ? true : b.status === tab))
      .filter((b) => !t || b.invoiceNo.toLowerCase().includes(t) || nameOf(b.patientId).toLowerCase().includes(t))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills, tab, q, patients]);

  const outstanding = bills.reduce((s, b) => s + (billTotal(b) - b.amountReceived), 0);

  return (
    <>
      <PageTitle
        title="Billing & payments"
        subtitle={`${inr(outstanding)} outstanding across ${bills.filter((b) => b.status !== "Paid").length} invoices`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Consultation-only bill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New consultation bill</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Select value={manualPatient} onValueChange={setManualPatient}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {p.regNo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} max={todayISO()} />
                </div>
              </div>
              <Button
                className="rounded-xl"
                onClick={() => {
                  if (!manualPatient) { toast.error("Select a patient"); return; }
                  const bill = createManualBill(manualPatient, manualDate);
                  setOpen(false);
                  toast.success(`Bill ${bill.invoiceNo} created`);
                  navigate({ to: "/billing/$id", params: { id: bill.id } });
                }}
              >
                Create bill
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="card-soft p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="rounded-xl">
              {["All", "Pending", "Partial", "Paid"].map((t) => (
                <TabsTrigger key={t} value={t} className="rounded-lg">{t}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative min-w-[13rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice or patient" className="rounded-xl pl-9" />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">No bills in this view.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {rows.map((b) => {
              const total = billTotal(b);
              const highlight = role === "receptionist" && b.readyForPayment && b.status !== "Paid";
              return (
                <Link
                  key={b.id}
                  to="/billing/$id"
                  params={{ id: b.id }}
                  className={`card-lift flex flex-wrap items-center gap-4 rounded-xl border p-4 ${
                    highlight ? "border-gold/50 bg-gold-soft" : "bg-card"
                  }`}
                >
                  <div className="min-w-[10rem] flex-1">
                    <p className="font-medium">{nameOf(b.patientId)}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.invoiceNo} · {formatDate(b.date)}</p>
                  </div>
                  {highlight && <Badge className="bg-gold text-gold-foreground hover:bg-gold">Ready for payment</Badge>}
                  <Badge variant="outline" className={statusClass(b.status)}>{b.status}</Badge>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{inr(total)}</p>
                      {b.status !== "Paid" && (
                        <p className="text-xs text-muted-foreground">Balance {inr(total - b.amountReceived)}</p>
                      )}
                    </div>
                    <WhatsAppButton
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickWhatsApp(b);
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
