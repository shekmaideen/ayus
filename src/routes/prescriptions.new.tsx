import { createFileRoute, Link, useNavigate, useBlocker } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, FileDown, Plus, Printer, Save, Trash2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { can, useClinic } from "@/store/clinic";
import { inr, todayISO, formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isPotencyApplicable, isBrandApplicable, type Bill, type Prescription, type PrescriptionItem, type Medicine, type Patient } from "@/data/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildPrescriptionMessage, openWhatsAppMessage } from "@/lib/whatsapp";
import {
  PrescriptionPrintSheet,
  parseClinicalNotes,
  serializeClinicalNotes,
} from "@/components/PrescriptionPrintSheet";
import {
  getPrescriptionPdfFilename,
  generatePdfFromElement,
  renderAndGeneratePdf,
  downloadPdfFile,
  sharePdfViaWhatsApp,
  validateAndNormalizePhone,
} from "@/lib/pdf-share";

export const Route = createFileRoute("/prescriptions/new")({
  validateSearch: (search: Record<string, unknown>): { patientId?: string; refill?: string; edit?: string; visitId?: string } => {
    const out: { patientId?: string; refill?: string; edit?: string; visitId?: string } = {};
    if (typeof search["patientId"] === "string") out.patientId = search["patientId"];
    if (typeof search["refill"] === "string") out.refill = search["refill"];
    if (typeof search["edit"] === "string") out.edit = search["edit"];
    if (typeof search["visitId"] === "string") out.visitId = search["visitId"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Prescription builder — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Build a homeopathic prescription, set a follow-up and print an A4 sheet for Dr. Ayus Homoeopathy Hospital." },
      { property: "og:title", content: "Prescription builder — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Build a homeopathic prescription, set a follow-up and print an A4 sheet for Dr. Ayus Homoeopathy Hospital." },
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
import { MedicineCombobox } from "@/components/MedicineCombobox";

interface PatientComboboxProps {
  value: string;
  onChange: (patientId: string) => void;
  patients: Patient[];
}

function PatientCombobox({ value, onChange, patients }: PatientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedPatient = useMemo(() => patients.find((p) => p.id === value), [patients, value]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) {
      return patients.slice(0, 30);
    }
    const results: Patient[] = [];
    for (const p of patients) {
      if (!p) continue;
      if (
        p.name.toLowerCase().includes(t) ||
        p.phone.includes(t) ||
        p.regNo.toLowerCase().includes(t) ||
        (p.email && p.email.toLowerCase().includes(t))
      ) {
        results.push(p);
        if (results.length >= 35) break;
      }
    }
    return results;
  }, [patients, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-sm hover:bg-muted/40 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {selectedPatient ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="bg-primary-soft text-[10px] text-primary-soft-foreground">
                  {initials(selectedPatient.name)}
                </AvatarFallback>
              </Avatar>
              <div className="truncate">
                <strong className="font-semibold text-foreground">{selectedPatient.name}</strong>
                <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{selectedPatient.regNo}</span>
                {selectedPatient.phone && (
                  <span className="ml-1.5 text-[11px] text-muted-foreground">· {selectedPatient.phone}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Search by name, phone or reg no...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,440px)] p-2 shadow-xl" align="start">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type patient name, phone, or reg no..."
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1 text-xs divide-y divide-border/40">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No matching patients found for "{search}"
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left rounded-lg transition-colors hover:bg-primary-soft hover:text-primary-soft-foreground",
                  p.id === value && "bg-secondary font-medium",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary-soft text-[10px] text-primary-soft-foreground">
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground truncate">{p.name}</span>
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                        {p.regNo}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>{p.gender}</span>
                      <span>·</span>
                      <span>{p.age} yrs</span>
                      {p.phone && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{p.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Builder() {
  const { patientId, refill, edit, visitId } = Route.useSearch();
  const navigate = useNavigate();
  const {
    patients,
    medicines,
    prescriptions,
    bills,
    visits,
    templates,
    settings,
    role,
    savePrescription,
    updatePrescription,
    saveTemplate,
  } = useClinic();

  const editSource = edit ? prescriptions.find((p) => p.id === edit) : undefined;
  const refillSource = refill ? prescriptions.find((p) => p.id === refill) : undefined;
  const sourceRx = editSource || refillSource;
  const initialNotes = parseClinicalNotes(sourceRx?.notes);

  const [selected, setSelected] = useState(patientId ?? editSource?.patientId ?? "");
  const [items, setItems] = useState<PrescriptionItem[]>(
    editSource
      ? editSource.items.map((i) => ({ ...i }))
      : refillSource
      ? refillSource.items.map((i) => ({ ...i, id: uid() }))
      : [blankRow()],
  );
  const [followUpDate, setFollowUpDate] = useState(sourceRx?.followUpDate ?? "");
  const [diagnosis, setDiagnosis] = useState(initialNotes.diagnosis);
  const [specialInstructions, setSpecialInstructions] = useState(initialNotes.specialInstructions);
  const [templateName, setTemplateName] = useState("");
  const [visitDate, setVisitDate] = useState(editSource?.date ?? todayISO());
  const [saved, setSaved] = useState<{ prescription: Prescription; bill?: Bill | undefined } | null>(null);

  // Sync if editing and data loaded asynchronously
  useEffect(() => {
    if (editSource) {
      setSelected(editSource.patientId);
      setItems(editSource.items.map((i) => ({ ...i })));
      setFollowUpDate(editSource.followUpDate ?? "");
      const parsed = parseClinicalNotes(editSource.notes);
      setDiagnosis(parsed.diagnosis);
      setSpecialInstructions(parsed.specialInstructions);
      if (editSource.date) setVisitDate(editSource.date);
    }
  }, [editSource?.id]);

  // Track unsaved changes
  const isDirty = !saved && (
    items.some((i) => Boolean(i.medicineId)) ||
    Boolean(diagnosis.trim()) ||
    Boolean(specialInstructions.trim())
  );

  // Warn on tab close / browser refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Block internal router navigation
  useBlocker({
    shouldBlockFn: () => {
      if (!isDirty) return false;
      return !window.confirm(
        "You have unsaved changes on this prescription. Are you sure you want to discard them and leave?"
      );
    },
    enableBeforeUnload: () => isDirty,
  });

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

  const selectMedicine = (id: string, m: Medicine) => {
    setItems((rows) => {
      const updated = rows.map((r) =>
        r.id === id
          ? {
              ...r,
              medicineId: m.id,
              medicineName: m.name,
              brand: "",
              formType: m.formType || "Bottle",
              potency: m.potency || "",
            }
          : r,
      );

      // When doctor adds a medicine in the last row, automatically append a new blank row
      const lastRow = updated[updated.length - 1];
      if (lastRow && lastRow.medicineId) {
        return [...updated, blankRow()];
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!patient) { toast.error("Select a patient first"); return; }
    const valid = items.filter((i) => i.medicineId);
    if (valid.length === 0) { toast.error("Add at least one medicine"); return; }
    const combinedNotes = serializeClinicalNotes(diagnosis, specialInstructions);

    if (editSource) {
      updatePrescription(editSource.id, {
        items: valid,
        followUpDate: followUpDate || null,
        notes: combinedNotes,
        date: visitDate,
      });
      const updatedRx: Prescription = {
        ...editSource,
        items: valid,
        followUpDate: followUpDate || null,
        notes: combinedNotes,
        date: visitDate,
      };
      const existingBill = bills.find((b) => b.prescriptionId === editSource.id);
      setSaved({ prescription: updatedRx, bill: existingBill });
      toast.success("Prescription updated successfully");
      return;
    }

    const result = savePrescription({
      patientId: patient.id,
      ...(visitId ? { visitId } : {}),
      items: valid,
      followUpDate: followUpDate || null,
      notes: combinedNotes,
      isRefill: !!refillSource,
      date: visitDate,
    });
    setSaved(result);
    toast.success("Prescription saved · bill generated");
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  const getPrescriptionPdfFile = async (): Promise<File | null> => {
    if (!saved || !patient) return null;
    const filename = getPrescriptionPdfFilename(patient.regNo, saved.prescription.date);
    return await renderAndGeneratePdf(
      <PrescriptionPrintSheet
        prescription={saved.prescription}
        patient={patient}
        visit={visits.find((v) => v.id === saved.prescription.visitId)}
        medicines={medicines}
        settings={settings}
      />,
      filename
    );
  };

  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true);
      const file = await getPrescriptionPdfFile();
      if (!file) {
        toast.error("Unable to generate the PDF. Please try again.");
        return;
      }
      downloadPdfFile(file, file.name);
      toast.success("Prescription PDF downloaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Unable to generate the PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendWhatsAppPdf = async () => {
    if (!saved || !patient) {
      toast.error("Please save the prescription before sending via WhatsApp.");
      return;
    }

    const phoneCheck = validateAndNormalizePhone(patient.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
      return;
    }

    try {
      setPdfLoading(true);
      const file = await getPrescriptionPdfFile();
      if (!file) {
        toast.error("Unable to generate the PDF. Please try again.");
        return;
      }
      await sharePdfViaWhatsApp({
        file,
        phone: patient.phone,
        patientName: patient.name,
        docType: "prescription",
      });
    } catch (err) {
      console.error(err);
      toast.error("Unable to generate the PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // SAVED PRESCRIPTION VIEW (Clean, Standalone A4 Print Sheet)
  // ─────────────────────────────────────────────────────────────────
  if (saved && patient) {
    return (
      <>
        <div className="no-print mb-6">
          <PageTitle
            title={editSource ? "Prescription updated" : "Prescription saved"}
            subtitle={
              editSource
                ? "Prescription has been updated successfully"
                : `Prescription ready for printing · Bill ${saved.bill?.invoiceNo ?? ""} generated`
            }
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4 text-emerald-600" /> Print
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
                {saved.bill && (
                  <Button asChild className="rounded-xl">
                    <Link to="/billing/$id" params={{ id: saved.bill.id }}>Open bill</Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/patients/$id" params={{ id: patient.id }}>Back to patient</Link>
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
          <WhatsAppButton
            label="Send WhatsApp PDF"
            loading={pdfLoading}
            onClick={handleSendWhatsAppPdf}
          />
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
        title={
          editSource
            ? "Edit prescription"
            : refillSource
            ? "Refill prescription"
            : "Prescription builder"
        }
        subtitle={
          editSource
            ? `Editing existing prescription · Date: ${formatDate(visitDate)}`
            : "Select medicines from inventory and build A4 prescription"
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="border-warning/50 bg-warning-soft text-warning-foreground text-xs py-1 px-2.5">
                ● Unsaved changes
              </Badge>
            )}
            <Button className="rounded-xl" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> {editSource ? "Save changes" : "Save prescription"}
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
                <PatientCombobox
                  value={selected}
                  onChange={setSelected}
                  patients={patients}
                />
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
                      const loadedRows = t.items.map((i) => ({ ...i, id: uid() }));
                      setItems([...loadedRows, blankRow()]);
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
                      {/* Row 1: Medicine Selection & Auto-fill Form */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Medicine</Label>
                          <MedicineCombobox
                            value={row.medicineId}
                            medicines={medicines}
                            onChange={(m) => selectMedicine(row.id, m)}
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
                            <Select
                              value={row.instructions === "After food" ? "After food" : "Before food"}
                              onValueChange={(val) => update(row.id, { instructions: val })}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Instructions" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Before food">Before food</SelectItem>
                                <SelectItem value="After food">After food</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove medicine"
                            className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setItems((r) => (r.length > 1 ? r.filter((x) => x.id !== row.id) : [blankRow()]))}
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
