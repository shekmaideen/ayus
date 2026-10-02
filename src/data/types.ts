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

export interface CaseHistory {
  chiefComplaint: string;
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
  "30CH",
  "200CH",
  "1M",
  "Q",
  "4X",
  "3X",
  "6X",
  "Other",
] as const;
export type BottlePotency = (typeof BOTTLE_POTENCIES)[number];

export const TABLET_POTENCIES = [
  "3X",
  "4X",
  "6X",
  "Other",
] as const;
export type TabletPotency = (typeof TABLET_POTENCIES)[number];

export const MEDICINE_POTENCIES = [
  "30CH",
  "200CH",
  "1M",
  "Q",
  "4X",
  "3X",
  "6X",
] as const;
export type MedicinePotency = string;

export function isPotencyApplicable(formType: string): boolean {
  if (!formType) return false;
  const norm = formType.trim().toLowerCase();
  return norm === "bottle" || norm === "bottol" || norm === "tablet" || norm === "tablets";
}

export function isBrandApplicable(formType: string): boolean {
  if (!formType) return false;
  const norm = formType.trim().toLowerCase();
  return norm === "bottle" || norm === "bottol";
}

export function getPotencyOptions(formType: string): readonly string[] {
  if (!formType) return [];
  const norm = formType.trim().toLowerCase();
  if (norm === "bottle" || norm === "bottol") return BOTTLE_POTENCIES;
  if (norm === "tablet" || norm === "tablets") return TABLET_POTENCIES;
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
