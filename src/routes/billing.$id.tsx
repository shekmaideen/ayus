import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Plus, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeafMark } from "@/components/Logo";
import { billTotal, useClinic } from "@/store/clinic";
import { formatDate, inr } from "@/lib/format";
import type { BillStatus } from "@/data/types";

export const Route = createFileRoute("/billing/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — HomeoCare Clinic Manager" },
      { name: "description", content: "Itemised clinic invoice with payment status and printable receipt." },
      { property: "og:title", content: "Invoice — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Itemised clinic invoice with payment status and printable receipt." },
    ],
  }),
  component: () => (
    <AppShell>
      <BillDetail />
    </AppShell>
  ),
});

function BillDetail() {
  const { id } = Route.useParams();
  const { bills, patients, settings, updateBill, addBillItem } = useClinic();
  const bill = bills.find((b) => b.id === id);
  const [charge, setCharge] = useState({ label: "", qty: "1", rate: "" });

  if (!bill) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/billing">Back to billing</Link></Button>
      </div>
    );
  }

  const patient = patients.find((p) => p.id === bill.patientId)!;
  const total = billTotal(bill);
  const balance = total - bill.amountReceived;

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/billing"><ArrowLeft className="mr-1.5 h-4 w-4" /> All bills</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print receipt
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="print-sheet card-soft p-8 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
            <div className="flex items-center gap-3">
              {settings.logoDataUrl ? (
                <img src={settings.logoDataUrl} alt="Clinic logo" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <LeafMark className="h-12 w-12 text-primary" />
              )}
              <div>
                <p className="font-display text-2xl">{settings.clinicName}</p>
                <p className="text-xs text-muted-foreground">{settings.address}</p>
                <p className="text-xs text-muted-foreground">{settings.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-xl">Receipt</p>
              <p className="font-mono text-sm">{bill.invoiceNo}</p>
              <p className="text-xs text-muted-foreground">{formatDate(bill.date)}</p>
            </div>
          </div>

          <div className="grid gap-1 border-b py-4 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Billed to:</span> <strong>{patient.name}</strong></p>
            <p><span className="text-muted-foreground">Reg No:</span> {patient.regNo}</p>
            <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
            <p><span className="text-muted-foreground">Status:</span> {bill.status}</p>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Item</th><th className="w-16 text-right">Qty</th><th className="w-24 text-right">Rate</th><th className="w-28 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y">
              {bill.items.map((it, i) => (
                <tr key={`${it.label}-${i}`}>
                  <td className="py-2.5">{it.label}</td>
                  <td className="text-right">{it.qty}</td>
                  <td className="text-right">{inr(it.rate)}</td>
                  <td className="text-right font-medium">{inr(it.qty * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Received</span><span>{inr(bill.amountReceived)}</span></div>
            <div className="flex justify-between border-t pt-2 font-display text-xl">
              <span>Balance</span><span>{inr(balance)}</span>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Thank you for visiting {settings.clinicName}. Wishing you good health.
          </p>
        </div>

        <div className="no-print space-y-4">
          <div className="card-soft p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Payment status</Label>
                <Select
                  value={bill.status}
                  onValueChange={(v) => {
                    const status = v as BillStatus;
                    updateBill(bill.id, {
                      status,
                      amountReceived: status === "Paid" ? total : status === "Pending" ? 0 : bill.amountReceived,
                      readyForPayment: status !== "Paid",
                    });
                    toast.success(`Marked ${status.toLowerCase()}`);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pending", "Partial", "Paid"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment mode</Label>
                <Select value={bill.paymentMode ?? ""} onValueChange={(v) => updateBill(bill.id, { paymentMode: v as "Cash" })}>
                  <SelectTrigger><SelectValue placeholder="Not recorded" /></SelectTrigger>
                  <SelectContent>
                    {["Cash", "UPI", "Card"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="received">Amount received</Label>
                <Input
                  id="received"
                  type="number"
                  value={bill.amountReceived}
                  onChange={(e) => {
                    const amt = Math.max(0, Math.min(total, Number(e.target.value)));
                    updateBill(bill.id, {
                      amountReceived: amt,
                      status: amt >= total ? "Paid" : amt > 0 ? "Partial" : "Pending",
                      readyForPayment: amt < total,
                    });
                  }}
                />
              </div>
              <div className="rounded-xl bg-secondary/60 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Balance due</span><span className="font-semibold">{inr(balance)}</span></div>
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={() => {
                  updateBill(bill.id, { status: "Paid", amountReceived: total, readyForPayment: false, paymentMode: bill.paymentMode ?? "Cash" });
                  toast.success("Payment collected in full");
                }}
              >
                Mark fully paid
              </Button>
            </div>
          </div>

          <div className="card-soft p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add manual charge</h3>
            <div className="space-y-3">
              <Input placeholder="Description" value={charge.label} onChange={(e) => setCharge({ ...charge, label: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min={1} placeholder="Qty" value={charge.qty} onChange={(e) => setCharge({ ...charge, qty: e.target.value })} />
                <Input type="number" min={0} placeholder="Rate" value={charge.rate} onChange={(e) => setCharge({ ...charge, rate: e.target.value })} />
              </div>
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => {
                  if (!charge.label.trim() || !charge.rate) { toast.error("Add a description and rate"); return; }
                  addBillItem(bill.id, charge.label.trim(), Number(charge.qty) || 1, Number(charge.rate));
                  setCharge({ label: "", qty: "1", rate: "" });
                  toast.success("Charge added");
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add charge
              </Button>
            </div>
          </div>

          <div className="card-soft p-5 text-sm">
            <Link to="/patients/$id" params={{ id: patient.id }} className="font-medium text-primary hover:underline">
              View {patient.name}'s profile
            </Link>
            <div className="mt-2">
              <Badge variant="outline">{patient.regNo}</Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
