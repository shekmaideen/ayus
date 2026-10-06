import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, History, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClinic } from "@/store/clinic";
import { cn } from "@/lib/utils";
import type { Patient } from "@/data/types";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { buildRegistrationMessage, openWhatsAppMessage } from "@/lib/whatsapp";
import { todayISO } from "@/lib/format";

export const Route = createFileRoute("/patients/new")({
  validateSearch: (search: Record<string, unknown>): { mode?: string } => {
    const out: { mode?: string } = {};
    if (typeof search["mode"] === "string") out.mode = search["mode"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Register patient — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Register a new or existing patient in the clinic management records." },
      { property: "og:title", content: "Register patient — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Register a new or existing patient in the clinic management records." },
    ],
  }),
  component: () => (
    <AppShell>
      <RegisterPatient />
    </AppShell>
  ),
});

const STEPS = ["Personal", "Contact", "Medical"];

function RegisterPatient() {
  const search = Route.useSearch();
  const { addPatient, nextRegNo, settings, patients } = useClinic();
  const navigate = useNavigate();
  const [isOldPatient, setIsOldPatient] = useState(search.mode === "old");
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [allergyInput, setAllergyInput] = useState("");
  const [form, setForm] = useState({
    regNo: "",
    registeredOn: todayISO(),
    name: "",
    age: "",
    gender: "Female" as Patient["gender"],
    phone: "",
    email: "",
    address: "",
    bloodGroup: "",
    allergies: [] as string[],
    occupation: "",
  });

  const existingPatient = useMemo(() => {
    const trimmed = form.regNo.trim().toLowerCase();
    if (!trimmed) return null;
    return patients.find((p) => p.regNo.toLowerCase() === trimmed) || null;
  }, [patients, form.regNo]);

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const stepValid =
    step === 0
      ? form.name.trim().length > 2 &&
        Number(form.age) > 0 &&
        (!isOldPatient || (form.regNo.trim().length > 0 && !existingPatient))
      : step === 1
        ? form.phone.trim().length >= 10
        : true;

  const handleSendWhatsApp = (targetPatient?: Patient | null) => {
    const p = targetPatient ?? created;
    if (!p) {
      toast.error("Please save the patient before sending the WhatsApp message.");
      return;
    }

    const message = buildRegistrationMessage({
      clinicName: settings.clinicName,
      doctorName: settings.doctorName,
      clinicPhone: settings.phone,
      patientName: p.name,
      regNo: p.regNo,
      registrationDate: p.registeredOn,
    });

    openWhatsAppMessage(p.phone, message);
  };

  const submit = () => {
    if (saving) return;

    if (isOldPatient && !form.regNo.trim()) {
      toast.error("Please enter the patient's existing Registration Number");
      setStep(0);
      return;
    }
    if (isOldPatient && existingPatient) {
      toast.error(`A patient is already registered with Reg No: ${form.regNo.trim()}`);
      setStep(0);
      return;
    }

    if (!form.name.trim()) {
      toast.error("Please enter the patient's name");
      setStep(0);
      return;
    }
    if (!form.age || Number(form.age) <= 0) {
      toast.error("Please enter a valid age");
      setStep(0);
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      const patient = addPatient({
        regNo: form.regNo.trim() || undefined,
        registeredOn: isOldPatient && form.registeredOn ? form.registeredOn : undefined,
        name: form.name.trim(),
        age: Number(form.age) || 0,
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        bloodGroup: "",
        allergies: form.allergies,
        occupation: form.occupation.trim(),
      });
      setCreated(patient);
      toast.success(
        isOldPatient
          ? `Old patient ${patient.name} recorded with Reg No: ${patient.regNo}`
          : `Patient registered as ${patient.regNo}`
      );
    } catch (err: unknown) {
      console.error("[RegisterPatient] Error saving patient:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save patient. Please check all fields.");
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-lg">
        <div className="card-soft p-10 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" strokeWidth={1.4} />
          <h1 className="mt-5 font-display text-3xl">
            {isOldPatient ? "Old patient recorded" : "Patient registered"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{created.name} has been added to the clinic records.</p>
          <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-primary-soft px-8 py-5">
            <span className="text-xs uppercase tracking-[0.2em] text-primary-soft-foreground/70">Registration No.</span>
            <span className="font-display text-4xl text-primary-soft-foreground">{created.regNo}</span>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <WhatsAppButton
              label="Send WhatsApp"
              isPdf={false}
              onClick={() => handleSendWhatsApp(created)}
            />
            <Button asChild className="rounded-xl">
              <Link to="/prescriptions/new" search={{ patientId: created.id }}>
                Create Visit
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/patients/$id" params={{ id: created.id }}>
                Open profile
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                setCreated(null);
                setStep(0);
                setForm({
                  regNo: "",
                  registeredOn: todayISO(),
                  name: "",
                  age: "",
                  gender: "Female",
                  phone: "",
                  email: "",
                  address: "",
                  bloodGroup: "",
                  allergies: [],
                  occupation: "",
                });
              }}
            >
              Register another
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <PageTitle
        title={isOldPatient ? "Register Old Patient" : "Register patient"}
        subtitle={
          isOldPatient
            ? "Enter past paper-card registration number and existing hospital records"
            : "A registration number is generated automatically"
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isOldPatient ? "default" : "outline"}
              className={cn(
                "rounded-xl h-9 font-medium",
                isOldPatient
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm"
                  : "border-border hover:bg-secondary text-foreground"
              )}
              onClick={() => {
                setIsOldPatient((p) => !p);
                setStep(0);
              }}
            >
              <History className="mr-1.5 h-4 w-4" />
              {isOldPatient ? "Switch to New Patient" : "Register Old Patient"}
            </Button>
            {!isOldPatient && (
              <Badge variant="outline" className="rounded-xl border-gold/40 bg-gold-soft px-3 py-1.5 text-gold-foreground h-9 flex items-center">
                Next: {nextRegNo()}
              </Badge>
            )}
          </div>
        }
      />

      <div className="mx-auto max-w-3xl card-soft p-6 md:p-8 pb-12 md:pb-8">
        {/* Registration Mode Selector */}
        <div className="mb-6 flex rounded-xl bg-secondary/80 p-1">
          <button
            type="button"
            onClick={() => {
              setIsOldPatient(false);
              setStep(0);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
              !isOldPatient ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserPlus className="h-4 w-4 text-primary" />
            New Patient (Auto Reg No)
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOldPatient(true);
              setStep(0);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
              isOldPatient
                ? "bg-amber-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-4 w-4" />
            Register Old Patient (Existing Paper Reg No)
          </button>
        </div>

        {isOldPatient && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200">
            <History className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="text-xs space-y-0.5">
              <span className="font-semibold text-sm">Old Patient Entry Mode (Physical File Migration)</span>
              <p className="text-muted-foreground dark:text-amber-300/80">
                Enter the historical Registration Number printed on the patient's existing card or paper file to preserve medical history and continuity.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary-soft text-primary-soft-foreground ring-2 ring-primary"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("hidden text-sm font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <span className="mx-3 h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {step === 0 && (
              <>
                {isOldPatient ? (
                  <>
                    <div className="space-y-2 sm:col-span-2 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="regNo" className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <History className="h-4 w-4 text-amber-600" /> Existing Hospital Registration Number <span className="text-destructive">*</span>
                        </Label>
                        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px]">
                          Required
                        </Badge>
                      </div>
                      <Input
                        id="regNo"
                        autoFocus
                        value={form.regNo}
                        onChange={(e) => set("regNo", e.target.value)}
                        placeholder="Enter existing Reg No. (e.g. 2024-0012, AHH-2023-88, or old card no.)"
                        className="font-medium bg-background text-sm"
                      />
                      {existingPatient && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive mt-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Patient <strong>{existingPatient.name}</strong> is already registered with Reg No: <strong>{form.regNo}</strong>.</span>
                          <Link to="/patients/$id" params={{ id: existingPatient.id }} className="underline font-semibold ml-auto">
                            View profile
                          </Link>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Exact registration number written or printed on their previous hospital prescription card.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regDate" className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Original Registration Date
                      </Label>
                      <Input
                        id="regDate"
                        type="date"
                        max={todayISO()}
                        value={form.registeredOn}
                        onChange={(e) => set("registeredOn", e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">When the patient first visited the hospital</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="regNo">Registration Number</Label>
                      <span className="text-xs text-muted-foreground">Optional · Leave blank to auto-generate ({nextRegNo()})</span>
                    </div>
                    <Input
                      id="regNo"
                      value={form.regNo}
                      onChange={(e) => set("regNo", e.target.value)}
                      placeholder={`e.g. ${nextRegNo()} or past card/file number`}
                    />
                  </div>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kavitha Murugan" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" min={0} value={form.age} onChange={(e) => set("age", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit mobile" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" rows={3} value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="allergy">Known allergies</Label>
                  <div className="flex gap-2">
                    <Input
                      id="allergy"
                      value={allergyInput}
                      onChange={(e) => setAllergyInput(e.target.value)}
                      placeholder="Type and press Add"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (allergyInput.trim()) {
                            set("allergies", [...form.allergies, allergyInput.trim()]);
                            setAllergyInput("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (allergyInput.trim()) {
                          set("allergies", [...form.allergies, allergyInput.trim()]);
                          setAllergyInput("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.allergies.map((a) => (
                      <Badge key={a} variant="outline" className="border-destructive/30 bg-danger-soft text-destructive">
                        {a}
                        <button
                          className="ml-1.5"
                          aria-label={`Remove ${a}`}
                          onClick={() => set("allergies", form.allergies.filter((x) => x !== a))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => s - 1)}
            className="rounded-xl h-11 sm:h-10 px-4 min-h-[44px]"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="rounded-xl h-11 sm:h-10 px-5 min-h-[44px]"
              disabled={!stepValid || saving}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-xl h-11 sm:h-10 px-6 min-h-[44px] font-semibold text-base sm:text-sm active:scale-[0.98] transition-transform"
              disabled={saving}
              onClick={submit}
            >
              {saving ? "Saving..." : "Save Patient"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
