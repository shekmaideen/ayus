/**
 * src/store/clinic.ts
 * Zustand global store for clinic state management.
 *
 * Architecture:
 *  - loadAll()    → calls loadClinicData server fn (one round-trip)
 *  - mutations    → optimistic update → server fn (rollback on failure)
 *  - Auth state   → token stored in sessionStorage
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import type {
  Bill,
  BillItem,
  CaseHistory,
  ClinicSettings,
  FollowUp,
  FollowUpStatus,
  Medicine,
  Patient,
  Prescription,
  PrescriptionItem,
  Role,
  Template,
  Visit,
} from "@/data/types";
import { todayISO } from "@/lib/format";

// ─── Lazy import of server functions (server-side only) ───────────
// We import these lazily to avoid circular deps; they are only called
// from server function context anyway.
const sf = () => import("@/lib/clinic.functions");

const crypto = globalThis.crypto;
const uid = () => crypto.randomUUID();

/* ---------- row mappers (MySQL snake_case → app camelCase) --------- */
/* eslint-disable @typescript-eslint/no-explicit-any */
const toPatient = (r: any): Patient => ({
  id: r.id, regNo: r.regNo ?? r.reg_no, name: r.name, age: r.age, gender: r.gender,
  phone: r.phone, email: r.email, address: r.address, bloodGroup: r.bloodGroup ?? r.blood_group,
  allergies: r.allergies ?? [], occupation: r.occupation, active: r.active,
  registeredOn: r.registeredOn ?? r.registered_on,
});
const toVisit = (r: any): Visit => ({
  id: r.id, patientId: r.patientId ?? r.patient_id, date: r.date, type: r.type,
  complaint: r.complaint, notes: r.notes,
});
const toMedicine = (r: any): Medicine => ({
  id: r.id, name: r.name, potencies: r.potencies ?? [], stock: r.stock, price: Number(r.price),
});
const toPrescription = (r: any): Prescription => ({
  id: r.id, patientId: r.patientId ?? r.patient_id, visitId: r.visitId ?? r.visit_id ?? "",
  date: r.date, items: r.items ?? [], followUpDate: r.followUpDate ?? r.follow_up_date,
  isRefill: r.isRefill ?? r.is_refill, notes: r.notes,
});
const toBill = (r: any): Bill => ({
  id: r.id, invoiceNo: r.invoiceNo ?? r.invoice_no, patientId: r.patientId ?? r.patient_id,
  prescriptionId: r.prescriptionId ?? r.prescription_id, date: r.date, items: r.items ?? [],
  status: r.status, paymentMode: r.paymentMode ?? r.payment_mode,
  amountReceived: Number(r.amountReceived ?? r.amount_received),
  readyForPayment: r.readyForPayment ?? r.ready_for_payment,
});
const toFollowUp = (r: any): FollowUp => ({
  id: r.id, patientId: r.patientId ?? r.patient_id, dueDate: r.dueDate ?? r.due_date,
  reason: r.reason, status: r.status,
});
const toSettings = (r: any): ClinicSettings => ({
  consultationFee: Number(r.consultationFee ?? r.consultation_fee),
  followUpFee:     Number(r.followUpFee ?? r.follow_up_fee),
  registrationFee: Number(r.registrationFee ?? r.registration_fee),
  lowStockThreshold: r.lowStockThreshold ?? r.low_stock_threshold,
  clinicName:  r.clinicName ?? r.clinic_name,
  address:     r.address,
  phone:       r.phone,
  doctorName:  r.doctorName ?? r.doctor_name,
  logoDataUrl: r.logoDataUrl ?? r.logo_data_url,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const DEFAULT_SETTINGS: ClinicSettings = {
  consultationFee: 400, followUpFee: 250, registrationFee: 100, lowStockThreshold: 10,
  clinicName: "HomeoCare Clinic", address: "", phone: "", doctorName: "", logoDataUrl: null,
};

/** Run a server fn; on failure show toast and reload fresh data. */
function save(p: Promise<{ ok: boolean }>) {
  p.catch((err: Error) => {
    toast.error("Could not save: " + (err?.message ?? "unknown error"));
    void useClinic.getState().loadAll();
  });
}

const nextInvoice = (bs: Bill[]) => {
  const year = new Date().getFullYear();
  const nums = bs.map((b) => parseInt(b.invoiceNo.split("-")[2] ?? "0", 10)).filter((n) => !isNaN(n));
  return `INV-${year}-${String(Math.max(0, ...nums) + 1).padStart(4, "0")}`;
};

// ─────────────────────────────────────────────────────────────────
// State interface (unchanged from original — keeps frontend working)
// ─────────────────────────────────────────────────────────────────
interface ClinicState {
  role: Role | null;
  loggedIn: boolean;
  loaded: boolean;
  userId: string | null;
  userName: string;
  dark: boolean;

  patients: Patient[];
  caseHistories: Record<string, CaseHistory>;
  visits: Visit[];
  medicines: Medicine[];
  prescriptions: Prescription[];
  bills: Bill[];
  followUps: FollowUp[];
  settings: ClinicSettings;
  templates: Template[];

  loadAll: () => Promise<void>;
  clear: () => void;
  toggleDark: () => void;
  setAuth: (payload: { userId: string; role: Role; userName: string }) => void;

  nextRegNo: () => string;
  addPatient: (p: Omit<Patient, "id" | "regNo" | "registeredOn" | "active">) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  saveCaseHistory: (patientId: string, ch: CaseHistory) => void;
  addVisit: (v: Omit<Visit, "id">) => Visit;

  addMedicine: (m: Omit<Medicine, "id">) => void;
  updateMedicine: (id: string, patch: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;

  savePrescription: (input: {
    patientId: string;
    visitId?: string;
    items: PrescriptionItem[];
    followUpDate: string | null;
    notes: string;
    isRefill?: boolean;
    date?: string;
  }) => { prescription: Prescription; bill: Bill };

  saveTemplate: (name: string, items: PrescriptionItem[]) => void;

  updateBill: (id: string, patch: Partial<Bill>) => void;
  addBillItem: (id: string, label: string, qty: number, rate: number) => void;
  createManualBill: (patientId: string, date?: string) => Bill;

  addFollowUp: (patientId: string, dueDate: string, reason: string) => void;
  setFollowUpStatus: (id: string, status: FollowUpStatus) => void;
  updateSettings: (patch: Partial<ClinicSettings>) => void;
}

export const billTotal = (b: Bill) => b.items.reduce((s, i) => s + i.qty * i.rate, 0);

const empty = {
  role: null, loggedIn: false, loaded: false, userId: null, userName: "",
  patients: [], caseHistories: {}, visits: [], medicines: [], prescriptions: [],
  bills: [], followUps: [], settings: DEFAULT_SETTINGS, templates: [],
};

// ─────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────
export const useClinic = create<ClinicState>()(
  persist(
    (set, get) => ({
      ...empty,
      dark: false,

      // Called after login to set auth state
      setAuth: ({ userId, role, userName }) =>
        set({ loggedIn: true, userId, role, userName }),

      // Load all clinic data from MySQL via server function
      loadAll: async () => {
        const token = sessionStorage.getItem("hc_token");
        if (!token) { set({ ...empty, loaded: true }); return; }
        try {
          const { loadClinicData } = await sf();
          const d = await loadClinicData();
          set({
            loggedIn: true,
            loaded: true,
            userId: d.me.id,
            role: d.me.role as Role,
            userName: d.me.fullName,
            patients:      d.pats.map(toPatient),
            caseHistories: Object.fromEntries(d.chs.map((c) => [c.patientId, c.data as unknown as CaseHistory])),
            visits:        d.vis.map(toVisit),
            medicines:     d.meds.map(toMedicine),
            prescriptions: d.pres.map(toPrescription),
            bills:         d.bls.map(toBill),
            followUps:     d.fus.map(toFollowUp),
            templates:     d.tpls.map((t) => ({ id: t.id, name: t.name, items: t.items as Template["items"] })),
            settings:      d.settings ? toSettings(d.settings) : DEFAULT_SETTINGS,
          });
        } catch {
          set({ ...empty, loaded: true });
        }
      },

      clear: () => {
        sessionStorage.removeItem("hc_token");
        document.cookie = "hc_token=; path=/; max-age=0";
        set({ ...empty, loaded: true });
      },

      toggleDark: () => set((s) => ({ dark: !s.dark })),

      nextRegNo: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        
        const nums = get().patients.map((p) => {
          const parts = p.regNo.split("-");
          const lastPart = parts[parts.length - 1];
          return parseInt(lastPart ?? "0", 10);
        }).filter((n) => !isNaN(n));

        const nextNum = Math.max(0, ...nums) + 1;
        return `${year}-AHH-${month}-${String(nextNum).padStart(4, "0")}`;
      },

      addPatient: (p) => {
        const patient: Patient = { ...p, id: uid(), regNo: get().nextRegNo(), registeredOn: todayISO(), active: true };
        set((s) => ({ patients: [patient, ...s.patients] }));
        save(sf().then((m) => m.insertPatient({ data: patient })));
        return patient;
      },

      updatePatient: (id, patch) => {
        set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        save(sf().then((m) => m.updatePatient({ data: { id, patch } })));
      },

      saveCaseHistory: (patientId, ch) => {
        set((s) => ({ caseHistories: { ...s.caseHistories, [patientId]: ch } }));
        save(sf().then((m) => m.upsertCaseHistory({ data: { patientId, data: ch as Record<string, unknown> } })));
      },

      addVisit: (v) => {
        const visit: Visit = { ...v, id: uid() };
        set((s) => ({ visits: [visit, ...s.visits] }));
        save(sf().then((m) => m.insertVisit({ data: { id: visit.id, patientId: v.patientId, date: v.date, type: v.type, complaint: v.complaint, notes: v.notes } })));
        return visit;
      },

      addMedicine: (m) => {
        const med: Medicine = { ...m, id: uid() };
        set((s) => ({ medicines: [med, ...s.medicines] }));
        save(sf().then((fn) => fn.insertMedicine({ data: med })));
      },
      updateMedicine: (id, patch) => {
        set((s) => ({ medicines: s.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
        save(sf().then((m) => m.updateMedicine({ data: { id, patch } })));
      },
      deleteMedicine: (id) => {
        set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) }));
        save(sf().then((m) => m.deleteMedicine({ data: { id } })));
      },

      savePrescription: ({ patientId, visitId, items, followUpDate, notes, isRefill, date: customDate }) => {
        const state = get();
        const patient = state.patients.find((p) => p.id === patientId)!;
        const date = customDate || todayISO();

        // Resolve or create visit
        let vid = visitId;
        let newVisit: Visit | null = null;
        if (!vid) {
          const isFirst = !state.visits.some((v) => v.patientId === patientId);
          vid = uid();
          newVisit = {
            id: vid, patientId, date,
            type: isFirst ? "New" : "Follow-up",
            complaint: state.caseHistories[patientId]?.chiefComplaint ?? "Consultation",
            notes: isRefill ? "Refill of previous prescription" : "Prescription issued",
          };
          set((s) => ({ visits: [newVisit!, ...s.visits] }));
        }

        const prescription: Prescription = {
          id: uid(), patientId, visitId: vid, date, items, followUpDate, isRefill: !!isRefill, notes,
        };

        // Deduct stock optimistically
        const changedMeds: { id: string; stock: number }[] = [];
        const updatedMeds = get().medicines.map((m) => {
          const used = items.filter((i) => i.medicineId === m.id).reduce((s, i) => s + i.quantity, 0);
          if (!used) return m;
          const next = { ...m, stock: Math.max(0, m.stock - used) };
          changedMeds.push({ id: m.id, stock: next.stock });
          return next;
        });

        // Build bill
        const s = get().settings;
        const priorVisits = get().visits.filter((v) => v.patientId === patientId).length;
        const isNewPatient = priorVisits <= 1;
        const billItems: BillItem[] = [
          isNewPatient
            ? { label: "Consultation Fee", qty: 1, rate: s.consultationFee }
            : { label: "Follow-up Fee",    qty: 1, rate: s.followUpFee },
          ...(isNewPatient ? [{ label: "New Registration Fee", qty: 1, rate: s.registrationFee }] : []),
          ...items.map((it) => ({
            label: `${it.medicineName} ${it.potency}`,
            qty:   it.quantity,
            rate:  get().medicines.find((m) => m.id === it.medicineId)?.price ?? 0,
          })),
        ];
        const bill: Bill = {
          id: uid(), invoiceNo: nextInvoice(get().bills), patientId, prescriptionId: prescription.id,
          date, items: billItems, status: "Pending", paymentMode: null, amountReceived: 0, readyForPayment: true,
        };

        const followUp: FollowUp | null = followUpDate
          ? { id: uid(), patientId, dueDate: followUpDate, reason: state.caseHistories[patientId]?.chiefComplaint ?? `Review for ${patient.name}`, status: "Pending" }
          : null;

        set({
          prescriptions: [prescription, ...get().prescriptions],
          medicines: updatedMeds,
          bills: [bill, ...get().bills],
          followUps: followUp ? [followUp, ...get().followUps] : get().followUps,
        });

        save(sf().then((m) => m.savePrescriptionFull({
          data: {
            visit: newVisit ? { id: newVisit.id, patientId, date, type: newVisit.type, complaint: newVisit.complaint, notes: newVisit.notes } : undefined,
            prescription: { id: prescription.id, patientId, visitId: vid, date, items, followUpDate, isRefill: !!isRefill, notes },
            bill: { id: bill.id, invoiceNo: bill.invoiceNo, patientId, prescriptionId: prescription.id, date, items: billItems, status: "Pending", paymentMode: null, amountReceived: 0, readyForPayment: true },
            stockUpdates: changedMeds,
            followUp: followUp ? { id: followUp.id, patientId, dueDate: followUp.dueDate, reason: followUp.reason, status: followUp.status } : undefined,
          },
        })));

        return { prescription, bill };
      },

      saveTemplate: (name, items) => {
        const tpl: Template = { id: uid(), name, items: items.map(({ id: _id, ...rest }) => rest) };
        set((s) => ({ templates: [...s.templates, tpl] }));
        save(sf().then((m) => m.insertTemplate({ data: { id: tpl.id, name, items: tpl.items } })));
      },

      updateBill: (id, patch) => {
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
        save(sf().then((m) => m.updateBill({ data: { id, patch } })));
      },

      addBillItem: (id, label, qty, rate) => {
        const bill = get().bills.find((b) => b.id === id);
        if (!bill) return;
        get().updateBill(id, { items: [...bill.items, { label, qty, rate }] });
      },

      createManualBill: (patientId, customDate) => {
        const s = get().settings;
        const date = customDate || todayISO();
        const bill: Bill = {
          id: uid(), invoiceNo: nextInvoice(get().bills), patientId, prescriptionId: null,
          date, items: [{ label: "Consultation Fee", qty: 1, rate: s.consultationFee }],
          status: "Pending", paymentMode: null, amountReceived: 0, readyForPayment: true,
        };
        set((st) => ({ bills: [bill, ...st.bills] }));
        save(sf().then((m) => m.insertBill({ data: { id: bill.id, invoiceNo: bill.invoiceNo, patientId, prescriptionId: null, date: bill.date, items: bill.items, status: "Pending", paymentMode: null, amountReceived: 0, readyForPayment: true } })));
        return bill;
      },

      addFollowUp: (patientId, dueDate, reason) => {
        const f: FollowUp = { id: uid(), patientId, dueDate, reason, status: "Pending" };
        set((s) => ({ followUps: [f, ...s.followUps] }));
        save(sf().then((m) => m.insertFollowUp({ data: f })));
      },

      setFollowUpStatus: (id, status) => {
        set((s) => ({ followUps: s.followUps.map((f) => (f.id === id ? { ...f, status } : f)) }));
        save(sf().then((m) => m.setFollowUpStatusFn({ data: { id, status } })));
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
        save(sf().then((m) => m.updateSettingsFn({ data: patch as Parameters<typeof m.updateSettingsFn>[0]["data"] })));
      },
    }),
    { name: "homeocare-prefs", partialize: (s) => ({ dark: s.dark }) },
  ),
);

export const can = (role: Role | null, feature: string): "full" | "view" | "hidden" => {
  const table: Record<string, Record<Role, "full" | "view" | "hidden">> = {
    registration: { doctor: "full", receptionist: "full" },
    patients:     { doctor: "full", receptionist: "full" },
    caseHistory:  { doctor: "full", receptionist: "full" },
    prescription: { doctor: "full", receptionist: "full" },
    refill:       { doctor: "full", receptionist: "full" },
    billing:      { doctor: "full", receptionist: "full" },
    inventory:    { doctor: "full", receptionist: "full" },
    followUp:     { doctor: "full", receptionist: "full" },
    dashboard:    { doctor: "full", receptionist: "full" },
    settings:     { doctor: "full", receptionist: "full" },
  };
  if (!role) return "hidden";
  return table[feature]?.[role] ?? "hidden";
};
