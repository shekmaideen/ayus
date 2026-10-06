import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  X,
  CalendarClock,
  Printer,
  Clock,
  Search,
  Trash2,
  Receipt,
  CreditCard,
  CheckCircle2,
  Pill,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { billTotal, can, useClinic } from "@/store/clinic";
import { formatDate, formatComplaintDateTime, initials, inr, todayISO, getNowIST, parseISTDateTime, istToUtcString } from "@/lib/format";
import type { Bill, CaseHistory, Prescription, ChiefComplaint } from "@/data/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildBillingMessage, buildPrescriptionMessage, buildRegistrationMessage, openWhatsAppMessage } from "@/lib/whatsapp";
import { PrescriptionPrintSheet } from "@/components/PrescriptionPrintSheet";
import { BillPrintSheet } from "@/components/BillPrintSheet";
import {
  getPrescriptionPdfFilename,
  getBillPdfFilename,
  renderAndGeneratePdf,
  sharePdfViaWhatsApp,
  validateAndNormalizePhone,
} from "@/lib/pdf-share";

export const Route = createFileRoute("/patients/$id")({
  head: () => ({
    meta: [
      { title: "Patient profile — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Case history, visits, prescriptions and bills for a clinic patient." },
      { property: "og:title", content: "Patient profile — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Case history, visits, prescriptions and bills for a clinic patient." },
    ],
  }),
  component: () => (
    <AppShell>
      <PatientProfile />
    </AppShell>
  ),
});

const EMPTY_CH: CaseHistory = {
  chiefComplaint: "",
  presentIllness: "",
  pastHistory: "",
  familyHistory: "",
  diet: "",
  sleep: "",
  thermal: "",
  mentals: "",
  physicalGenerals: "",
  better: [],
  worse: [],
  updatedOn: "",
};

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (t: string[]) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Add a modality"
          onKeyDown={(e) => {
            if (e.key === "Enter" && v.trim()) {
              e.preventDefault();
              onChange([...tags, v.trim()]);
              setV("");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (v.trim()) {
              onChange([...tags, v.trim()]);
              setV("");
            }
          }}
        >
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <Badge key={`${t}-${i}`} variant="secondary">
            {t}
            <button className="ml-1.5" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((_, j) => j !== i))}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PatientProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const {
    patients,
    visits,
    medicines,
    prescriptions,
    bills,
    followUps,
    caseHistories,
    chiefComplaints,
    role,
    updatePatient,
    saveCaseHistory,
    addVisit,
    addChiefComplaint,
    updateChiefComplaint,
    deleteChiefComplaint,
    addFollowUp,
    savePrescription,
    setFollowUpStatus,
    settings,
    createManualBill,
    updateBill,
  } = useClinic();
  const patient = patients.find((p) => p.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [refillConfirm, setRefillConfirm] = useState(false);
  const [note, setNote] = useState({ complaint: "", notes: "" });
  const [ch, setCh] = useState<CaseHistory>(caseHistories[id] ?? EMPTY_CH);
  const [draft, setDraft] = useState(patient);
  const [printingRx, setPrintingRx] = useState<Prescription | null>(null);
  const [printingBill, setPrintingBill] = useState<Bill | null>(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billDate, setBillDate] = useState(todayISO());
  const [billFee, setBillFee] = useState<number>(settings.consultationFee ?? 300);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "visits" | "bills" | "prescriptions">("all");
  const [billsTabStatusFilter, setBillsTabStatusFilter] = useState<"all" | "Paid" | "Pending" | "Partial">("all");

  const handleCreateBill = () => {
    if (!patient) return;
    const newBill = createManualBill(patient.id, billDate || todayISO());
    const customFeeNum = Number(billFee);
    if (!isNaN(customFeeNum) && customFeeNum !== settings.consultationFee) {
      updateBill(newBill.id, {
        items: [{ label: "Consultation Fee", qty: 1, rate: customFeeNum }],
      });
    }
    toast.success(`Bill ${newBill.invoiceNo} created for ${patient.name}`);
    setBillDialogOpen(false);
    navigate({ to: "/billing/$id", params: { id: newBill.id } });
  };

  // Chief complaints state
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [newComplaintText, setNewComplaintText] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [complaintDate, setComplaintDate] = useState<string>(() => getNowIST().date);
  const [complaintTime, setComplaintTime] = useState<string>(() => getNowIST().time);
  const [editingComplaint, setEditingComplaint] = useState<ChiefComplaint | null>(null);
  const [editText, setEditText] = useState("");
  const [editVisitId, setEditVisitId] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [deletingComplaint, setDeletingComplaint] = useState<ChiefComplaint | null>(null);
  const [complaintSearch, setComplaintSearch] = useState("");
  const [complaintVisitFilter, setComplaintVisitFilter] = useState("all");

  const handleSendRegistrationWhatsApp = () => {
    if (!patient) return;
    const message = buildRegistrationMessage({
      clinicName: settings.clinicName,
      doctorName: settings.doctorName,
      clinicPhone: settings.phone,
      patientName: patient.name,
      regNo: patient.regNo,
      registrationDate: patient.registeredOn,
    });
    openWhatsAppMessage(patient.phone, message);
  };

  const [sharingRxId, setSharingRxId] = useState<string | null>(null);
  const [sharingBillId, setSharingBillId] = useState<string | null>(null);

  const handleSendPrescriptionWhatsApp = async (rx: Prescription) => {
    if (!patient) return;
    const phoneCheck = validateAndNormalizePhone(patient.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
      return;
    }
    try {
      setSharingRxId(rx.id);
      const filename = getPrescriptionPdfFilename(patient.regNo, rx.date);
      const file = await renderAndGeneratePdf(
        <PrescriptionPrintSheet
          prescription={rx}
          patient={patient}
          visit={visits.find((v) => v.id === rx.visitId)}
          medicines={medicines}
          settings={settings}
        />,
        filename
      );
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
      setSharingRxId(null);
    }
  };

  const handleSendBillWhatsApp = async (b: Bill) => {
    if (!patient) return;
    const phoneCheck = validateAndNormalizePhone(patient.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
      return;
    }
    try {
      setSharingBillId(b.id);
      const filename = getBillPdfFilename(b.invoiceNo);
      const file = await renderAndGeneratePdf(
        <BillPrintSheet bill={b} patient={patient} settings={settings} />,
        filename
      );
      await sharePdfViaWhatsApp({
        file,
        phone: patient.phone,
        patientName: patient.name,
        docType: "bill",
        billNumber: b.invoiceNo,
      });
    } catch (err) {
      console.error(err);
      toast.error("Unable to generate the PDF. Please try again.");
    } finally {
      setSharingBillId(null);
    }
  };

  if (!patient) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Patient not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/patients">Back to patients</Link>
        </Button>
      </div>
    );
  }

  const pVisits = visits.filter((v) => v.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pComplaints = chiefComplaints
    .filter((c) => c.patientId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pPres = prescriptions.filter((p) => p.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pBills = bills.filter((b) => b.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pFollowUps = followUps.filter((f) => f.patientId === id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const refills = pPres.filter((p) => p.isRefill);
  const last = pPres[0];
  const caseAccess = can(role, "caseHistory");
  const canPrescribe = can(role, "prescription") === "full";
  const canEdit = can(role, "patients") === "full";

  const filteredComplaints = useMemo(() => {
    let list = pComplaints;
    if (complaintVisitFilter && complaintVisitFilter !== "all") {
      if (complaintVisitFilter === "unlinked") {
        list = list.filter((c) => !c.visitId);
      } else {
        list = list.filter((c) => c.visitId === complaintVisitFilter);
      }
    }
    if (complaintSearch.trim()) {
      const q = complaintSearch.toLowerCase().trim();
      list = list.filter((c) => c.complaint.toLowerCase().includes(q));
    }
    return list;
  }, [pComplaints, complaintVisitFilter, complaintSearch]);

  const timelineGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        visits: typeof pVisits;
        prescriptions: typeof pPres;
        bills: typeof pBills;
      }
    >();

    const getEntry = (d: string) => {
      let entry = map.get(d);
      if (!entry) {
        entry = { date: d, visits: [], prescriptions: [], bills: [] };
        map.set(d, entry);
      }
      return entry;
    };

    pVisits.forEach((v) => getEntry(v.date).visits.push(v));
    pPres.forEach((rx) => getEntry(rx.date).prescriptions.push(rx));
    pBills.forEach((b) => getEntry(b.date).bills.push(b));

    const allDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return allDates.map((d) => map.get(d)!);
  }, [pVisits, pPres, pBills]);

  const filteredTimelineGroups = useMemo(() => {
    if (timelineFilter === "all") return timelineGroups;
    if (timelineFilter === "visits") return timelineGroups.filter((g) => g.visits.length > 0);
    if (timelineFilter === "bills") return timelineGroups.filter((g) => g.bills.length > 0);
    if (timelineFilter === "prescriptions") return timelineGroups.filter((g) => g.prescriptions.length > 0);
    return timelineGroups;
  }, [timelineGroups, timelineFilter]);

  const filteredBills = useMemo(() => {
    if (billsTabStatusFilter === "all") return pBills;
    return pBills.filter((b) => b.status === billsTabStatusFilter);
  }, [pBills, billsTabStatusFilter]);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/patients">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All patients
        </Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials(patient.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-[14rem] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl">{patient.name}</h1>
              <Badge variant="outline" className="font-mono">{patient.regNo}</Badge>
              {patient.allergies.map((a) => (
                <Badge key={a} className="bg-destructive text-destructive-foreground hover:bg-destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" /> {a}
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>{patient.age} years · {patient.gender}</span>
              <span>Blood group {patient.bloodGroup}</span>
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {patient.phone}</span>
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {patient.email}</span>
            </div>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {patient.address}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="active" className="text-sm text-muted-foreground">Active</Label>
              <Switch
                id="active"
                checked={patient.active}
                disabled={!canEdit}
                onCheckedChange={(v) => {
                  updatePatient(patient.id, { active: v });
                  toast.success(v ? "Patient marked active" : "Patient marked inactive");
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button variant="outline" className="rounded-xl" onClick={() => { setDraft(patient); setEditOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
              {canEdit && (
                <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-xl">
                      <CalendarClock className="mr-2 h-4 w-4" /> Add follow-up
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule follow-up</DialogTitle>
                      <DialogDescription>Set a follow-up reminder for {patient.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={followUpDate}
                          min={todayISO()}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reason</Label>
                        <Input
                          placeholder="e.g. Check progress on new medicine"
                          value={followUpReason}
                          onChange={(e) => setFollowUpReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setFollowUpOpen(false)}>Cancel</Button>
                      <Button
                        onClick={() => {
                          if (!followUpDate) {
                            toast.error("Please select a date");
                            return;
                          }
                          addFollowUp(patient.id, followUpDate, followUpReason || "General review");
                          toast.success("Follow-up scheduled");
                          setFollowUpOpen(false);
                          setFollowUpDate("");
                          setFollowUpReason("");
                        }}
                      >
                        Save follow-up
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {caseAccess === "full" && (
                <Button
                  variant="outline"
                  className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 shadow-sm"
                  onClick={() => {
                    const todayVisit = pVisits.find((v) => v.date === todayISO());
                    setSelectedVisitId(todayVisit ? todayVisit.id : "");
                    setNewComplaintText("");
                    setComplaintDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Complaint
                </Button>
              )}
              {canPrescribe && (
                <Button asChild className="rounded-xl">
                  <Link to="/prescriptions/new" search={{ patientId: patient.id }}>
                    <Plus className="mr-2 h-4 w-4" /> New prescription
                  </Link>
                </Button>
              )}
              {can(role, "billing") !== "hidden" && (
                <Button
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  onClick={() => {
                    setBillDate(todayISO());
                    setBillFee(settings.consultationFee ?? 300);
                    setBillDialogOpen(true);
                  }}
                >
                  <Receipt className="mr-2 h-4 w-4" /> New Bill
                </Button>
              )}
              <WhatsAppButton label="Send WhatsApp" isPdf={false} onClick={handleSendRegistrationWhatsApp} />
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-secondary p-1">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          {caseAccess !== "hidden" && (
            <TabsTrigger value="complaints" className="rounded-lg">
              Chief Complaints
              {pComplaints.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
                  {pComplaints.length}
                </span>
              )}
            </TabsTrigger>
          )}
          {caseAccess !== "hidden" && <TabsTrigger value="case" className="rounded-lg">Case History</TabsTrigger>}
          <TabsTrigger value="timeline" className="rounded-lg">
            Timeline
            {timelineGroups.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
                {timelineGroups.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="followups" className="rounded-lg">
            Follow-ups
            {pFollowUps.filter((f) => f.status === "Pending").length > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white">
                {pFollowUps.filter((f) => f.status === "Pending").length}
              </span>
            )}
          </TabsTrigger>
          {caseAccess !== "hidden" && (
            <TabsTrigger value="rx" className="rounded-lg">
              Prescriptions
              {pPres.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
                  {pPres.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="bills" className="rounded-lg">
            Bills
            {pBills.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                {pBills.length}
              </span>
            )}
            {pBills.some((b) => b.status !== "Paid") && (
              <span className="ml-1 h-2 w-2 rounded-full bg-destructive" title="Unpaid balance" />
            )}
          </TabsTrigger>
          {caseAccess !== "hidden" && <TabsTrigger value="refills" className="rounded-lg">Refill History</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="card-soft p-5 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Visits", pVisits.length],
                ["Prescriptions", pPres.length],
                ["Bills", pBills.length],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-secondary/60 p-4">
                  <p className="font-display text-2xl">{v as number}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{l as string}</p>
                </div>
              ))}
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Occupation</dt><dd className="font-medium">{patient.occupation || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Registered on</dt><dd className="font-medium">{formatDate(patient.registeredOn)}</dd></div>
              <div>
                <dt className="text-muted-foreground">Latest Chief Complaint</dt>
                <dd className="font-medium">
                  {pComplaints[0] ? (
                    <div>
                      <span>{pComplaints[0].complaint}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {formatComplaintDateTime(pComplaints[0].createdAt)}
                      </span>
                    </div>
                  ) : (
                    caseHistories[id]?.chiefComplaint || "Not recorded"
                  )}
                </dd>
              </div>
              <div><dt className="text-muted-foreground">Outstanding</dt><dd className="font-medium">{inr(pBills.reduce((s, b) => s + (billTotal(b) - b.amountReceived), 0))}</dd></div>
            </dl>
          </div>

          {can(role, "refill") === "full" && (
            <div className="card-soft p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick refill</h3>
              {last ? (
                <>
                  <p className="text-xs text-muted-foreground">Last prescription · {formatDate(last.date)}</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {last.items.map((i) => (
                      <li key={i.id} className="rounded-lg bg-secondary/60 px-3 py-2">
                        <span className="font-medium">{i.medicineName}</span> {i.potency}
                        <span className="block text-xs text-muted-foreground">{i.dosage} · {i.frequency} · {i.duration}</span>
                      </li>
                    ))}
                  </ul>
                  {refillConfirm ? (
                    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning-soft/40 p-3">
                      <p className="text-xs font-medium">Confirm one-click refill of {last.items.length} medicine(s)?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 rounded-lg"
                          onClick={() => {
                            savePrescription({
                              patientId: patient.id,
                              items: last.items,
                              followUpDate: null,
                              notes: `Refill of prescription from ${formatDate(last.date)}`,
                              isRefill: true,
                            });
                            toast.success("Refill prescription created!");
                            setRefillConfirm(false);
                          }}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Yes, create refill
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setRefillConfirm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl"
                        variant="outline"
                        onClick={() => setRefillConfirm(true)}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" /> One-click refill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => navigate({ to: "/prescriptions/new", search: { patientId: patient.id, refill: last.id } })}
                      >
                        Edit & refill
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No prescriptions yet.</p>
              )}
            </div>
          )}
        </TabsContent>

        {caseAccess !== "hidden" && (
          <TabsContent value="complaints" className="mt-5 space-y-4">
            <div className="card-soft p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Chief Complaints</h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological clinical complaint history · {pComplaints.length} record{pComplaints.length === 1 ? "" : "s"}
                  </p>
                </div>
                {caseAccess === "full" && (
                  <Button
                    className="rounded-xl shadow-sm"
                    onClick={() => {
                      const todayVisit = pVisits.find((v) => v.date === todayISO());
                      setSelectedVisitId(todayVisit ? todayVisit.id : "");
                      setNewComplaintText("");
                      const now = getNowIST();
                      setComplaintDate(now.date);
                      setComplaintTime(now.time);
                      setComplaintDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Add Chief Complaint
                  </Button>
                )}
              </div>

              {pComplaints.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search complaints..."
                      value={complaintSearch}
                      onChange={(e) => setComplaintSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  {pVisits.length > 0 && (
                    <div className="w-full sm:w-64">
                      <Select value={complaintVisitFilter} onValueChange={setComplaintVisitFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Filter by visit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Visits ({pComplaints.length})</SelectItem>
                          <SelectItem value="unlinked">General Consultation (Unlinked)</SelectItem>
                          {pVisits.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              Visit on {formatDate(v.date)} ({v.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(complaintSearch || complaintVisitFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setComplaintSearch("");
                        setComplaintVisitFilter("all");
                      }}
                      className="h-9 px-3 text-xs text-muted-foreground"
                    >
                      Reset filters
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-6">
                {filteredComplaints.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    {pComplaints.length === 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                          <Clock className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">No chief complaints recorded yet</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Every new consultation can record distinct date-stamped complaints.
                          </p>
                        </div>
                        {caseAccess === "full" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-xl"
                            onClick={() => {
                              const todayVisit = pVisits.find((v) => v.date === todayISO());
                              setSelectedVisitId(todayVisit ? todayVisit.id : "");
                              setNewComplaintText("");
                              const now = getNowIST();
                              setComplaintDate(now.date);
                              setComplaintTime(now.time);
                              setComplaintDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-1.5 h-4 w-4" /> Add First Complaint
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="py-6">
                        <p className="text-sm">No complaints match your search or filter.</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 text-xs"
                          onClick={() => {
                            setComplaintSearch("");
                            setComplaintVisitFilter("all");
                          }}
                        >
                          Clear search and filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative border-l-2 border-border/80 pl-6 sm:pl-8 space-y-6">
                    {filteredComplaints.map((c) => {
                      const linkedVisit = c.visitId ? visits.find((v) => v.id === c.visitId) : null;
                      return (
                        <div key={c.id} className="relative group">
                          {/* Timeline node */}
                          <div className="absolute -left-[31px] sm:-left-[39px] top-2 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background ring-4 ring-card" />

                          <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-sm hover:border-primary/40 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/40">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">
                                  {formatComplaintDateTime(c.createdAt)}
                                </span>
                                {linkedVisit ? (
                                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-normal">
                                    Visit: {formatDate(linkedVisit.date)} ({linkedVisit.type})
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-muted-foreground text-xs font-normal">
                                    General Consultation
                                  </Badge>
                                )}
                              </div>

                              {caseAccess === "full" && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                                    title="Edit complaint"
                                    onClick={() => {
                                      setEditingComplaint(c);
                                      setEditText(c.complaint);
                                      setEditVisitId(c.visitId || "");
                                      const parsed = parseISTDateTime(c.createdAt);
                                      setEditDate(parsed.date);
                                      setEditTime(parsed.time);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                                    title="Delete complaint"
                                    onClick={() => setDeletingComplaint(c)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            <p className="mt-3 text-sm sm:text-base font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                              {c.complaint}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="followups" className="mt-5">
          <div className="card-soft p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Follow-up history · {pFollowUps.length} total
              </h3>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setFollowUpOpen(true)}
                >
                  <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Add follow-up
                </Button>
              )}
            </div>

            {pFollowUps.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <CalendarClock className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
                <p className="text-sm text-muted-foreground">No follow-ups scheduled for this patient yet.</p>
                {canEdit && (
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setFollowUpOpen(true)}>
                    Schedule first follow-up
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative space-y-3">
                {pFollowUps.map((f, idx) => {
                  const isPending = f.status === "Pending";
                  const isOverdue = isPending && f.dueDate < todayISO();
                  return (
                    <div
                      key={f.id}
                      className={[
                        "flex flex-wrap items-start gap-4 rounded-xl border p-4 transition-colors",
                        isOverdue ? "border-destructive/30 bg-danger-soft/30" : isPending ? "border-warning/30 bg-warning-soft/30" : "border-border bg-secondary/30",
                      ].join(" ")}
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={[
                          "h-3 w-3 rounded-full ring-2 ring-offset-2",
                          f.status === "Completed" ? "bg-success ring-success/30" :
                          f.status === "Cancelled" ? "bg-muted-foreground ring-muted/30" :
                          isOverdue ? "bg-destructive ring-destructive/30" :
                          "bg-warning ring-warning/30",
                        ].join(" ")} />
                        {idx < pFollowUps.length - 1 && (
                          <div className="mt-1 h-full min-h-[2rem] w-px bg-border" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">{formatDate(f.dueDate)}</span>
                          <Badge
                            variant="outline"
                            className={
                              f.status === "Completed" ? "border-success/30 bg-success-soft text-success text-xs" :
                              f.status === "Cancelled" ? "bg-secondary text-muted-foreground text-xs" :
                              isOverdue ? "border-destructive/30 bg-danger-soft text-destructive text-xs" :
                              "border-warning/30 bg-warning-soft text-warning-foreground text-xs"
                            }
                          >
                            {isOverdue && f.status === "Pending" ? "Overdue" : f.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{f.reason}</p>
                      </div>

                      {canEdit && isPending && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg px-3 text-xs"
                            onClick={() => { setFollowUpStatus(f.id, "Completed"); toast.success("Marked as completed"); }}
                          >
                            ✓ Done
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg px-3 text-xs text-muted-foreground"
                            onClick={() => { setFollowUpStatus(f.id, "Cancelled"); toast("Follow-up cancelled"); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {caseAccess !== "hidden" && (
          <TabsContent value="case" className="mt-5">
            <div className="card-soft p-5">
              <Accordion type="multiple" defaultValue={["hpi"]} className="w-full">
                {([
                  ["hpi", "History of Present Illness", "presentIllness"],
                  ["pmh", "Past Medical History", "pastHistory"],
                  ["fh", "Family History", "familyHistory"],
                  ["mentals", "Mental / Emotional Symptoms", "mentals"],
                  ["pg", "Physical Generals", "physicalGenerals"],
                ] as const).map(([key, title, field]) => (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger className="text-sm font-semibold">{title}</AccordionTrigger>
                    <AccordionContent>
                      <Textarea
                        rows={3}
                        value={(ch[field as keyof CaseHistory] as string) ?? ""}
                        onChange={(e) => setCh({ ...ch, [field]: e.target.value })}
                        disabled={caseAccess !== "full"}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
                <AccordionItem value="personal">
                  <AccordionTrigger className="text-sm font-semibold">Personal History</AccordionTrigger>
                  <AccordionContent className="grid gap-3 sm:grid-cols-3">
                    {(["diet", "sleep", "thermal"] as const).map((f) => (
                      <div key={f} className="space-y-2">
                        <Label className="capitalize">{f === "thermal" ? "Thermal preference" : f}</Label>
                        <Input value={ch[f]} onChange={(e) => setCh({ ...ch, [f]: e.target.value })} disabled={caseAccess !== "full"} />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="modalities">
                  <AccordionTrigger className="text-sm font-semibold">Modalities</AccordionTrigger>
                  <AccordionContent className="grid gap-4 sm:grid-cols-2">
                    <TagInput label="Better from" tags={ch.better} onChange={(t) => setCh({ ...ch, better: t })} />
                    <TagInput label="Worse from" tags={ch.worse} onChange={(t) => setCh({ ...ch, worse: t })} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {caseAccess === "full" && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    className="rounded-xl"
                    onClick={() => {
                      saveCaseHistory(id, { ...ch, updatedOn: todayISO() });
                      toast.success("Case history saved");
                    }}
                  >
                    Save case history
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => setNoteOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add new visit note
                  </Button>
                  {ch.updatedOn && <span className="self-center text-xs text-muted-foreground">Last updated {formatDate(ch.updatedOn)}</span>}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="timeline" className="mt-5 space-y-4">
          <div className="card-soft p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
              <div>
                <h3 className="text-base font-semibold text-foreground">Clinical &amp; Billing Timeline</h3>
                <p className="text-xs text-muted-foreground">
                  Integrated chronological history of visits, prescriptions, and billing for {patient.name}
                </p>
              </div>

              {/* Timeline filter pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-secondary/60 p-1 rounded-xl">
                {[
                  { key: "all", label: "All Activities", count: timelineGroups.length },
                  { key: "visits", label: "Visits", count: pVisits.length },
                  { key: "bills", label: "Bills", count: pBills.length },
                  { key: "prescriptions", label: "Prescriptions", count: pPres.length },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTimelineFilter(f.key as any)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      timelineFilter === f.key
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>

            {filteredTimelineGroups.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p>No activity recorded in this view.</p>
              </div>
            ) : (
              <ol className="relative border-l border-border pl-6 space-y-8 mt-5">
                {filteredTimelineGroups.map((group) => {
                  return (
                    <li key={group.date} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-4 ring-primary/10" />

                      {/* Date Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-sm text-foreground">
                          {formatDate(group.date)}
                        </span>
                        {group.date === todayISO() && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] uppercase tracking-wider font-bold">
                            Today
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* 1. VISITS on this date */}
                        {group.visits.map((v) => (
                          <div
                            key={v.id}
                            className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    v.type === "New"
                                      ? "bg-info-soft text-info border-info/30"
                                      : "bg-primary-soft text-primary-soft-foreground border-primary/20"
                                  }
                                >
                                  {v.type} Visit
                                </Badge>
                                {v.complaint && (
                                  <span className="text-sm font-semibold text-foreground">
                                    {v.complaint}
                                  </span>
                                )}
                              </div>
                            </div>
                            {v.notes && (
                              <p className="text-sm text-muted-foreground bg-secondary/40 p-2.5 rounded-lg border border-border/40">
                                {v.notes}
                              </p>
                            )}
                          </div>
                        ))}

                        {/* 2. PRESCRIPTIONS on this date */}
                        {group.prescriptions.map((rx) => (
                          <div
                            key={rx.id}
                            className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Pill className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-sm font-semibold text-foreground">
                                  Prescription ({rx.items.length} medicine{rx.items.length === 1 ? "" : "s"})
                                </span>
                                {rx.isRefill && <Badge variant="secondary" className="text-xs">Refill</Badge>}
                                {rx.followUpDate && (
                                  <Badge variant="outline" className="text-xs">
                                    Next Review: {formatDate(rx.followUpDate)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <WhatsAppButton
                                  size="sm"
                                  label="WhatsApp"
                                  loading={sharingRxId === rx.id}
                                  onClick={() => handleSendPrescriptionWhatsApp(rx)}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-lg px-2.5 text-xs shadow-xs"
                                  onClick={() => setPrintingRx(rx)}
                                >
                                  <Printer className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Print
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {rx.items.map((i) => (
                                <span
                                  key={i.id}
                                  className="inline-flex items-center gap-1 rounded-md bg-background px-2.5 py-1 text-xs border font-medium text-foreground"
                                >
                                  <strong>{i.medicineName}</strong>
                                  <span className="text-muted-foreground">{i.potency}</span>
                                  <span className="text-[11px] text-muted-foreground/80">· {i.dosage}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* 3. BILLS on this date */}
                        {group.bills.map((b) => {
                          const total = billTotal(b);
                          const balance = total - b.amountReceived;
                          return (
                            <div
                              key={b.id}
                              className={`rounded-xl border p-4 space-y-3 transition-all ${
                                b.status === "Paid"
                                  ? "border-emerald-500/25 bg-emerald-500/5"
                                  : b.status === "Partial"
                                    ? "border-amber-500/25 bg-amber-500/5"
                                    : "border-rose-500/25 bg-rose-500/5"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-4 w-4 text-emerald-600" />
                                  <span className="font-mono font-bold text-sm text-foreground">
                                    {b.invoiceNo}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      b.status === "Paid"
                                        ? "bg-success-soft text-success border-success/30"
                                        : b.status === "Partial"
                                          ? "bg-warning-soft text-warning-foreground border-warning/30"
                                          : "bg-danger-soft text-destructive border-destructive/30"
                                    }
                                  >
                                    {b.status}
                                  </Badge>
                                  {b.paymentMode && (
                                    <Badge variant="secondary" className="text-xs">
                                      {b.paymentMode}
                                    </Badge>
                                  )}
                                  {b.prescriptionId ? (
                                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                      Prescription Bill
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                      Consultation Bill
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">
                                    {inr(total)}
                                  </span>
                                  {b.status !== "Paid" && (
                                    <span className="text-xs font-semibold text-destructive">
                                      (Due: {inr(balance)})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Items list */}
                              <div className="rounded-lg bg-background/80 p-2.5 border text-xs divide-y divide-border/60">
                                {b.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between py-1 first:pt-0 last:pb-0">
                                    <span className="font-medium text-foreground">
                                      {item.label} <span className="text-muted-foreground">× {item.qty}</span>
                                    </span>
                                    <span className="font-mono text-muted-foreground">
                                      {inr(item.qty * item.rate)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Bill Actions */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
                                <div className="text-xs text-muted-foreground">
                                  Paid: <strong className="text-foreground">{inr(b.amountReceived)}</strong>
                                  {b.status !== "Paid" && (
                                    <> · Balance: <strong className="text-destructive">{inr(balance)}</strong></>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg px-2.5 text-xs shadow-xs"
                                    asChild
                                  >
                                    <Link to="/billing/$id" params={{ id: b.id }}>
                                      <Receipt className="mr-1.5 h-3.5 w-3.5 text-primary" /> Open Bill
                                    </Link>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg px-2.5 text-xs shadow-xs"
                                    onClick={() => setPrintingBill(b)}
                                  >
                                    <Printer className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Print
                                  </Button>
                                  <WhatsAppButton
                                    size="sm"
                                    label="WhatsApp"
                                    loading={sharingBillId === b.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSendBillWhatsApp(b);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </TabsContent>


        {caseAccess !== "hidden" && (
          <TabsContent value="rx" className="mt-5 space-y-3">
            {pPres.length === 0 && <p className="card-soft p-10 text-center text-sm text-muted-foreground">No prescriptions yet.</p>}
            {pPres.map((rx) => (
              <div key={rx.id} className="card-soft p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{formatDate(rx.date)}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {rx.isRefill && <Badge variant="secondary">Refill</Badge>}
                    {rx.followUpDate && <Badge variant="outline">Follow-up {formatDate(rx.followUpDate)}</Badge>}
                    <WhatsAppButton
                      size="sm"
                      label="WhatsApp PDF"
                      loading={sharingRxId === rx.id}
                      onClick={() => handleSendPrescriptionWhatsApp(rx)}
                    />
                    {canPrescribe && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-2.5 text-xs shadow-sm hover:border-primary/40 hover:text-primary"
                        onClick={() => navigate({ to: "/prescriptions/new", search: { patientId: patient.id, edit: rx.id } })}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5 text-primary" /> Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2.5 text-xs shadow-sm"
                      onClick={() => setPrintingRx(rx)}
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Print
                    </Button>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="py-1.5">Medicine</th><th>Potency</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {rx.items.map((i) => (
                        <tr key={i.id}>
                          <td className="py-2 font-medium">{i.medicineName}</td>
                          <td>{i.potency}</td>
                          <td>{i.dosage}</td>
                          <td>{i.frequency}</td>
                          <td>{i.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </TabsContent>
        )}

        <TabsContent value="bills" className="mt-5 space-y-4">
          {/* Patient Billing Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-soft p-4 border-l-4 border-l-primary">
              <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {inr(pBills.reduce((s, b) => s + billTotal(b), 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{pBills.length} total invoice{pBills.length === 1 ? "" : "s"}</p>
            </div>
            <div className="card-soft p-4 border-l-4 border-l-success">
              <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold mt-1 text-success">
                {inr(pBills.reduce((s, b) => s + b.amountReceived, 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pBills.filter((b) => b.status === "Paid").length} settled
              </p>
            </div>
            <div className={`card-soft p-4 border-l-4 ${pBills.reduce((s, b) => s + (billTotal(b) - b.amountReceived), 0) > 0 ? "border-l-destructive bg-destructive/5" : "border-l-muted"}`}>
              <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Outstanding Balance</p>
              <p className={`text-2xl font-bold mt-1 ${pBills.reduce((s, b) => s + (billTotal(b) - b.amountReceived), 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {inr(pBills.reduce((s, b) => s + (billTotal(b) - b.amountReceived), 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pBills.filter((b) => b.status !== "Paid").length} pending payment
              </p>
            </div>
            <div className="card-soft p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Billing Action</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bill consultation or medicines</p>
              </div>
              <Button
                onClick={() => {
                  setBillDate(todayISO());
                  setBillFee(settings.consultationFee ?? 300);
                  setBillDialogOpen(true);
                }}
                className="mt-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Plus className="mr-1.5 h-4 w-4" /> New Bill
              </Button>
            </div>
          </div>

          {/* Action Bar & Filter Pills */}
          <div className="card-soft p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div>
                <h3 className="text-base font-semibold text-foreground">Patient Invoices &amp; Receipts</h3>
                <p className="text-xs text-muted-foreground">
                  Individual billing records for {patient.name} ({patient.regNo})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs"
                  asChild
                >
                  <Link to="/billing" search={{ patientId: patient.id }}>
                    View in Main Billing <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setBillDate(todayISO());
                    setBillFee(settings.consultationFee ?? 300);
                    setBillDialogOpen(true);
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-xs"
                >
                  <Receipt className="mr-1.5 h-3.5 w-3.5" /> Create Bill
                </Button>
              </div>
            </div>

            {/* Filter status pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "all", label: "All Bills", count: pBills.length },
                { key: "Paid", label: "Paid", count: pBills.filter((b) => b.status === "Paid").length },
                { key: "Partial", label: "Partial", count: pBills.filter((b) => b.status === "Partial").length },
                { key: "Pending", label: "Pending", count: pBills.filter((b) => b.status === "Pending").length },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setBillsTabStatusFilter(pill.key as any)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    billsTabStatusFilter === pill.key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>

            {filteredBills.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Receipt className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p>No bills found in this view.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl"
                  onClick={() => {
                    setBillDate(todayISO());
                    setBillFee(settings.consultationFee ?? 300);
                    setBillDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create first bill for {patient.name}
                </Button>
              </div>
            ) : (
              <div className="grid gap-3.5">
                {filteredBills.map((b) => {
                  const total = billTotal(b);
                  const balance = total - b.amountReceived;
                  return (
                    <div
                      key={b.id}
                      className="card-lift rounded-xl border bg-card p-4 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">
                            {b.invoiceNo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {formatDate(b.date)}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              b.status === "Paid"
                                ? "bg-success-soft text-success border-success/30"
                                : b.status === "Partial"
                                  ? "bg-warning-soft text-warning-foreground border-warning/30"
                                  : "bg-danger-soft text-destructive border-destructive/30"
                            }
                          >
                            {b.status}
                          </Badge>
                          {b.paymentMode && (
                            <Badge variant="secondary" className="text-xs">
                              <CreditCard className="mr-1 h-3 w-3" /> {b.paymentMode}
                            </Badge>
                          )}
                          {b.prescriptionId ? (
                            <Badge variant="outline" className="text-xs text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                              Prescription Bill
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-300">
                              Consultation Bill
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-sm text-foreground">{inr(total)}</p>
                            {b.status !== "Paid" && (
                              <p className="text-xs font-semibold text-destructive">
                                Due: {inr(balance)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Line items table */}
                      <div className="rounded-lg bg-secondary/30 p-2.5 border text-xs divide-y divide-border/60">
                        {b.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1 first:pt-0 last:pb-0">
                            <span className="font-medium text-foreground">
                              {item.label} <span className="text-muted-foreground">× {item.qty}</span>
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {inr(item.qty * item.rate)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Footer & Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          Paid: <strong className="text-foreground">{inr(b.amountReceived)}</strong>
                          {b.status !== "Paid" && (
                            <> · Balance: <strong className="text-destructive">{inr(balance)}</strong></>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg px-2.5 text-xs shadow-xs"
                            asChild
                          >
                            <Link to="/billing/$id" params={{ id: b.id }}>
                              <Receipt className="mr-1.5 h-3.5 w-3.5 text-primary" /> Open Bill
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg px-2.5 text-xs shadow-xs"
                            onClick={() => setPrintingBill(b)}
                          >
                            <Printer className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Print Receipt
                          </Button>
                          <WhatsAppButton
                            size="sm"
                            label="WhatsApp PDF"
                            loading={sharingBillId === b.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSendBillWhatsApp(b);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>


        {caseAccess !== "hidden" && (
          <TabsContent value="refills" className="mt-5">
            <div className="card-soft p-5">
              {refills.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No refills issued for this patient.</p>
              ) : (
                <ul className="divide-y">
                  {refills.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-3">
                      <RotateCcw className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{formatDate(r.date)}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {r.items.map((i) => i.medicineName).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>Edit patient</SheetTitle></SheetHeader>
          {draft && (
            <div className="mt-6 space-y-4 px-4 pb-8">
              {([
                ["regNo", "Registration Number"],
                ["name", "Full name"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["occupation", "Occupation"],
                ["bloodGroup", "Blood group"],
              ] as const).map(([field, label]) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{label}</Label>
                  <Input id={field} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="e-age">Age</Label>
                <Input id="e-age" type="number" value={draft.age} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-address">Address</Label>
                <Textarea id="e-address" rows={3} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={() => {
                  updatePatient(patient.id, draft);
                  setEditOpen(false);
                  toast.success("Patient details updated");
                }}
              >
                Save changes
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Add visit note</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="v-complaint">Chief complaint today</Label>
              <Input id="v-complaint" value={note.complaint} onChange={(e) => setNote({ ...note, complaint: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-notes">Notes</Label>
              <Textarea id="v-notes" rows={4} value={note.notes} onChange={(e) => setNote({ ...note, notes: e.target.value })} />
            </div>
            <Button
              className="w-full rounded-xl"
              onClick={() => {
                addVisit({
                  patientId: patient.id,
                  date: todayISO(),
                  type: pVisits.length ? "Follow-up" : "New",
                  complaint: note.complaint || "Consultation",
                  notes: note.notes,
                });
                setNote({ complaint: "", notes: "" });
                setNoteOpen(false);
                toast.success("Visit note added");
              }}
            >
              Save visit note
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!printingRx} onOpenChange={(open) => !open && setPrintingRx(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="no-print flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Prescription — Dr. Ayus Homoeopathy Hospital
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official prescription document ready for high-resolution printing or PDF export.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl shadow-sm"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 h-4 w-4 text-emerald-600" /> Print
              </Button>
            </div>
          </DialogHeader>

          {printingRx && patient && (
            <div className="py-2">
              <PrescriptionPrintSheet
                prescription={printingRx}
                patient={patient}
                visit={visits.find((v) => v.id === printingRx.visitId)}
                medicines={medicines}
                settings={settings}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Chief Complaint Modal */}
      <Dialog open={complaintDialogOpen} onOpenChange={setComplaintDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Chief Complaint</DialogTitle>
            <DialogDescription>
              Record a new chief complaint for {patient.name}. Date and time are automatically recorded in IST.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="chief-complaint-input" className="text-sm font-semibold">
                Chief Complaint *
              </Label>
              <Textarea
                id="chief-complaint-input"
                rows={3}
                placeholder="e.g. Stomach pain, Head pain, Nausea..."
                value={newComplaintText}
                onChange={(e) => setNewComplaintText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="complaint-date" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-primary" />
                  Date *
                </Label>
                <Input
                  id="complaint-date"
                  type="date"
                  value={complaintDate}
                  onChange={(e) => setComplaintDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="complaint-time" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Time *
                </Label>
                <Input
                  id="complaint-time"
                  type="time"
                  value={complaintTime}
                  onChange={(e) => setComplaintTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  Scheduled for: <strong className="font-semibold text-foreground">{formatComplaintDateTime(istToUtcString(complaintDate, complaintTime))}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const now = getNowIST();
                  setComplaintDate(now.date);
                  setComplaintTime(now.time);
                }}
                className="shrink-0 text-primary hover:underline font-medium text-[11px] ml-2"
              >
                Reset to Now
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Associated Visit</Label>
              <Select value={selectedVisitId || "none"} onValueChange={(val) => setSelectedVisitId(val === "none" ? "" : val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select visit (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General Consultation (No linked visit)</SelectItem>
                  {pVisits.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      Visit on {formatDate(v.date)} ({v.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setComplaintDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newComplaintText.trim()) {
                  toast.error("Please enter a chief complaint");
                  return;
                }
                if (!complaintDate) {
                  toast.error("Please select a date");
                  return;
                }
                const createdAtUtc = istToUtcString(complaintDate, complaintTime || "12:00");
                addChiefComplaint({
                  patientId: patient.id,
                  visitId: selectedVisitId || null,
                  complaint: newComplaintText.trim(),
                  createdAt: createdAtUtc,
                });
                toast.success("Chief complaint recorded");
                setNewComplaintText("");
                setComplaintDialogOpen(false);
              }}
            >
              Save Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Chief Complaint Modal */}
      <Dialog open={!!editingComplaint} onOpenChange={(open) => !open && setEditingComplaint(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chief Complaint</DialogTitle>
            <DialogDescription>
              Update this complaint entry. The historical creation timestamp is preserved.
            </DialogDescription>
          </DialogHeader>

          {editingComplaint && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-complaint-input" className="text-sm font-semibold">
                  Chief Complaint *
                </Label>
                <Textarea
                  id="edit-complaint-input"
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-complaint-date" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    Date *
                  </Label>
                  <Input
                    id="edit-complaint-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-complaint-time" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Time *
                  </Label>
                  <Input
                    id="edit-complaint-time"
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    Updated timestamp: <strong className="font-semibold text-foreground">{formatComplaintDateTime(istToUtcString(editDate, editTime))}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const now = getNowIST();
                    setEditDate(now.date);
                    setEditTime(now.time);
                  }}
                  className="shrink-0 text-primary hover:underline font-medium text-[11px] ml-2"
                >
                  Set to Now
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Associated Visit</Label>
                <Select value={editVisitId || "none"} onValueChange={(val) => setEditVisitId(val === "none" ? "" : val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select visit (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General Consultation (No linked visit)</SelectItem>
                    {pVisits.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        Visit on {formatDate(v.date)} ({v.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingComplaint(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editingComplaint) return;
                if (!editText.trim()) {
                  toast.error("Complaint cannot be empty");
                  return;
                }
                const createdAtUtc = editDate ? istToUtcString(editDate, editTime || "12:00") : undefined;
                updateChiefComplaint(editingComplaint.id, {
                  complaint: editText.trim(),
                  visitId: editVisitId || null,
                  createdAt: createdAtUtc,
                });
                toast.success("Chief complaint updated");
                setEditingComplaint(null);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chief Complaint Alert Dialog */}
      <AlertDialog open={!!deletingComplaint} onOpenChange={(open) => !open && setDeletingComplaint(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chief Complaint?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chief complaint record?
              {deletingComplaint && (
                <span className="mt-2 block rounded-lg border bg-secondary/50 p-2.5 font-medium text-foreground">
                  &ldquo;{deletingComplaint.complaint}&rdquo;
                  <span className="block text-xs font-normal text-muted-foreground mt-1">
                    Recorded on {formatComplaintDateTime(deletingComplaint.createdAt)}
                  </span>
                </span>
              )}
              <span className="mt-2 block text-xs text-muted-foreground">
                This will delete only this specific complaint record. Visits, prescriptions, and billing will not be affected.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingComplaint) return;
                deleteChiefComplaint(deletingComplaint.id);
                toast.success("Chief complaint deleted");
                setDeletingComplaint(null);
              }}
            >
              Delete Complaint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Bill Modal */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              New Bill for {patient.name}
            </DialogTitle>
            <DialogDescription>
              Create an official invoice for {patient.name} ({patient.regNo}). This will open the bill editor to add medicine charges or record payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-secondary/40 p-3 border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-semibold text-foreground">{patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reg. No:</span>
                <span className="font-mono text-foreground">{patient.regNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="text-foreground">{patient.phone}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-date-input" className="text-sm font-semibold">
                Bill / Invoice Date
              </Label>
              <Input
                id="bill-date-input"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                max={todayISO()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-fee-input" className="text-sm font-semibold">
                Consultation Fee (₹)
              </Label>
              <Input
                id="bill-fee-input"
                type="number"
                min={0}
                value={billFee}
                onChange={(e) => setBillFee(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Default clinic fee: {inr(settings.consultationFee)}. You can add medicine charges and other items on the bill page.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreateBill}
            >
              <Receipt className="mr-2 h-4 w-4" /> Create &amp; Open Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Bill Modal */}
      <Dialog open={!!printingBill} onOpenChange={(open) => !open && setPrintingBill(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="no-print flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Bill &amp; Receipt — {printingBill?.invoiceNo}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official medical invoice and receipt for {patient.name} ({patient.regNo}).
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl shadow-xs"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 h-4 w-4 text-emerald-600" /> Print
              </Button>
            </div>
          </DialogHeader>

          {printingBill && patient && (
            <div className="py-2">
              <BillPrintSheet bill={printingBill} patient={patient} settings={settings} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

