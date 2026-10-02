import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Mail, MapPin, Pencil, Phone, Plus, RotateCcw, X, CalendarClock } from "lucide-react";
import { useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { billTotal, can, useClinic } from "@/store/clinic";
import { formatDate, initials, inr, todayISO } from "@/lib/format";
import type { CaseHistory } from "@/data/types";

export const Route = createFileRoute("/patients/$id")({
  head: () => ({
    meta: [
      { title: "Patient profile — HomeoCare Clinic Manager" },
      { name: "description", content: "Case history, visits, prescriptions and bills for a clinic patient." },
      { property: "og:title", content: "Patient profile — HomeoCare Clinic Manager" },
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
    prescriptions,
    bills,
    followUps,
    caseHistories,
    role,
    updatePatient,
    saveCaseHistory,
    addVisit,
    addFollowUp,
    savePrescription,
    setFollowUpStatus,
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
  const pPres = prescriptions.filter((p) => p.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pBills = bills.filter((b) => b.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const pFollowUps = followUps.filter((f) => f.patientId === id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const refills = pPres.filter((p) => p.isRefill);
  const last = pPres[0];
  const caseAccess = can(role, "caseHistory");
  const canPrescribe = can(role, "prescription") === "full";
  const canEdit = can(role, "patients") === "full";

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
              {canPrescribe && (
                <Button asChild className="rounded-xl">
                  <Link to="/prescriptions/new" search={{ patientId: patient.id }}>
                    <Plus className="mr-2 h-4 w-4" /> New prescription
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-secondary p-1">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          {caseAccess !== "hidden" && <TabsTrigger value="case" className="rounded-lg">Case History</TabsTrigger>}
          <TabsTrigger value="timeline" className="rounded-lg">Visit Timeline</TabsTrigger>
          <TabsTrigger value="followups" className="rounded-lg">
            Follow-ups
            {pFollowUps.filter((f) => f.status === "Pending").length > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white">
                {pFollowUps.filter((f) => f.status === "Pending").length}
              </span>
            )}
          </TabsTrigger>
          {caseAccess !== "hidden" && <TabsTrigger value="rx" className="rounded-lg">Prescriptions</TabsTrigger>}
          <TabsTrigger value="bills" className="rounded-lg">Bills</TabsTrigger>
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
              <div><dt className="text-muted-foreground">Chief complaint</dt><dd className="font-medium">{caseHistories[id]?.chiefComplaint || "Not recorded"}</dd></div>
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
              <Accordion type="multiple" defaultValue={["cc"]} className="w-full">
                {([
                  ["cc", "Chief Complaint", "chiefComplaint"],
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

        <TabsContent value="timeline" className="mt-5">
          <div className="card-soft p-6">
            {pVisits.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No visits recorded yet.</p>
            ) : (
              <ol className="relative border-l border-border pl-6">
                {pVisits.map((v) => {
                  const rx = prescriptions.find((p) => p.visitId === v.id);
                  return (
                    <li key={v.id} className="mb-7 last:mb-0">
                      <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{formatDate(v.date)}</span>
                        <Badge variant="outline" className={v.type === "New" ? "bg-info-soft text-info" : "bg-primary-soft text-primary-soft-foreground"}>
                          {v.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium">{v.complaint}</p>
                      <p className="text-sm text-muted-foreground">{v.notes}</p>
                      {rx && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Rx: {rx.items.map((i) => `${i.medicineName} ${i.potency}`).join(", ")}
                        </p>
                      )}
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
                  <div className="flex gap-2">
                    {rx.isRefill && <Badge variant="secondary">Refill</Badge>}
                    {rx.followUpDate && <Badge variant="outline">Follow-up {formatDate(rx.followUpDate)}</Badge>}
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

        <TabsContent value="bills" className="mt-5 space-y-3">
          {pBills.length === 0 && <p className="card-soft p-10 text-center text-sm text-muted-foreground">No bills yet.</p>}
          {pBills.map((b) => (
            <Link key={b.id} to="/billing/$id" params={{ id: b.id }} className="card-soft card-lift flex flex-wrap items-center gap-4 p-4">
              <span className="font-mono text-sm">{b.invoiceNo}</span>
              <span className="text-sm text-muted-foreground">{formatDate(b.date)}</span>
              <Badge
                variant="outline"
                className={
                  b.status === "Paid"
                    ? "bg-success-soft text-success"
                    : b.status === "Partial"
                      ? "bg-warning-soft text-warning-foreground"
                      : "bg-danger-soft text-destructive"
                }
              >
                {b.status}
              </Badge>
              <span className="ml-auto font-semibold">{inr(billTotal(b))}</span>
            </Link>
          ))}
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
    </>
  );
}
