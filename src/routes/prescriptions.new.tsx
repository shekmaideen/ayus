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
import { can, useClinic } from "@/store/clinic";
import { inr, todayISO, formatDate } from "@/lib/format";
import { isPotencyApplicable, isBrandApplicable, type Bill, type Prescription, type PrescriptionItem } from "@/data/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildPrescriptionMessage, openWhatsAppMessage } from "@/lib/whatsapp";
import {
  PrescriptionPrintSheet,
  parseClinicalNotes,
  serializeClinicalNotes,
} from "@/components/PrescriptionPrintSheet";

export const Route = createFileRoute("/prescriptions/new")({
  validateSearch: (search: Record<string, unknown>): { patientId?: string; refill?: string } => {
    const out: { patientId?: string; refill?: string } = {};
    if (typeof search["patientId"] === "string") out.patientId = search["patientId"];
    if (typeof search["refill"] === "string") out.refill = search["refill"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Prescription builder — Dr. Ayus Homeopathy Hospital" },
      { name: "description", content: "Build a homeopathic prescription, set a follow-up and print an A4 sheet for Dr. Ayus Homeopathy Hospital." },
      { property: "og:title", content: "Prescription builder — Dr. Ayus Homeopathy Hospital" },
      { property: "og:description", content: "Build a homeopathic prescription, set a follow-up and print an A4 sheet for Dr. Ayus Homeopathy Hospital." },
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
  brand: "",
  formType: "Bottle",
  potency: "30CH",
  dosage: "5 drops",
  frequency: "3 times/day",
  duration: "5 days",
  quantity: 1,
  instructions: "Before food",
});

function Builder() {
  const { patientId, refill } = Route.useSearch();
  const navigate = useNavigate();
  const { patients, medicines, prescriptions, visits, templates, settings, role, savePrescription, saveTemplate } = useClinic();

  const refillSource = refill ? prescriptions.find((p) => p.id === refill) : undefined;
  const initialNotes = parseClinicalNotes(refillSource?.notes);
  const [selected, setSelected] = useState(patientId ?? "");
  const [items, setItems] = useState<PrescriptionItem[]>(
    refillSource ? refillSource.items.map((i) => ({ ...i, id: uid() })) : [blankRow()],
  );
  const [followUpDate, setFollowUpDate] = useState(refillSource?.followUpDate ?? "");
  const [diagnosis, setDiagnosis] = useState(initialNotes.diagnosis);
  const [specialInstructions, setSpecialInstructions] = useState(initialNotes.specialInstructions);
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
    const combinedNotes = serializeClinicalNotes(diagnosis, specialInstructions);
    const result = savePrescription({
      patientId: patient.id,
      items: valid,
      followUpDate: followUpDate || null,
      notes: combinedNotes,
      isRefill: !!refillSource,
      date: visitDate,
    });
    setSaved(result);
    toast.success("Prescription saved · bill generated");
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

  // ─────────────────────────────────────────────────────────────────
  // SAVED PRESCRIPTION VIEW (Clean, Standalone A4 Print Sheet)
  // ─────────────────────────────────────────────────────────────────
  if (saved && patient) {
    return (
      <>
        <div className="no-print mb-6">
          <PageTitle
            title="Prescription saved"
            subtitle={`Prescription ready for printing · Bill ${saved.bill.invoiceNo} generated`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4 text-emerald-600" /> Print
                </Button>
                <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => window.print()}>
                  <FileDown className="mr-2 h-4 w-4 text-primary" /> Save as PDF
                </Button>
                <WhatsAppButton onClick={handleSendWhatsApp} />
                <Button asChild className="rounded-xl">
                  <Link to="/billing/$id" params={{ id: saved.bill.id }}>Open bill</Link>
                </Button>
              </div>
            }
          />
        </div>

        {/* Clean, Authentic Hospital Prescription Document */}
        <PrescriptionPrintSheet
          prescription={saved.prescription}
          patient={patient}
          visit={visits.find((v) => v.id === saved.prescription.visitId)}
          medicines={medicines}
          settings={settings}
        />

        <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setSaved(null);
              setItems([blankRow()]);
              setDiagnosis("");
              setSpecialInstructions("");
            }}
          >
            Write another prescription
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <WhatsAppButton onClick={handleSendWhatsApp} />
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PRESCRIPTION BUILDER FORM
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageTitle
        title={refillSource ? "Refill prescription" : "Prescription builder"}
        subtitle="Select medicines from inventory and build A4 prescription"
        action={
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-xl" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Save prescription
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Patient and Visit Details */}
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

          {/* Medicines List */}
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
                    <div className="mb-3 space-y-3 rounded-xl border p-4">
                      {/* Row 1: Medicine Selection & Auto-fill Form / Brand */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                                  brand: m.brand || "—",
                                  formType: m.formType || "Bottle",
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
                          <Label className="text-xs">Brand</Label>
                          <Input
                            value={row.brand ?? ""}
                            onChange={(e) => update(row.id, { brand: e.target.value })}
                            placeholder="e.g. SBL, Schwabe..."
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Form</Label>
                          <Input
                            value={row.formType ?? ""}
                            onChange={(e) => update(row.id, { formType: e.target.value })}
                            placeholder="e.g. Bottle, Tablet..."
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      {/* Row 2: Potency, Dosage, Frequency, Duration, Qty, Instructions */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <div className="space-y-1.5 sm:col-span-1">
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
                        <div className="space-y-1.5 sm:col-span-1">
                          <Label className="text-xs">Dosage</Label>
                          <Input value={row.dosage} onChange={(e) => update(row.id, { dosage: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-1">
                          <Label className="text-xs">Frequency</Label>
                          <Input value={row.frequency} onChange={(e) => update(row.id, { frequency: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-1">
                          <Label className="text-xs">Duration</Label>
                          <Input value={row.duration} onChange={(e) => update(row.id, { duration: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => update(row.id, { quantity: Math.max(1, Number(e.target.value)) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="flex items-end gap-2 sm:col-span-1">
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-xs">Instructions</Label>
                            <Input value={row.instructions} onChange={(e) => update(row.id, { instructions: e.target.value })} className="h-9 text-xs" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove medicine"
                            className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setItems((r) => (r.length > 1 ? r.filter((x) => x.id !== row.id) : r))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Clinical Notes & Special Instructions */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rx-diag" className="text-xs font-semibold">Diagnosis / Clinical Notes</Label>
                <Textarea
                  id="rx-diag"
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute bronchitis, Rhus tox indicated..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rx-instructions" className="text-xs font-semibold">Special Instructions</Label>
                <Textarea
                  id="rx-instructions"
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Avoid sour foods, take with warm water, avoid raw onions..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Billing Preview & Template */}
        <div className="space-y-4">
          <div className="card-soft p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bill preview</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Consultation</dt><dd>{inr(settings.consultationFee)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Medicines</dt><dd>{inr(total)}</dd></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><dt>Estimated total</dt><dd>{inr(total + settings.consultationFee)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Exact fees are applied when the prescription is saved, based on whether this is a new or follow-up visit. Stock is not automatically deducted.
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
            <Button variant="ghost" className="w-full" onClick={() => navigate({ to: "/patients" })}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
