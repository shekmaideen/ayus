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
  Eye,
  RefreshCw,
  Calendar,
  Activity,
  Check,
  Stethoscope,
  User,
  DollarSign,
  ExternalLink,
  ChevronDown,
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
import {
  formatDate,
  formatComplaintDateTime,
  initials,
  inr,
  todayISO,
  getNowIST,
  parseISTDateTime,
  istToUtcString,
} from "@/lib/format";
import type { Bill, CaseHistory, Prescription, ChiefComplaint, Visit, PrescriptionItem, FollowUp, Medicine } from "@/data/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildRegistrationMessage, openWhatsAppMessage } from "@/lib/whatsapp";
import { PrescriptionPrintSheet, parseClinicalNotes, serializeClinicalNotes } from "@/components/PrescriptionPrintSheet";
import { BillPrintSheet } from "@/components/BillPrintSheet";
import { PatientSummaryPrintSheet } from "@/components/PatientSummaryPrintSheet";
import { MedicineCombobox } from "@/components/MedicineCombobox";
import {
  getPrescriptionPdfFilename,
  getBillPdfFilename,
  renderAndGeneratePdf,
  sharePdfViaWhatsApp,
  validateAndNormalizePhone,
} from "@/lib/pdf-share";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patients/$id")({
  head: () => ({
    meta: [
      { title: "Patient Profile — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Complete medical profile, visit history, prescriptions and bills for Dr. Ayus Homoeopathy Hospital." },
      { property: "og:title", content: "Patient Profile — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Complete medical profile, visit history, prescriptions and bills for Dr. Ayus Homoeopathy Hospital." },
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

const uid = () => Math.random().toString(36).slice(2, 9);

function blankRxRow(): PrescriptionItem {
  return {
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
  };
}

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

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Dialog & Sheet States
  const [editOpen, setEditOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");

  const [ch, setCh] = useState<CaseHistory>(caseHistories[id] ?? EMPTY_CH);
  const [draft, setDraft] = useState(patient);

  const [printingRx, setPrintingRx] = useState<Prescription | null>(null);
  const [printingBill, setPrintingBill] = useState<Bill | null>(null);
  const [printingSummary, setPrintingSummary] = useState(false);

  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billDate, setBillDate] = useState(todayISO());
  const [billFee, setBillFee] = useState<number>(settings.consultationFee ?? 300);

  const [billsTabStatusFilter, setBillsTabStatusFilter] = useState<"all" | "Paid" | "Pending" | "Partial">("all");
  const [visitsViewMode, setVisitsViewMode] = useState<"timeline" | "table">("timeline");

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

  // Full visit dossier view modal
  const [fullVisitModal, setFullVisitModal] = useState<Visit | null>(null);

  // ─────────────────────────────────────────────────────────────
  // NEW VISIT WORKFLOW MODAL STATE
  // ─────────────────────────────────────────────────────────────
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [nvDate, setNvDate] = useState(todayISO());
  const [nvType, setNvType] = useState<"New" | "Follow-up">("Follow-up");
  const [nvComplaint, setNvComplaint] = useState("");
  const [nvNotes, setNvNotes] = useState("");
  const [nvIncludeRx, setNvIncludeRx] = useState(true);
  const [nvRxItems, setNvRxItems] = useState<PrescriptionItem[]>([blankRxRow()]);
  const [nvDiagnosis, setNvDiagnosis] = useState("");
  const [nvSpecialInstructions, setNvSpecialInstructions] = useState("");
  const [nvIncludeBill, setNvIncludeBill] = useState(true);
  const [nvPaymentStatus, setNvPaymentStatus] = useState<"Paid" | "Pending">("Paid");
  const [nvPaymentMode, setNvPaymentMode] = useState<"Cash" | "UPI" | "Card">("Cash");
  const [nvCustomFee, setNvCustomFee] = useState<number>(settings.followUpFee ?? 250);
  const [nvIncludeFollowUp, setNvIncludeFollowUp] = useState(false);
  const [nvFollowUpDate, setNvFollowUpDate] = useState("");
  const [nvFollowUpReason, setNvFollowUpReason] = useState("");

  // Open New Visit Dialog initialized cleanly
  const handleOpenNewVisit = (presetItems?: PrescriptionItem[]) => {
    if (!patient) return;
    const priorVisitsCount = visits.filter((v) => v.patientId === patient.id).length;
    const isFirstVisit = priorVisitsCount === 0;

    setNvDate(todayISO());
    setNvType(isFirstVisit ? "New" : "Follow-up");
    setNvCustomFee(isFirstVisit ? (settings.consultationFee ?? 400) : (settings.followUpFee ?? 250));
    setNvComplaint("");
    setNvNotes("");
    setNvDiagnosis("");
    setNvSpecialInstructions("");
    setNvPaymentStatus("Paid");
    setNvPaymentMode("Cash");
    setNvIncludeFollowUp(false);
    setNvFollowUpDate("");
    setNvFollowUpReason("");

    if (presetItems && presetItems.length > 0) {
      setNvIncludeRx(true);
      setNvRxItems(presetItems.map((it) => ({ ...it, id: uid() })));
    } else {
      setNvIncludeRx(true);
      setNvRxItems([blankRxRow()]);
    }

    setNewVisitOpen(true);
  };

  // Quick Reuse / Refill from a previous prescription
  const handleQuickReuse = (rx: Prescription) => {
    if (!rx.items || rx.items.length === 0) {
      toast.error("Previous prescription has no items");
      return;
    }
    handleOpenNewVisit(rx.items);
    toast.info(`Loaded ${rx.items.length} medicines from previous prescription into New Visit`);
  };

  // Save the complete Visit
  const handleSaveCompleteVisit = () => {
    if (!patient) return;
    if (!nvDate) {
      toast.error("Please specify visit date");
      return;
    }

    const complaintStr = nvComplaint.trim() || "Routine Consultation";
    const notesStr = nvNotes.trim() || (nvType === "New" ? "Initial consultation completed" : "Follow-up consultation completed");

    // 1. Create Visit record
    const createdVisit = addVisit({
      patientId: patient.id,
      date: nvDate,
      type: nvType,
      complaint: complaintStr,
      notes: notesStr,
    });

    const validRxItems = nvIncludeRx ? nvRxItems.filter((i) => Boolean(i.medicineId)) : [];
    let createdBill: Bill | null = null;
    let createdRx: Prescription | null = null;

    // 2. If prescription included
    if (nvIncludeRx && validRxItems.length > 0) {
      const combinedNotes = serializeClinicalNotes(nvDiagnosis, nvSpecialInstructions);
      const rxResult = savePrescription({
        patientId: patient.id,
        visitId: createdVisit.id,
        items: validRxItems,
        followUpDate: nvIncludeFollowUp && nvFollowUpDate ? nvFollowUpDate : null,
        notes: combinedNotes,
        isRefill: false,
        date: nvDate,
      });
      createdRx = rxResult.prescription;
      createdBill = rxResult.bill;

      // Update the generated bill's payment status & mode if selected
      if (createdBill) {
        const total = billTotal(createdBill);
        updateBill(createdBill.id, {
          status: nvPaymentStatus,
          paymentMode: nvPaymentStatus === "Paid" ? nvPaymentMode : null,
          amountReceived: nvPaymentStatus === "Paid" ? total : 0,
        });
      }
    } else if (nvIncludeBill) {
      // 3. Standalone Bill without prescription medicines
      const manualBill = createManualBill(patient.id, nvDate);
      const fee = Number(nvCustomFee) || (nvType === "New" ? settings.consultationFee : settings.followUpFee);
      updateBill(manualBill.id, {
        items: [{ label: nvType === "New" ? "Consultation Fee" : "Follow-up Fee", qty: 1, rate: fee }],
        status: nvPaymentStatus,
        paymentMode: nvPaymentStatus === "Paid" ? nvPaymentMode : null,
        amountReceived: nvPaymentStatus === "Paid" ? fee : 0,
      });
      createdBill = manualBill;
    }

    // 4. Follow-up if requested and not already handled by savePrescription
    if (nvIncludeFollowUp && nvFollowUpDate && (!nvIncludeRx || validRxItems.length === 0)) {
      addFollowUp(patient.id, nvFollowUpDate, nvFollowUpReason || `Review for ${complaintStr}`);
    }

    toast.success(`Visit successfully recorded for ${patient.name}!`);
    setNewVisitOpen(false);
    setActiveTab("visits");
  };

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

  // Sorted Patient Records
  const pVisits = visits.filter((v) => v.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pComplaints = chiefComplaints
    .filter((c) => c.patientId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pPres = prescriptions.filter((p) => p.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pBills = bills.filter((b) => b.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pFollowUps = followUps.filter((f) => f.patientId === id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const lastPrescription = pPres[0];

  // Financial summary
  const totalBilled = pBills.reduce((acc, b) => acc + billTotal(b), 0);
  const totalReceived = pBills.reduce((acc, b) => acc + (b.amountReceived || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalReceived);

  // RBAC permissions
  const isDoctor = role === "doctor";
  const caseAccess = can(role, "caseHistory");
  const canPrescribe = isDoctor && can(role, "prescription") === "full";
  const canEditDemographics = can(role, "patients") === "full";
  const canManageBilling = can(role, "billing") !== "hidden";

  // Filtered Chief Complaints
  const filteredComplaints = useMemo(() => {
    let list = pComplaints;
    if (complaintSearch.trim()) {
      const q = complaintSearch.toLowerCase().trim();
      list = list.filter((c) => c.complaint.toLowerCase().includes(q));
    }
    return list;
  }, [pComplaints, complaintSearch]);

  // Unified Chronological Activity Feed
  const recentActivities = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: "visit" | "prescription" | "bill" | "followup";
      title: string;
      subtitle: string;
      badge?: string | undefined;
    }[] = [];

    pVisits.forEach((v) => {
      list.push({
        id: `v-${v.id}`,
        date: v.date,
        type: "visit",
        title: `Visit Completed (${v.type})`,
        subtitle: v.complaint || "Routine Consultation",
        badge: "Completed",
      });
    });

    pPres.forEach((p) => {
      list.push({
        id: `rx-${p.id}`,
        date: p.date,
        type: "prescription",
        title: `Prescription Created`,
        subtitle: `${p.items.length} medicine(s) prescribed`,
        badge: p.isRefill ? "Refill" : undefined,
      });
    });

    pBills.forEach((b) => {
      list.push({
        id: `b-${b.id}`,
        date: b.date,
        type: "bill",
        title: `Bill ${b.invoiceNo} (${b.status})`,
        subtitle: `Amount: ${inr(billTotal(b))}${b.paymentMode ? ` via ${b.paymentMode}` : ""}`,
        badge: b.status,
      });
    });

    pFollowUps.forEach((f) => {
      list.push({
        id: `fu-${f.id}`,
        date: f.dueDate,
        type: "followup",
        title: `Follow-up (${f.status})`,
        subtitle: f.reason || "Review checkup",
        badge: f.status,
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [pVisits, pPres, pBills, pFollowUps]);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          PATIENT HEADER (The Central Medical Workspace Header)
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-soft p-5 border-l-4 border-l-primary shadow-sm bg-card"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Demographics Details */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0 shadow-inner">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold font-display">
                {initials(patient.name)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {patient.name}
                </h1>
                <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5 border-primary/40 text-primary bg-primary/5">
                  {patient.regNo}
                </Badge>
                {patient.allergies && patient.allergies.length > 0 && (
                  <Badge variant="destructive" className="text-xs px-2 py-0.5">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Allergies: {patient.allergies.join(", ")}
                  </Badge>
                )}
                {!patient.active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>

              {/* Sub-bar: Core Demographics Grid */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                <span className="font-medium text-foreground">
                  Age: <strong className="text-foreground">{patient.age} Yrs</strong>
                </span>
                <span>&bull;</span>
                <span className="font-medium text-foreground">
                  Gender: <strong className="text-foreground">{patient.gender}</strong>
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-foreground">
                  <Phone className="h-3 w-3 text-primary" />
                  <strong>{patient.phone || "—"}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Registered: <strong>{formatDate(patient.registeredOn)}</strong>
                </span>
              </div>

              {patient.address && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-xl">{patient.address}</span>
                </p>
              )}
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Label htmlFor="patient-active-toggle" className="text-xs text-muted-foreground">
                Active
              </Label>
              <Switch
                id="patient-active-toggle"
                checked={patient.active}
                disabled={!canEditDemographics}
                onCheckedChange={(v) => {
                  updatePatient(patient.id, { active: v });
                  toast.success(v ? "Patient marked active" : "Patient marked inactive");
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* PROMINENT NEW VISIT BUTTON */}
              {isDoctor && (
                <Button
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold px-4"
                  onClick={() => handleOpenNewVisit()}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> New Visit
                </Button>
              )}

              {/* Edit Patient */}
              {canEditDemographics && (
                <Button
                  variant="outline"
                  className="rounded-xl shadow-xs"
                  onClick={() => {
                    setDraft(patient);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Patient
                </Button>
              )}

              {/* WhatsApp Button */}
              <WhatsAppButton
                label="WhatsApp"
                isPdf={false}
                onClick={handleSendRegistrationWhatsApp}
              />

              {/* Print Patient Summary */}
              <Button
                variant="outline"
                className="rounded-xl shadow-xs"
                onClick={() => setPrintingSummary(true)}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-700 dark:text-slate-200" /> Summary
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          PATIENT WORKSPACE TABS NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-secondary/80 p-1.5 border">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold px-3.5 py-2">
            Overview
          </TabsTrigger>

          {caseAccess !== "hidden" && (
            <TabsTrigger value="case" className="rounded-lg text-xs font-semibold px-3.5 py-2">
              Case History
              {pComplaints.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
                  {pComplaints.length}
                </span>
              )}
            </TabsTrigger>
          )}

          <TabsTrigger value="visits" className="rounded-lg text-xs font-semibold px-3.5 py-2">
            Visits
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600/20 px-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {pVisits.length}
            </span>
          </TabsTrigger>

          {caseAccess !== "hidden" && (
            <TabsTrigger value="prescriptions" className="rounded-lg text-xs font-semibold px-3.5 py-2">
              Prescriptions
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
                {pPres.length}
              </span>
            </TabsTrigger>
          )}

          {canManageBilling && (
            <TabsTrigger value="bills" className="rounded-lg text-xs font-semibold px-3.5 py-2">
              Bills
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                {pBills.length}
              </span>
              {outstandingBalance > 0 && (
                <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive" title="Pending balance" />
              )}
            </TabsTrigger>
          )}

          <TabsTrigger value="followups" className="rounded-lg text-xs font-semibold px-3.5 py-2">
            Follow-ups
            {pFollowUps.filter((f) => f.status === "Pending").length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white px-1">
                {pFollowUps.filter((f) => f.status === "Pending").length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW (Concise Medical Summary & Recent Activity)
        ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="mt-4 space-y-4">

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left 2 Cols: Clinical Snapshot & Latest Prescriptions */}
            <div className="space-y-4 lg:col-span-2">
              {/* Important Medical Alerts */}
              <div className="card-soft p-4 border bg-card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Clinical Snapshot &amp; Demographics
                </h3>

                <dl className="grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Occupation</dt>
                    <dd className="font-semibold text-foreground text-sm">{patient.occupation || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registration Date</dt>
                    <dd className="font-semibold text-foreground text-sm">{formatDate(patient.registeredOn)}</dd>
                  </div>
                </dl>

                {/* Latest Chief Complaint Box */}
                {pComplaints[0] && (
                  <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Latest Chief Complaint
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatComplaintDateTime(pComplaints[0].createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      &ldquo;{pComplaints[0].complaint}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Latest Prescription Card */}
              <div className="card-soft p-4 border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Pill className="h-4 w-4 text-emerald-600" /> Latest Prescription
                  </h3>
                  {lastPrescription && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg"
                        onClick={() => handleQuickReuse(lastPrescription)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3 text-primary" /> Use Again
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-primary"
                        onClick={() => setActiveTab("prescriptions")}
                      >
                        View All <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {lastPrescription ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
                      <span>Date: <strong className="text-foreground">{formatDate(lastPrescription.date)}</strong></span>
                      {lastPrescription.isRefill && <Badge variant="secondary" className="text-[10px]">Refill</Badge>}
                    </div>

                    <div className="divide-y text-xs">
                      {lastPrescription.items.slice(0, 4).map((it, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">{it.medicineName}</span>
                            <span className="ml-1.5 font-mono text-primary font-medium">({it.potency})</span>
                            <span className="ml-1.5 text-muted-foreground">· {it.dosage} · {it.frequency}</span>
                          </div>
                          <span className="text-muted-foreground font-mono text-[11px]">{it.duration}</span>
                        </div>
                      ))}
                    </div>

                    {lastPrescription.items.length > 4 && (
                      <p className="text-xs text-muted-foreground italic pt-1">
                        +{lastPrescription.items.length - 4} more medicines in this prescription.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No prescriptions recorded yet.
                  </p>
                )}
              </div>
            </div>

            {/* Right Col: Recent Activity Feed */}
            <div className="card-soft p-4 border bg-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </h3>

              {recentActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  No activity recorded for this patient yet.
                </p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border/60">
                  {recentActivities.map((act) => (
                    <div key={act.id} className="relative flex items-start gap-3 pl-1">
                      <div className="h-6 w-6 rounded-full bg-background border-2 border-primary shrink-0 flex items-center justify-center z-10">
                        {act.type === "visit" ? (
                          <Stethoscope className="h-3 w-3 text-primary" />
                        ) : act.type === "prescription" ? (
                          <Pill className="h-3 w-3 text-emerald-600" />
                        ) : act.type === "bill" ? (
                          <Receipt className="h-3 w-3 text-amber-600" />
                        ) : (
                          <CalendarClock className="h-3 w-3 text-purple-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-foreground truncate">{act.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(act.date)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{act.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════
            TAB 2: CASE HISTORY (Chief Complaints + Clinical Modalities)
        ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="case" className="mt-4 space-y-5">
          {/* Section A: Chief Complaints Chronological History */}
          <div className="card-soft p-5 border bg-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 pb-3 border-b">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Chief Complaints History
                </h3>
                <p className="text-xs text-muted-foreground">
                  Chronological timeline of all symptoms and clinical complaints recorded for this patient.
                </p>
              </div>

              {isDoctor && (
                <Button
                  size="sm"
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  onClick={() => {
                    setNewComplaintText("");
                    setSelectedVisitId("");
                    setComplaintDate(getNowIST().date);
                    setComplaintTime(getNowIST().time);
                    setComplaintDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Chief Complaint
                </Button>
              )}
            </div>

            {/* Complaints List */}
            {pComplaints.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No chief complaints recorded yet. Click &quot;Add Chief Complaint&quot; above to log the patient&apos;s symptoms.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredComplaints.map((c) => {
                  const linkedVisit = visits.find((v) => v.id === c.visitId);
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border bg-secondary/30 flex items-start justify-between gap-3 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {formatComplaintDateTime(c.createdAt)}
                          </span>
                          {linkedVisit ? (
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/30">
                              Visit: {formatDate(linkedVisit.date)} ({linkedVisit.type})
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              General Consultation
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground font-medium whitespace-pre-wrap">{c.complaint}</p>
                      </div>

                      {isDoctor && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingComplaint(c);
                              setEditText(c.complaint);
                              setEditVisitId(c.visitId || "");
                              const ist = parseISTDateTime(c.createdAt);
                              setEditDate(ist.date);
                              setEditTime(ist.time);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingComplaint(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Clinical Case History Form */}
          <div className="card-soft p-5 border bg-card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Homeopathic Case History &amp; Modalities
                </h3>
                <p className="text-xs text-muted-foreground">
                  Record systemic generals, constitution, family history, and modality triggers.
                </p>
              </div>

              {isDoctor && (
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    saveCaseHistory(patient.id, ch);
                    toast.success("Case history saved successfully");
                  }}
                >
                  Save Case History
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Present Illness &amp; Onset</Label>
                <Textarea
                  value={ch.presentIllness}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, presentIllness: e.target.value })}
                  placeholder="Details of current onset, location, sensation, progression..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Past Medical History</Label>
                <Textarea
                  value={ch.pastHistory}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, pastHistory: e.target.value })}
                  placeholder="Previous illnesses, surgeries, chronic complaints..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Family Medical History</Label>
                <Textarea
                  value={ch.familyHistory}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, familyHistory: e.target.value })}
                  placeholder="Hereditary complaints (Diabetes, Asthma, Cancer, Hypertension)..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <TagInput
                  label="Modalities: < Better / Amelioration"
                  tags={ch.better}
                  onChange={(t) => setCh({ ...ch, better: t })}
                />
              </div>

              <div className="space-y-2">
                <TagInput
                  label="Modalities: > Worse / Aggravation"
                  tags={ch.worse}
                  onChange={(t) => setCh({ ...ch, worse: t })}
                />
              </div>

              <div className="space-y-2">
                <Label>Diet &amp; Cravings / Aversions</Label>
                <Input
                  value={ch.diet}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, diet: e.target.value })}
                  placeholder="Appetite, thirst, desires (sweet, spicy, salty), aversions..."
                />
              </div>

              <div className="space-y-2">
                <Label>Sleep &amp; Dreams</Label>
                <Input
                  value={ch.sleep}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, sleep: e.target.value })}
                  placeholder="Sleep patterns, position, insomnia, recurring dreams..."
                />
              </div>

              <div className="space-y-2">
                <Label>Thermal Reaction</Label>
                <Input
                  value={ch.thermal}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, thermal: e.target.value })}
                  placeholder="Hot / Chilly / Ambithermal, reaction to weather/baths..."
                />
              </div>

              <div className="space-y-2">
                <Label>Mental &amp; Emotional Generals</Label>
                <Input
                  value={ch.mentals}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, mentals: e.target.value })}
                  placeholder="Temperament, anxieties, fears, irritability, mood..."
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Physical Generals &amp; Clinical Notes</Label>
                <Textarea
                  value={ch.physicalGenerals}
                  disabled={!isDoctor}
                  onChange={(e) => setCh({ ...ch, physicalGenerals: e.target.value })}
                  placeholder="Perspiration, tongue, discharges, general physical constitution..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════
            TAB 3: VISITS (Chronological Visit History & Medical Dossier)
        ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="visits" className="mt-4 space-y-4">
          {/* Header Bar with Toggle & Action */}
          <div className="card-soft p-4 flex flex-wrap items-center justify-between gap-3 border bg-card">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-600" /> Visit History &amp; Consultations
              </h2>
              <p className="text-xs text-muted-foreground">
                Chronological series of doctor visits, clinical findings, prescriptions, and billing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-secondary p-1 border">
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                    visitsViewMode === "timeline" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setVisitsViewMode("timeline")}
                >
                  Timeline Cards
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                    visitsViewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setVisitsViewMode("table")}
                >
                  Summary Table
                </button>
              </div>

              {isDoctor && (
                <Button
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs text-xs"
                  onClick={() => handleOpenNewVisit()}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> + New Visit
                </Button>
              )}
            </div>
          </div>

          {/* Visits Content */}
          {pVisits.length === 0 ? (
            <div className="card-soft p-12 text-center border bg-card">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto stroke-1" />
              <h3 className="mt-3 text-base font-bold text-foreground">No Visits Recorded Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                This patient does not have any consultation visits in the system yet. Start their treatment journey by recording their first consultation visit.
              </p>
              {isDoctor && (
                <Button
                  className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={() => handleOpenNewVisit()}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Record First Visit
                </Button>
              )}
            </div>
          ) : visitsViewMode === "table" ? (
            /* ──── Summary Table View ──── */
            <div className="card-soft overflow-hidden border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground border-b font-semibold">
                    <tr>
                      <th className="p-3 w-16 text-center">Visit</th>
                      <th className="p-3 w-28">Date</th>
                      <th className="p-3 w-28">Type</th>
                      <th className="p-3">Summary / Complaint</th>
                      <th className="p-3">Prescription</th>
                      <th className="p-3 w-28">Bill</th>
                      <th className="p-3 w-28">Follow-up</th>
                      <th className="p-3 w-24 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pVisits.map((v, idx) => {
                      const visitNumber = pVisits.length - idx;
                      const linkedRx = pPres.find((p) => p.visitId === v.id || p.date === v.date);
                      const linkedBill = pBills.find((b) => (linkedRx && b.prescriptionId === linkedRx.id) || b.date === v.date);
                      const linkedFollowUp = pFollowUps.find((f) => f.dueDate >= v.date);

                      return (
                        <tr key={v.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="p-3 text-center font-bold text-foreground">
                            #{visitNumber}
                          </td>
                          <td className="p-3 font-medium whitespace-nowrap">
                            {formatDate(v.date)}
                          </td>
                          <td className="p-3">
                            <Badge variant={v.type === "New" ? "default" : "outline"} className="text-[10px]">
                              {v.type}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-foreground truncate max-w-xs">{v.complaint || "Routine Consultation"}</p>
                            {v.notes && <p className="text-[11px] text-muted-foreground truncate max-w-xs">{v.notes}</p>}
                          </td>
                          <td className="p-3">
                            {linkedRx ? (
                              <div className="space-y-0.5">
                                <span className="font-medium text-foreground">{linkedRx.items.length} Medicines</span>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                  {linkedRx.items.map((i) => i.medicineName).join(", ")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {linkedBill ? (
                              <div>
                                <span className="font-bold text-foreground">{inr(billTotal(linkedBill))}</span>
                                <Badge
                                  variant={linkedBill.status === "Paid" ? "default" : "destructive"}
                                  className="ml-1 text-[9px] px-1 py-0"
                                >
                                  {linkedBill.status}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {linkedFollowUp ? (
                              <span className="font-medium text-muted-foreground whitespace-nowrap">
                                {formatDate(linkedFollowUp.dueDate)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs rounded-lg"
                              onClick={() => setFullVisitModal(v)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ──── Timeline Expandable Cards View ──── */
            <div className="space-y-4">
              {pVisits.map((v, idx) => {
                const visitNumber = pVisits.length - idx;
                const linkedRx = pPres.find((p) => p.visitId === v.id || p.date === v.date);
                const linkedBill = pBills.find((b) => (linkedRx && b.prescriptionId === linkedRx.id) || b.date === v.date);
                const linkedFollowUp = pFollowUps.find((f) => f.dueDate >= v.date);

                return (
                  <div
                    key={v.id}
                    className="card-soft border rounded-2xl overflow-hidden shadow-xs bg-card hover:border-primary/40 transition-all"
                  >
                    {/* Visit Header */}
                    <div className="bg-secondary/40 p-4 border-b flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold font-display text-sm">
                          #{visitNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">
                              Visit #{visitNumber} &bull; {formatDate(v.date)}
                            </h3>
                            <Badge variant={v.type === "New" ? "default" : "outline"} className="text-[10px]">
                              {v.type === "New" ? "New Consultation" : "Follow-up Visit"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              Completed
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Recorded at Dr. Ayus Homoeopathy Hospital
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {linkedRx && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs rounded-xl"
                            onClick={() => handleQuickReuse(linkedRx)}
                          >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-primary" /> Use Again
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs rounded-xl font-medium"
                          onClick={() => setFullVisitModal(v)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View Full Visit
                        </Button>
                      </div>
                    </div>

                    {/* Visit Body */}
                    <div className="p-4 space-y-4">
                      {/* Clinical Complaint & Notes */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="p-3 rounded-xl bg-secondary/30 border">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Chief Complaint
                          </span>
                          <p className="text-sm font-semibold text-foreground">
                            {v.complaint || "Routine Consultation"}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/30 border">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Case Notes / Observations
                          </span>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {v.notes || "No clinical case notes recorded for this visit."}
                          </p>
                        </div>
                      </div>

                      {/* Linked Prescription Section */}
                      {linkedRx && (
                        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <Pill className="h-4 w-4" /> Prescribed Medicines ({linkedRx.items.length})
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-lg border-emerald-500/30"
                                onClick={() => setPrintingRx(linkedRx)}
                              >
                                <Printer className="mr-1 h-3 w-3" /> Print Rx
                              </Button>
                              <WhatsAppButton
                                label="WhatsApp PDF"
                                isPdf={true}
                                loading={sharingRxId === linkedRx.id}
                                onClick={() => handleSendPrescriptionWhatsApp(linkedRx)}
                              />
                            </div>
                          </div>

                          <div className="divide-y divide-emerald-500/10 text-xs">
                            {linkedRx.items.map((it, i) => (
                              <div key={i} className="py-1.5 flex items-center justify-between">
                                <span className="font-medium text-foreground">
                                  &bull; {it.medicineName} <strong className="text-primary font-mono font-semibold">({it.potency})</strong>
                                  <span className="text-muted-foreground ml-1.5">· {it.dosage} · {it.frequency} · {it.instructions}</span>
                                </span>
                                <span className="text-muted-foreground font-mono text-[11px]">{it.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linked Bill & Follow-up Row */}
                      <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t">
                        {/* Linked Bill */}
                        {linkedBill ? (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border text-xs">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                                Invoiced Amount
                              </span>
                              <span className="font-bold text-sm text-foreground">
                                {inr(billTotal(linkedBill))}
                              </span>
                              <Badge
                                variant={linkedBill.status === "Paid" ? "default" : "destructive"}
                                className="ml-2 text-[9px] px-1.5 py-0"
                              >
                                {linkedBill.status}
                              </Badge>
                              {linkedBill.paymentMode && (
                                <span className="ml-1 text-[10px] text-muted-foreground">({linkedBill.paymentMode})</span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setPrintingBill(linkedBill)}
                            >
                              <Printer className="mr-1 h-3 w-3" /> Print Bill
                            </Button>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-secondary/10 border text-xs text-muted-foreground flex items-center">
                            No billing invoice recorded for this visit.
                          </div>
                        )}

                        {/* Linked Follow-up */}
                        {linkedFollowUp ? (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border text-xs">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                                Follow-up Reminder
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatDate(linkedFollowUp.dueDate)}
                              </span>
                              <span className="ml-1 text-[11px] text-muted-foreground truncate">
                                &bull; {linkedFollowUp.reason || "Review check"}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {linkedFollowUp.status}
                            </Badge>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-secondary/10 border text-xs text-muted-foreground flex items-center">
                            No follow-up reminder set.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════
            TAB 4: PRESCRIPTIONS (Complete Rx Record & Quick Reuse)
        ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="prescriptions" className="mt-4 space-y-4">
          <div className="card-soft p-4 flex items-center justify-between border bg-card">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" /> Patient Prescriptions ({pPres.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                All prescription records, medicine items, dosage instructions, and A4 printouts.
              </p>
            </div>

            {canPrescribe && (
              <Button asChild className="rounded-xl font-semibold">
                <Link to="/prescriptions/new" search={{ patientId: patient.id }}>
                  <Plus className="mr-1.5 h-4 w-4" /> New Prescription
                </Link>
              </Button>
            )}
          </div>

          {pPres.length === 0 ? (
            <div className="card-soft p-12 text-center border bg-card">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto stroke-1" />
              <h3 className="mt-3 text-base font-bold text-foreground">No Prescriptions Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                This patient does not have any prescriptions saved.
              </p>
              {canPrescribe && (
                <Button asChild className="mt-4 rounded-xl">
                  <Link to="/prescriptions/new" search={{ patientId: patient.id }}>
                    <Plus className="mr-1.5 h-4 w-4" /> Create Prescription
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {pPres.map((rx, idx) => {
                const parsedNotes = parseClinicalNotes(rx.notes);
                const linkedVisit = visits.find((v) => v.id === rx.visitId);

                return (
                  <div key={rx.id} className="card-soft border rounded-2xl p-4 bg-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">
                            Prescription on {formatDate(rx.date)}
                          </h4>
                          {rx.isRefill && <Badge variant="secondary" className="text-[10px]">Refill</Badge>}
                          {linkedVisit && (
                            <Badge variant="outline" className="text-[10px]">
                              Visit: {linkedVisit.type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rx.items.length} prescribed item{rx.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick Reuse / Use Again */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-xl"
                          onClick={() => handleQuickReuse(rx)}
                        >
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-primary" /> Use Again
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-xl"
                          onClick={() => setPrintingRx(rx)}
                        >
                          <Printer className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Print
                        </Button>

                        <WhatsAppButton
                          label="Send PDF"
                          isPdf={true}
                          loading={sharingRxId === rx.id}
                          onClick={() => handleSendPrescriptionWhatsApp(rx)}
                        />
                      </div>
                    </div>

                    {/* Medicines Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-secondary/40 text-muted-foreground border-b text-[11px]">
                          <tr>
                            <th className="p-2">Medicine</th>
                            <th className="p-2">Potency</th>
                            <th className="p-2">Form</th>
                            <th className="p-2">Dosage</th>
                            <th className="p-2">Frequency</th>
                            <th className="p-2">Duration</th>
                            <th className="p-2">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {rx.items.map((it, i) => (
                            <tr key={i} className="hover:bg-secondary/20">
                              <td className="p-2 font-semibold text-foreground">{it.medicineName}</td>
                              <td className="p-2 font-mono text-primary font-medium">{it.potency}</td>
                              <td className="p-2 text-muted-foreground">{it.formType || "Bottle"}</td>
                              <td className="p-2">{it.dosage}</td>
                              <td className="p-2">{it.frequency}</td>
                              <td className="p-2 font-mono">{it.duration}</td>
                              <td className="p-2 text-muted-foreground">{it.instructions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Diagnosis / Clinical Instructions if any */}
                    {(parsedNotes.diagnosis || parsedNotes.specialInstructions) && (
                      <div className="p-2.5 rounded-xl bg-secondary/30 border text-xs text-muted-foreground space-y-1">
                        {parsedNotes.diagnosis && (
                          <p><strong className="text-foreground">Clinical Diagnosis:</strong> {parsedNotes.diagnosis}</p>
                        )}
                        {parsedNotes.specialInstructions && (
                          <p><strong className="text-foreground">Special Instructions:</strong> {parsedNotes.specialInstructions}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════
            TAB 5: BILLS (Financial Invoices & Payment Ledger)
        ═════════════════════════════════════════════════════════════ */}
        {canManageBilling && (
          <TabsContent value="bills" className="mt-4 space-y-4">
            <div className="card-soft p-4 flex flex-wrap items-center justify-between gap-3 border bg-card">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" /> Patient Invoices &amp; Bills ({pBills.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Official hospital tax invoices, receipts, itemised charges, and payment modes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={billsTabStatusFilter}
                  onValueChange={(v) => setBillsTabStatusFilter(v as typeof billsTabStatusFilter)}
                >
                  <SelectTrigger className="w-28 h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={() => {
                    setBillDate(todayISO());
                    setBillFee(settings.consultationFee ?? 300);
                    setBillDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> + New Bill
                </Button>
              </div>
            </div>

            {pBills.length === 0 ? (
              <div className="card-soft p-12 text-center border bg-card">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto stroke-1" />
                <h3 className="mt-3 text-base font-bold text-foreground">No Bills Generated Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Create a manual bill or invoice for consultation and medicines.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pBills
                  .filter((b) => (billsTabStatusFilter === "all" ? true : b.status === billsTabStatusFilter))
                  .map((b) => {
                    const total = billTotal(b);
                    const bal = Math.max(0, total - (b.amountReceived || 0));

                    return (
                      <div key={b.id} className="card-soft border rounded-2xl p-4 bg-card space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground text-sm">{b.invoiceNo}</span>
                              <Badge
                                variant={b.status === "Paid" ? "default" : b.status === "Partial" ? "secondary" : "destructive"}
                                className="text-[10px]"
                              >
                                {b.status}
                              </Badge>
                              {b.paymentMode && (
                                <Badge variant="outline" className="text-[10px]">
                                  {b.paymentMode}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Date: {formatDate(b.date)} &bull; {b.items.length} bill item(s)
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {b.status !== "Paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                onClick={() => {
                                  updateBill(b.id, {
                                    status: "Paid",
                                    amountReceived: total,
                                    paymentMode: b.paymentMode || "Cash",
                                  });
                                  toast.success(`Bill ${b.invoiceNo} marked as Paid!`);
                                }}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Paid
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs rounded-xl"
                              onClick={() => setPrintingBill(b)}
                            >
                              <Printer className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Print
                            </Button>

                            <WhatsAppButton
                              label="Send PDF"
                              isPdf={true}
                              loading={sharingBillId === b.id}
                              onClick={() => handleSendBillWhatsApp(b)}
                            />

                            <Button asChild size="sm" variant="secondary" className="h-8 text-xs rounded-xl">
                              <Link to="/billing/$id" params={{ id: b.id }}>
                                Open <ExternalLink className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>

                        {/* Line Items */}
                        <div className="divide-y text-xs">
                          {b.items.map((it, i) => (
                            <div key={i} className="py-1.5 flex items-center justify-between">
                              <span className="text-foreground">
                                {it.label} <span className="text-muted-foreground font-mono">(&times;{it.qty})</span>
                              </span>
                              <span className="font-mono font-medium text-foreground">{inr(it.qty * it.rate)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Footer Totals */}
                        <div className="pt-2 border-t flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Received: <strong className="text-foreground">{inr(b.amountReceived || 0)}</strong>
                            {bal > 0 && <span className="text-destructive ml-2 font-bold font-mono">Due: {inr(bal)}</span>}
                          </span>
                          <span className="font-bold text-sm text-foreground">
                            Total: <strong className="font-mono text-base">{inr(total)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        )}

        {/* ═════════════════════════════════════════════════════════════
            TAB 6: FOLLOW-UPS (Appointments & Reminders)
        ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="followups" className="mt-4 space-y-4">
          <div className="card-soft p-4 flex items-center justify-between border bg-card">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" /> Follow-Up Appointments ({pFollowUps.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Scheduled consultation reviews, medicine refilling reminders, and patient checkups.
              </p>
            </div>

            <Button
              size="sm"
              className="rounded-xl font-semibold"
              onClick={() => {
                setFollowUpDate("");
                setFollowUpReason("");
                setFollowUpOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Schedule Follow-up
            </Button>
          </div>

          {pFollowUps.length === 0 ? (
            <div className="card-soft p-12 text-center border bg-card">
              <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto stroke-1" />
              <h3 className="mt-3 text-base font-bold text-foreground">No Follow-ups Scheduled</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Schedule a follow-up review for this patient to ensure continuity of homeopathic treatment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pFollowUps.map((f) => (
                <div key={f.id} className="card-soft border rounded-2xl p-4 bg-card flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {formatDate(f.dueDate)}
                      </span>
                      <Badge
                        variant={f.status === "Pending" ? "default" : f.status === "Completed" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {f.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.reason || "General review"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {f.status === "Pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-xl"
                        onClick={() => {
                          setFollowUpStatus(f.id, "Completed");
                          toast.success("Follow-up marked as Completed");
                        }}
                      >
                        <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─────────────────────────────────────────────────────────────
          NEW VISIT WORKFLOW MODAL DIALOG (Comprehensive Consultation)
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={newVisitOpen} onOpenChange={setNewVisitOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              New Consultation Visit — {patient.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reg ID: <strong className="text-foreground font-mono">{patient.regNo}</strong> &bull; Prior Visits: {pVisits.length}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* 1. Visit Details Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Visit &amp; Clinical Findings
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nv-date">Visit Date</Label>
                  <Input
                    id="nv-date"
                    type="date"
                    value={nvDate}
                    max={todayISO()}
                    onChange={(e) => setNvDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nv-type">Visit Type</Label>
                  <Select value={nvType} onValueChange={(v) => setNvType(v as "New" | "Follow-up")}>
                    <SelectTrigger id="nv-type">
                      <SelectValue placeholder="Visit type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New Consultation (First Visit)</SelectItem>
                      <SelectItem value="Follow-up">Follow-up Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="nv-complaint">Chief Complaint</Label>
                  <Input
                    id="nv-complaint"
                    placeholder="e.g. Headache, gastric discomfort, joint stiffness..."
                    value={nvComplaint}
                    onChange={(e) => setNvComplaint(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="nv-notes">Clinical Notes &amp; Observations</Label>
                  <Textarea
                    id="nv-notes"
                    placeholder="Doctor's clinical findings, physical generals, response to previous remedy..."
                    rows={2}
                    value={nvNotes}
                    onChange={(e) => setNvNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Prescription Section */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="nv-include-rx"
                    checked={nvIncludeRx}
                    onCheckedChange={setNvIncludeRx}
                  />
                  <Label htmlFor="nv-include-rx" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                    2. Prescribe Medicines
                  </Label>
                </div>

                {nvIncludeRx && lastPrescription && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    onClick={() => {
                      setNvRxItems(lastPrescription.items.map((it) => ({ ...it, id: uid() })));
                      toast.info("Copied medicines from previous prescription");
                    }}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" /> Copy Last Rx Items
                  </Button>
                )}
              </div>

              {nvIncludeRx && (
                <div className="space-y-3 bg-secondary/20 p-3.5 rounded-xl border">
                  {nvRxItems.map((item, index) => (
                    <div key={item.id} className="p-3 bg-background rounded-xl border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">
                          Medicine #{index + 1}
                        </span>
                        {nvRxItems.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => setNvRxItems(nvRxItems.filter((_, i) => i !== index))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <MedicineCombobox
                            value={item.medicineId}
                            medicines={medicines}
                            onChange={(m: Medicine) => {
                              const updated = [...nvRxItems];
                              updated[index] = {
                                ...item,
                                medicineId: m.id,
                                medicineName: m.name,
                                potency: m.potency || "30CH",
                                formType: m.formType || "Bottle",
                              };
                              setNvRxItems(updated);
                            }}
                          />
                        </div>

                        <div>
                          <Input
                            placeholder="Potency (e.g. 30CH, 200CH)"
                            value={item.potency}
                            onChange={(e) => {
                              const updated = [...nvRxItems];
                              updated[index] = { ...item, potency: e.target.value };
                              setNvRxItems(updated);
                            }}
                          />
                        </div>

                        <div>
                          <Input
                            placeholder="Dosage (e.g. 5 drops, 2 pills)"
                            value={item.dosage}
                            onChange={(e) => {
                              const updated = [...nvRxItems];
                              updated[index] = { ...item, dosage: e.target.value };
                              setNvRxItems(updated);
                            }}
                          />
                        </div>

                        <div>
                          <Input
                            placeholder="Frequency (e.g. 3 times/day)"
                            value={item.frequency}
                            onChange={(e) => {
                              const updated = [...nvRxItems];
                              updated[index] = { ...item, frequency: e.target.value };
                              setNvRxItems(updated);
                            }}
                          />
                        </div>

                        <div>
                          <Input
                            placeholder="Duration (e.g. 7 days)"
                            value={item.duration}
                            onChange={(e) => {
                              const updated = [...nvRxItems];
                              updated[index] = { ...item, duration: e.target.value };
                              setNvRxItems(updated);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs rounded-xl"
                    onClick={() => setNvRxItems([...nvRxItems, blankRxRow()])}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Medicine
                  </Button>
                </div>
              )}
            </div>

            {/* 3. Billing Section */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="nv-include-bill"
                  checked={nvIncludeBill}
                  onCheckedChange={setNvIncludeBill}
                />
                <Label htmlFor="nv-include-bill" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                  3. Billing &amp; Payment
                </Label>
              </div>

              {nvIncludeBill && (
                <div className="grid gap-3 sm:grid-cols-3 bg-secondary/20 p-3.5 rounded-xl border">
                  <div className="space-y-1.5">
                    <Label htmlFor="nv-fee">Fee (₹)</Label>
                    <Input
                      id="nv-fee"
                      type="number"
                      min={0}
                      value={nvCustomFee}
                      onChange={(e) => setNvCustomFee(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nv-pay-status">Payment Status</Label>
                    <Select value={nvPaymentStatus} onValueChange={(v) => setNvPaymentStatus(v as "Paid" | "Pending")}>
                      <SelectTrigger id="nv-pay-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nv-pay-mode">Payment Mode</Label>
                    <Select
                      value={nvPaymentMode}
                      disabled={nvPaymentStatus !== "Paid"}
                      onValueChange={(v) => setNvPaymentMode(v as "Cash" | "UPI" | "Card")}
                    >
                      <SelectTrigger id="nv-pay-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI / GPay</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Next Follow-up Section */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="nv-include-fu"
                  checked={nvIncludeFollowUp}
                  onCheckedChange={setNvIncludeFollowUp}
                />
                <Label htmlFor="nv-include-fu" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                  4. Schedule Next Follow-up
                </Label>
              </div>

              {nvIncludeFollowUp && (
                <div className="space-y-3 bg-secondary/20 p-3.5 rounded-xl border">
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[7, 14, 21, 30].map((days) => {
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      const iso = d.toISOString().slice(0, 10);
                      return (
                        <Button
                          key={days}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs rounded-lg"
                          onClick={() => {
                            setNvFollowUpDate(iso);
                            setNvFollowUpReason(`Review after ${days} days`);
                          }}
                        >
                          +{days} Days
                        </Button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="nv-fu-date">Follow-up Date</Label>
                      <Input
                        id="nv-fu-date"
                        type="date"
                        min={todayISO()}
                        value={nvFollowUpDate}
                        onChange={(e) => setNvFollowUpDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nv-fu-reason">Reason</Label>
                      <Input
                        id="nv-fu-reason"
                        placeholder="e.g. Review response to remedy"
                        value={nvFollowUpReason}
                        onChange={(e) => setNvFollowUpReason(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button variant="outline" onClick={() => setNewVisitOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleSaveCompleteVisit}
            >
              <Check className="mr-1.5 h-4 w-4" /> Save Complete Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          FULL VISIT DOSSIER MODAL
      ───────────────────────────────────────────────────────────── */}
      {fullVisitModal && (
        <Dialog open={!!fullVisitModal} onOpenChange={(open) => !open && setFullVisitModal(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-600" />
                Complete Visit Dossier &bull; {formatDate(fullVisitModal.date)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Patient: <strong className="text-foreground">{patient.name}</strong> ({patient.regNo}) &bull; Type: {fullVisitModal.type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Chief Complaint
                </span>
                <p className="text-sm font-semibold text-foreground p-3 rounded-xl bg-secondary/30 border">
                  {fullVisitModal.complaint || "Routine Consultation"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Case Notes &amp; Observations
                </span>
                <p className="text-xs text-muted-foreground p-3 rounded-xl bg-secondary/30 border whitespace-pre-wrap">
                  {fullVisitModal.notes || "None recorded"}
                </p>
              </div>

              {/* Linked Prescription in Dossier */}
              {(() => {
                const rx = pPres.find((p) => p.visitId === fullVisitModal.id || p.date === fullVisitModal.date);
                if (!rx) return null;
                return (
                  <div className="space-y-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Prescribed Medicines ({rx.items.length})
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setFullVisitModal(null);
                          setPrintingRx(rx);
                        }}
                      >
                        <Printer className="mr-1 h-3 w-3" /> Print Rx
                      </Button>
                    </div>

                    <div className="divide-y text-xs">
                      {rx.items.map((it, i) => (
                        <div key={i} className="py-1 flex items-center justify-between">
                          <span>{it.medicineName} ({it.potency})</span>
                          <span className="text-muted-foreground">{it.dosage} · {it.frequency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFullVisitModal(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PATIENT SUMMARY PRINT SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={printingSummary} onOpenChange={setPrintingSummary}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="no-print flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Patient Medical Summary Report
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official clinical summary for {patient.name} ({patient.regNo}).
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

          <div className="py-2">
            <PatientSummaryPrintSheet
              patient={patient}
              caseHistory={caseHistories[patient.id]}
              chiefComplaints={pComplaints}
              visits={pVisits}
              prescriptions={pPres}
              bills={pBills}
              followUps={pFollowUps}
              settings={settings}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          PRESCRIPTION PRINT PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!printingRx} onOpenChange={(open) => !open && setPrintingRx(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="no-print flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Prescription Print Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Prescription issued on {printingRx?.date} for {patient.name} ({patient.regNo}).
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

          {printingRx && (
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

      {/* ─────────────────────────────────────────────────────────────
          BILL PRINT PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!printingBill} onOpenChange={(open) => !open && setPrintingBill(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="no-print flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Invoice &amp; Receipt — {printingBill?.invoiceNo}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official invoice for {patient.name} ({patient.regNo}).
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

          {printingBill && (
            <div className="py-2">
              <BillPrintSheet bill={printingBill} patient={patient} settings={settings} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          EDIT PATIENT SHEET
      ───────────────────────────────────────────────────────────── */}
      {draft && (
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Patient Record</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" min={0} value={draft.age} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={draft.gender} onValueChange={(v) => setDraft({ ...draft, gender: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={draft.address} rows={2} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input value={draft.occupation} onChange={(e) => setDraft({ ...draft, occupation: e.target.value })} />
              </div>
              <div className="space-y-2">
                <TagInput
                  label="Allergies"
                  tags={draft.allergies}
                  onChange={(t) => setDraft({ ...draft, allergies: t })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  updatePatient(patient.id, draft);
                  toast.success("Patient details updated");
                  setEditOpen(false);
                }}
              >
                Save Changes
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SCHEDULE FOLLOW-UP DIALOG
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>Set a consultation review date for {patient.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                min={todayISO()}
                value={followUpDate}
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
                addFollowUp(patient.id, followUpDate, followUpReason || "Review checkup");
                toast.success("Follow-up scheduled");
                setFollowUpOpen(false);
              }}
            >
              Save Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          ADD CHIEF COMPLAINT DIALOG
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={complaintDialogOpen} onOpenChange={setComplaintDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Chief Complaint</DialogTitle>
            <DialogDescription>Log a new symptom or clinical concern for {patient.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Chief Complaint Description</Label>
              <Textarea
                placeholder="Describe the complaint, symptoms, onset..."
                rows={3}
                value={newComplaintText}
                onChange={(e) => setNewComplaintText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date (IST)</Label>
                <Input type="date" value={complaintDate} onChange={(e) => setComplaintDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Time (IST)</Label>
                <Input type="time" value={complaintTime} onChange={(e) => setComplaintTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComplaintDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newComplaintText.trim()) {
                  toast.error("Please enter a complaint");
                  return;
                }
                const createdAtUtc = complaintDate ? istToUtcString(complaintDate, complaintTime || "12:00") : undefined;
                addChiefComplaint({
                  patientId: patient.id,
                  visitId: selectedVisitId || null,
                  complaint: newComplaintText.trim(),
                  createdAt: createdAtUtc,
                });
                toast.success("Chief complaint added");
                setComplaintDialogOpen(false);
              }}
            >
              Save Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          CREATE BILL MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              New Bill for {patient.name}
            </DialogTitle>
            <DialogDescription>
              Create an official invoice for {patient.name} ({patient.regNo}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={billDate}
                max={todayISO()}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Consultation Fee (₹)</Label>
              <Input
                type="number"
                min={0}
                value={billFee}
                onChange={(e) => setBillFee(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateBill}>
              Create &amp; Open Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
