export type Role = "doctor" | "receptionist";

export interface Patient {
  id: string;
  regNo: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  allergies: string[];
  occupation: string;
  active: boolean;
  registeredOn: string;
}

export interface ChiefComplaint {
  id: string;
  patientId: string;
  visitId: string | null;
  complaint: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CaseHistory {
  chiefComplaint?: string;
  presentIllness: string;
  pastHistory: string;
  familyHistory: string;
  diet: string;
  sleep: string;
  thermal: string;
  mentals: string;
  physicalGenerals: string;
  better: string[];
  worse: string[];
  updatedOn: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  type: "New" | "Follow-up";
  complaint: string;
  notes: string;
}

export const BOTTLE_POTENCIES = [
  "Q",
  "3X",
  "3CH",
  "6CH",
  "12CH",
  "30CH",
  "200CH",
  "1M",
  "10M",
  "50M",
  "CM",
  "Other",
] as const;
export type BottlePotency = (typeof BOTTLE_POTENCIES)[number];

export const TABLET_POTENCIES = [
  "None",
  "3X",
  "4X",
  "6X",
  "Other",
] as const;
export type TabletPotency = (typeof TABLET_POTENCIES)[number];

export const GLOBULES_POTENCIES = [
  "1 drum",
  "2 drum",
  "3 drum",
  "size 40",
  "Other",
] as const;
export type GlobulesPotency = (typeof GLOBULES_POTENCIES)[number];

export const MEDICINE_POTENCIES = [
  "Q",
  "3X",
  "3CH",
  "6CH",
  "12CH",
  "30CH",
  "200CH",
  "1M",
  "10M",
  "50M",
  "CM",
] as const;
export type MedicinePotency = string;

/**
 * Normalizes homeopathic potencies from user and excel inputs:
 * - "6x" / "6X" -> "6CH"
 * - "12c" / "12C" -> "12CH"
 * - "30c" / "30C" -> "30CH"
 * - "200 c" / "200c" / "200C" -> "200CH"
 * - "\d+c" -> "\d+CH"
 * - Standardizes casing (e.g. "30ch" -> "30CH", "1m" -> "1M", "q" -> "Q")
 * - Globules potencies (1 drum, 2 drum, 3 drum, size 40)
 */
export function normalizeMedicinePotency(p: string | null | undefined): string {
  if (!p) return "";
  const clean = String(p).trim();
  if (!clean || clean === "-") return "";
  const compact = clean.replace(/\s+/g, "");

  // Globules potencies (1 drum, 2 drum, 3 drum, size 40)
  const drumMatch = clean.match(/^(\d+)\s*(?:drum|dram)s?$/i);
  if (drumMatch) {
    return `${drumMatch[1]} drum`;
  }
  if (/^size\s*40$/i.test(clean) || /^40\s*size$/i.test(clean)) {
    return "size 40";
  }

  // 6X or 6x -> 6CH (common mistaken entry in place of 6CH)
  if (/^6x$/i.test(compact)) {
    return "6CH";
  }

  // Any number followed by C / c -> CH (e.g. 12c -> 12CH, 30c -> 30CH, 200c -> 200CH)
  const cMatch = compact.match(/^(\d+)[cC]$/);
  if (cMatch) {
    return `${cMatch[1]}CH`;
  }

  // Ensure uppercase for CH potencies (e.g. 30ch -> 30CH)
  const chMatch = compact.match(/^(\d+)[cC][hH]$/i);
  if (chMatch) {
    return `${chMatch[1]}CH`;
  }

  // Common potencies uppercase (Q, MT, CM, 1M, 10M, 50M, 3X)
  if (/^(q|mt|cm|\d+m|\d+x)$/i.test(compact)) {
    return compact.toUpperCase();
  }

  return clean;
}

export function isPotencyApplicable(formType: string): boolean {
  if (!formType) return false;
  const norm = formType.trim().toLowerCase();
  return (
    norm === "bottle" ||
    norm === "bottol" ||
    norm === "tablet" ||
    norm === "tablets" ||
    norm === "globules" ||
    norm === "globule"
  );
}

export function isBrandApplicable(_formType: string): boolean {
  // Brand name removed for bottle in add inventory as requested
  return false;
}

export function getPotencyOptions(formType: string): readonly string[] {
  if (!formType) return [];
  const norm = formType.trim().toLowerCase();
  if (norm === "bottle" || norm === "bottol") return BOTTLE_POTENCIES;
  if (norm === "tablet" || norm === "tablets") return TABLET_POTENCIES;
  if (norm === "globules" || norm === "globule") return GLOBULES_POTENCIES;
  return [];
}

export const MEDICINE_FORM_TYPES = [
  "Bottle",
  "Drops",
  "Tablet",
  "Oil",
  "Shampoo",
  "Conditioner",
  "Syrup",
  "3X",
  "4X",
  "6X",
  "Spray",
  "Soap",
  "Ointment",
  "Cream",
  "Capsules",
  "Tonic",
  "Globules",
] as const;
export type MedicineFormType = (typeof MEDICINE_FORM_TYPES)[number];

export interface Medicine {
  id: string;
  name: string;
  brand: string;
  potency: string;
  formType: string;
  potencies?: string[];
  stock: number;
  price: number;
  active?: boolean;
  createdAt?: string;
}

export interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName: string;
  brand?: string;
  formType?: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  visitId: string;
  date: string;
  items: PrescriptionItem[];
  followUpDate: string | null;
  isRefill: boolean;
  notes: string;
}

export interface BillItem {
  label: string;
  qty: number;
  rate: number;
}

export type BillStatus = "Paid" | "Pending" | "Partial";

export interface Bill {
  id: string;
  invoiceNo: string;
  patientId: string;
  prescriptionId: string | null;
  date: string;
  items: BillItem[];
  status: BillStatus;
  paymentMode: "Cash" | "UPI" | "Card" | null;
  amountReceived: number;
  readyForPayment: boolean;
}

export type FollowUpStatus = "Pending" | "Completed" | "Missed" | "Cancelled";

export interface FollowUp {
  id: string;
  patientId: string;
  dueDate: string;
  reason: string;
  status: FollowUpStatus;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface ClinicSettings {
  consultationFee: number;
  followUpFee: number;
  registrationFee: number;
  lowStockThreshold: number;
  clinicName: string;
  address: string;
  phone: string;
  doctorName: string;
  logoDataUrl: string | null;
}

export interface Template {
  id: string;
  name: string;
  items: Omit<PrescriptionItem, "id">[];
}
