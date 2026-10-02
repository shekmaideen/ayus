import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, FileDown, Plus, Printer, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LeafMark } from "@/components/Logo";
import { can, useClinic } from "@/store/clinic";
import { formatDate, inr, todayISO } from "@/lib/format";
import { isPotencyApplicable, isBrandApplicable, type Bill, type Prescription, type PrescriptionItem } from "@/data/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildPrescriptionMessage, openWhatsAppMessage } from "@/lib/whatsapp";

export const Route = createFileRoute("/prescriptions/new")({
  validateSearch: (search: Record<string, unknown>): { patientId?: string; refill?: string } => {
    const out: { patientId?: string; refill?: string } = {};
    if (typeof search["patientId"] === "string") out.patientId = search["patientId"];
    if (typeof search["refill"] === "string") out.refill = search["refill"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Prescription builder — HomeoCare Clinic Manager" },
      { name: "description", content: "Build a homeopathic prescription, set a follow-up and print an A4 sheet." },
      { property: "og:title", content: "Prescription builder — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Build a homeopathic prescription, set a follow-up and print an A4 sheet." },
    ],
  }),
  component: () => (
    <AppShell>
      <Builder />
    </AppShell>
  ),
});

const uid = () => Math.random().toString(36).slice(2, 9);

const blankRow = (): PrescriptionItem => ({
  id: uid(),
  medicineId: "",
  medicineName: "",
  potency: "30C",
  dosage: "4 pills",
  frequency: "Twice daily",
  duration: "7 days",
  quantity: 1,
  instructions: "After food",
});

function Builder() {
  const { patientId, refill } = Route.useSearch();
  const navigate = useNavigate();
  const { patients, medicines, prescriptions, templates, settings, role, savePrescription, saveTemplate } = useClinic();

  const refillSource = refill ? prescriptions.find((p) => p.id === refill) : undefined;
  const [selected, setSelected] = useState(patientId ?? "");
  const [items, setItems] = useState<PrescriptionItem[]>(
    refillSource ? refillSource.items.map((i) => ({ ...i, id: uid() })) : [blankRow()],
  );
  const [followUpDate, setFollowUpDate] = useState(refillSource?.followUpDate ?? "");
  const [notes, setNotes] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [visitDate, setVisitDate] = useState(todayISO());
  const [saved, setSaved] = useState<{ prescription: Prescription; bill: Bill } | null>(null);

  const patient = patients.find((p) => p.id === selected);
  const total = useMemo(
    () => items.reduce((s, i) => s + (medicines.find((m) => m.id === i.medicineId)?.price ?? 0) * i.quantity, 0),
    [items, medicines],
  );

  if (can(role, "prescription") !== "full") {
    return (
      <div className="card-soft p-12 text-center">
        <h2 className="font-display text-2xl">Doctor access only</h2>
        <p className="mt-2 text-sm text-muted-foreground">Prescriptions are hidden for the receptionist role.</p>
        <Button asChild variant="outline" className="mt-5 rounded-xl">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const update = (id: string, patch: Partial<PrescriptionItem>) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleSave = () => {
    if (!patient) { toast.error("Select a patient first"); return; }
    const valid = items.filter((i) => i.medicineId);
    if (valid.length === 0) { toast.error("Add at least one medicine"); return; }
    const result = savePrescription({
      patientId: patient.id,
      items: valid,
      followUpDate: followUpDate || null,
      notes,
      isRefill: !!refillSource,
      date: visitDate,
    });
    setSaved(result);
    toast.success("Prescription saved · stock updated · bill generated");
  };

  const handleSendWhatsApp = () => {
    if (!saved) {
      toast.error("Please save the prescription before sending the WhatsApp message.");
      return;
    }
    if (!patient) {
      toast.error("Please select a patient.");
      return;
    }

    const message = buildPrescriptionMessage({
      clinicName: settings.clinicName,
      doctorName: settings.doctorName,
      clinicPhone: settings.phone,
      patientName: patient.name,
      regNo: patient.regNo,
      visitDate: saved.prescription.date,
      items: saved.prescription.items.map((i) => ({
        medicineName: i.medicineName,
        potency: i.potency,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        instructions: i.instructions,
      })),
    });

    openWhatsAppMessage(patient.phone, message);
  };

  if (saved && patient) {
    return (
      <>
        <div className="no-print">
          <PageTitle
            title="Prescription saved"
            subtitle={`Bill ${saved.bill.invoiceNo} generated automatically`}
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
                  <FileDown className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <WhatsAppButton onClick={handleSendWhatsApp} />
                <Button asChild className="rounded-xl">
                  <Link to="/billing/$id" params={{ id: saved.bill.id }}>Open bill</Link>
                </Button>
              </div>
            }
          />
        </div>

        <div className="print-sheet mx-auto max-w-[820px] card-soft p-10">
          <div className="flex items-start justify-between border-b pb-5">
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
            <div className="text-right text-xs text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">{settings.doctorName}</p>
              <p>Date: {formatDate(saved.prescription.date)}</p>
            </div>
          </div>

          <div className="grid gap-2 border-b py-4 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Patient:</span> <strong>{patient.name}</strong></p>
            <p><span className="text-muted-foreground">Reg No:</span> {patient.regNo}</p>
            <p><span className="text-muted-foreground">Age / Gender:</span> {patient.age} / {patient.gender}</p>
            <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
          </div>

          <p className="mt-5 font-display text-3xl text-primary">℞</p>
          <table className="mt-2 w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Medicine</th><th>Potency</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th></tr>
            </thead>
            <tbody className="divide-y">
              {saved.prescription.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2.5">
                    <span className="font-medium">{i.medicineName}</span>
                    {i.instructions && <span className="block text-xs text-muted-foreground">{i.instructions}</span>}
                  </td>
                  <td>{i.potency && i.potency.trim() !== "" && i.potency !== "-" ? i.potency : "—"}</td>
                  <td>{i.dosage}</td>
                  <td>{i.frequency}</td>
                  <td>{i.duration}</td>
                  <td>{i.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {saved.prescription.notes && (
            <p className="mt-5 text-sm"><span className="text-muted-foreground">Notes:</span> {saved.prescription.notes}</p>
          )}
          {saved.prescription.followUpDate && (
            <p className="mt-3 inline-block rounded-lg bg-primary-soft px-3 py-1.5 text-sm text-primary-soft-foreground">
              Next follow-up: {formatDate(saved.prescription.followUpDate)}
            </p>
          )}

          <div className="mt-16 flex justify-end">
            <div className="text-center">
              <p className="font-display text-xl italic text-primary">{settings.doctorName.split(",")[0]}</p>
              <p className="mt-1 border-t pt-1 text-xs text-muted-foreground">Signature</p>
            </div>
          </div>
        </div>

        <div className="no-print mt-6 flex justify-center">
          <Button variant="ghost" onClick={() => { setSaved(null); setItems([blankRow()]); setNotes(""); }}>
            Write another prescription
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={refillSource ? "Refill prescription" : "Prescription builder"}
        subtitle="Medicines are matched against live inventory stock"
        action={
          <Button className="rounded-xl" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save prescription
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card-soft p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger><SelectValue placeholder="Select a patient" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {p.regNo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vd">Visit date (Backdate)</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="vd" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} max={todayISO()} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu">Follow-up date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="fu" type="date" min={todayISO()} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="pl-9" />
                </div>
              </div>
            </div>
            {patient && patient.allergies.length > 0 && (
              <div className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-destructive">
                Allergy alert: {patient.allergies.join(", ")}
              </div>
            )}
          </div>

          <div className="card-soft p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Medicines</h3>
              <div className="flex gap-2">
                <Select
                  onValueChange={(v) => {
                    const t = templates.find((x) => x.id === v);
                    if (t) {
                      setItems(t.items.map((i) => ({ ...i, id: uid() })));
                      toast.success(`Loaded template "${t.name}"`);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Load template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setItems((r) => [...r, blankRow()])}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add row
                </Button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {items.map((row) => {
                const med = medicines.find((m) => m.id === row.medicineId);
                const hasPotency = med ? isPotencyApplicable(med.formType) : true;
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-3 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Medicine</Label>
                        <Select
                          value={row.medicineId}
                          onValueChange={(v) => {
                            const m = medicines.find((x) => x.id === v);
                            if (m) {
                              update(row.id, {
                                medicineId: v,
                                medicineName: m.name,
                                potency: m.potency || "",
                              });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Search inventory" /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {medicines.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                                {m.potency && m.potency.trim() !== "" && m.potency !== "-" ? ` · ${m.potency}` : ""}
                                {` · ${m.formType || "Bottle"}`}
                                {isBrandApplicable(m.formType) && m.brand ? ` (${m.brand})` : ""} · {m.stock} in stock · ₹{m.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Potency</Label>
                        {!hasPotency ? (
                          <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 font-mono text-xs text-muted-foreground">
                            N/A
                          </div>
                        ) : (
                          <Input
                            value={row.potency}
                            onChange={(e) => update(row.id, { potency: e.target.value })}
                            placeholder="e.g. 30CH, 200CH, 3X..."
                            className="h-9 font-mono text-xs"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Dosage</Label>
                        <Input value={row.dosage} onChange={(e) => update(row.id, { dosage: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Frequency</Label>
                        <Input value={row.frequency} onChange={(e) => update(row.id, { frequency: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Duration</Label>
                        <Input value={row.duration} onChange={(e) => update(row.id, { duration: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => update(row.id, { quantity: Math.max(1, Number(e.target.value)) })}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-xs">Instructions</Label>
                          <Input value={row.instructions} onChange={(e) => update(row.id, { instructions: e.target.value })} />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove medicine"
                          onClick={() => setItems((r) => (r.length > 1 ? r.filter((x) => x.id !== row.id) : r))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className="mt-2 space-y-2">
              <Label htmlFor="rx-notes">Notes for the patient</Label>
              <Textarea id="rx-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bill preview</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Consultation</dt><dd>{inr(settings.consultationFee)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Medicines</dt><dd>{inr(total)}</dd></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><dt>Estimated total</dt><dd>{inr(total + settings.consultationFee)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Exact fees are applied when the prescription is saved, based on whether this is a new or follow-up visit.
            </p>
          </div>

          <div className="card-soft p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Save as template</h3>
            <div className="flex gap-2">
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
              <Button
                variant="outline"
                onClick={() => {
                  const valid = items.filter((i) => i.medicineId);
                  if (!templateName.trim() || valid.length === 0) { toast.error("Name the template and add medicines"); return; }
                  saveTemplate(templateName.trim(), valid);
                  setTemplateName("");
                  toast.success("Template saved");
                }}
              >
                Save
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {templates.map((t) => (
                <Badge key={t.id} variant="secondary">{t.name}</Badge>
              ))}
            </div>
          </div>

          {refillSource && (
            <div className="rounded-2xl bg-primary-soft p-5 text-sm text-primary-soft-foreground">
              Refilling the prescription from {formatDate(refillSource.date)}. Edit anything before saving.
            </div>
          )}

          <div className="space-y-2">
            <Button className="h-11 w-full rounded-xl" onClick={handleSave}>
              Save prescription & generate bill
            </Button>
            <WhatsAppButton
              className="h-11 w-full justify-center"
              onClick={handleSendWhatsApp}
            />
            <Button variant="ghost" className="w-full" onClick={() => navigate({ to: "/patients" })}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
