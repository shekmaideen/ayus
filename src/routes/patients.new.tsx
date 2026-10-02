import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
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

export const Route = createFileRoute("/patients/new")({
  head: () => ({
    meta: [
      { title: "Register patient — HomeoCare Clinic Manager" },
      { name: "description", content: "Register a new patient and generate a clinic registration number." },
      { property: "og:title", content: "Register patient — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Register a new patient and generate a clinic registration number." },
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
  const { addPatient, nextRegNo } = useClinic();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<Patient | null>(null);
  const [allergyInput, setAllergyInput] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Female" as Patient["gender"],
    phone: "",
    email: "",
    address: "",
    bloodGroup: "O+",
    allergies: [] as string[],
    occupation: "",
  });

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const stepValid =
    step === 0 ? form.name.trim().length > 2 && Number(form.age) > 0 : step === 1 ? form.phone.trim().length >= 10 : true;

  const submit = () => {
    const patient = addPatient({
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      bloodGroup: form.bloodGroup,
      allergies: form.allergies,
      occupation: form.occupation.trim(),
    });
    setCreated(patient);
    toast.success(`Patient registered as ${patient.regNo}`);
  };

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-lg">
        <div className="card-soft p-10 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" strokeWidth={1.4} />
          <h1 className="mt-5 font-display text-3xl">Patient registered</h1>
          <p className="mt-2 text-sm text-muted-foreground">{created.name} has been added to the clinic records.</p>
          <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-primary-soft px-8 py-5">
            <span className="text-xs uppercase tracking-[0.2em] text-primary-soft-foreground/70">Registration No.</span>
            <span className="font-display text-4xl text-primary-soft-foreground">{created.regNo}</span>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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
                setForm({ ...form, name: "", age: "", phone: "", email: "", address: "", allergies: [], occupation: "" });
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
        title="Register patient"
        subtitle="A registration number is generated automatically"
        action={
          <Badge variant="outline" className="rounded-xl border-gold/40 bg-gold-soft px-3 py-1.5 text-gold-foreground">
            Next: {nextRegNo()}
          </Badge>
        }
      />

      <div className="mx-auto max-w-3xl card-soft p-6 md:p-8">
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
                <div className="space-y-2">
                  <Label>Blood group</Label>
                  <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="rounded-xl" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button className="rounded-xl" onClick={submit}>
              Register patient
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
