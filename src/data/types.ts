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

export const MEDICINE_POTENCIES = ["Q", "30CH", "200CH", "1M"] as const;
export type MedicinePotency = (typeof MEDICINE_POTENCIES)[number];

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
