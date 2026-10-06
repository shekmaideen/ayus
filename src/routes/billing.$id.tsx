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
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildBillingMessage, openWhatsAppMessage } from "@/lib/whatsapp";
import { BillPrintSheet } from "@/components/BillPrintSheet";
import {
  getBillPdfFilename,
  generatePdfFromElement,
  renderAndGeneratePdf,
  downloadPdfFile,
  sharePdfViaWhatsApp,
  validateAndNormalizePhone,
} from "@/lib/pdf-share";

export const Route = createFileRoute("/billing/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Itemised clinic invoice with payment status and printable receipt." },
      { property: "og:title", content: "Invoice — Dr. Ayus Homoeopathy Hospital" },
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

  const patient = patients.find((p) => p.id === bill.patientId);

  if (!patient) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Patient record not found for this invoice.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/billing">Back to billing</Link></Button>
      </div>
    );
  }

  const total = billTotal(bill);
  const balance = total - bill.amountReceived;

  const [pdfLoading, setPdfLoading] = useState(false);

  const getBillPdfFile = async (): Promise<File | null> => {
    if (!bill || !patient) return null;
    const filename = getBillPdfFilename(bill.invoiceNo);
    const element = document.getElementById("ayus-bill-document");
    if (element) {
      return await generatePdfFromElement(element, filename);
    }
    return await renderAndGeneratePdf(
      <BillPrintSheet bill={bill} patient={patient} settings={settings} />,
      filename
    );
  };

  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true);
      const file = await getBillPdfFile();
      if (!file) {
        toast.error("Unable to generate the PDF. Please try again.");
        return;
      }
      downloadPdfFile(file, file.name);
      toast.success("Bill PDF downloaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Unable to generate the PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendWhatsAppPdf = async () => {
    if (!bill || !patient) {
      toast.error("Bill or patient details not found.");
      return;
    }

    const phoneCheck = validateAndNormalizePhone(patient.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
      return;
    }

    try {
      setPdfLoading(true);
      const file = await getBillPdfFile();
      if (!file) {
        toast.error("Unable to generate the PDF. Please try again.");
        return;
      }
      await sharePdfViaWhatsApp({
        file,
        phone: patient.phone,
        patientName: patient.name,
        docType: "bill",
        billNumber: bill.invoiceNo,
      });
    } catch (err) {
      console.error(err);
      toast.error("Unable to generate the PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/billing"><ArrowLeft className="mr-1.5 h-4 w-4" /> All bills</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4 text-emerald-600" /> Print receipt
          </Button>
          <Button
            variant="outline"
            className="rounded-xl shadow-sm"
            disabled={pdfLoading}
            onClick={handleDownloadPdf}
          >
            <FileDown className="mr-2 h-4 w-4 text-primary" /> Save as PDF
          </Button>
          <WhatsAppButton
            label="Send WhatsApp PDF"
            loading={pdfLoading}
            onClick={handleSendWhatsAppPdf}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-x-auto">
          <BillPrintSheet bill={bill} patient={patient} settings={settings} />
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
