/**
 * src/lib/whatsapp.ts
 * Reusable WhatsApp click-to-chat utility for Dr. Ayus Homeopathy Hospital.
 *
 * IMPORTANT RULES:
 * - NO WhatsApp Business API or paid automation.
 * - Opens WhatsApp/WhatsApp Web with pre-filled text (manual send by staff).
 * - Normalizes Indian phone numbers to 91XXXXXXXXXX.
 * - Validates phone presence; alerts user if missing.
 */
import { toast } from "sonner";

/**
 * Normalizes Indian phone numbers into international 91XXXXXXXXXX format.
 * Handles:
 *   +91XXXXXXXXXX
 *   91XXXXXXXXXX
 *   XXXXXXXXXX
 *   0XXXXXXXXXX
 * Avoids duplicate country codes. Returns null if invalid or missing.
 */
export function normalizeIndianPhoneNumber(phone?: string | null): string | null {
  if (!phone || typeof phone !== "string") return null;

  // Remove whitespace, dashes, parens
  let cleaned = phone.replace(/[^0-9+]/g, "").trim();
  if (!cleaned) return null;

  // Remove leading plus
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Remove leading single zero (e.g. 09876543210 -> 9876543210)
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  // 10 digits starting with standard mobile digits 6, 7, 8, 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `91${cleaned}`;
  }

  // 12 digits starting with 91 followed by 10 digits
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // Fallback for any 10-digit number
  if (/^\d{10}$/.test(cleaned)) {
    return `91${cleaned}`;
  }

  // Fallback for 12 digits starting with 91
  if (/^91\d{10}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Format date string (YYYY-MM-DD or ISO) into DD/MM/YYYY
 */
export function formatWhatsAppDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    // If already in DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

    // If YYYY-MM-DD
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// ─────────────────────────────────────────────────────────────────
// Message Builders
// ─────────────────────────────────────────────────────────────────

export interface RegistrationMessageParams {
  clinicName?: string;
  doctorName?: string;
  clinicPhone?: string;
  patientName: string;
  regNo: string;
  registrationDate: string;
  followUpDate?: string | null;
}

export function buildRegistrationMessage(params: RegistrationMessageParams): string {
  const clinic = (params.clinicName || "Dr. Ayus Homeopathy Hospital").trim();
  const patient = (params.patientName || "Patient").trim();

  const lines: string[] = [
    clinic,
    "",
    `Dear ${patient},`,
    "",
    "Your patient registration has been successfully completed.",
    "",
    `Registration ID: ${params.regNo}`,
    `Patient Name: ${patient}`,
    `Registration Date: ${formatWhatsAppDate(params.registrationDate)}`,
  ];

  if (params.followUpDate && params.followUpDate.trim()) {
    lines.push(`Follow-up Date: ${formatWhatsAppDate(params.followUpDate)}`);
  }

  lines.push("");
  if (params.doctorName && params.doctorName.trim()) {
    lines.push(`Doctor: ${params.doctorName.trim()}`);
  }
  if (params.clinicPhone && params.clinicPhone.trim()) {
    lines.push(`Hospital Phone: ${params.clinicPhone.trim()}`);
  }

  lines.push("");
  lines.push(`Thank you for choosing ${clinic}.`);

  return lines.join("\n");
}

export interface PrescriptionMessageItem {
  medicineName: string;
  potency?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface PrescriptionMessageParams {
  clinicName?: string;
  doctorName?: string;
  clinicPhone?: string;
  patientName: string;
  regNo: string;
  visitDate: string;
  items: PrescriptionMessageItem[];
}

export function buildPrescriptionMessage(params: PrescriptionMessageParams): string {
  const clinic = (params.clinicName || "Dr. Ayus Homeopathy Hospital").trim();
  const patient = (params.patientName || "Patient").trim();

  const lines: string[] = [
    clinic,
    "",
    `Dear ${patient},`,
    "",
    "Your prescription has been prepared.",
    "",
    `Registration ID: ${params.regNo}`,
    `Visit Date: ${formatWhatsAppDate(params.visitDate)}`,
    "",
    "Prescription:",
    "",
  ];

  params.items.forEach((item, index) => {
    const medHeader = item.potency ? `${item.medicineName} ${item.potency}` : item.medicineName;
    lines.push(`${index + 1}. ${medHeader}`);
    if (item.dosage) {
      lines.push(`   Dosage: ${item.dosage}`);
    }
    if (item.frequency) {
      lines.push(`   Frequency: ${item.frequency}`);
    }
    if (item.duration) {
      lines.push(`   Duration: ${item.duration}`);
    }
    if (item.instructions && item.instructions.trim()) {
      lines.push(`   Instructions: ${item.instructions.trim()}`);
    }
    lines.push("");
  });

  if (params.doctorName && params.doctorName.trim()) {
    lines.push(`Doctor: ${params.doctorName.trim()}`);
  }
  if (params.clinicPhone && params.clinicPhone.trim()) {
    lines.push(`Hospital Phone: ${params.clinicPhone.trim()}`);
  }

  lines.push("");
  lines.push("Please follow the doctor's instructions.");
  lines.push("");
  lines.push("Thank you.");

  return lines.join("\n");
}

export interface BillingMessageItem {
  label: string;
  qty: number;
  rate: number;
}

export interface BillingMessageParams {
  clinicName?: string;
  patientName: string;
  billNo: string;
  date: string;
  items: BillingMessageItem[];
  consultationFee?: number;
  medicineTotal?: number;
  discount?: number;
  totalAmount: number;
}

export function buildBillingMessage(params: BillingMessageParams): string {
  const clinic = (params.clinicName || "Dr. Ayus Homeopathy Hospital").trim();
  const patient = (params.patientName || "Patient").trim();

  const lines: string[] = [
    clinic,
    "",
    `Dear ${patient},`,
    "",
    "Your bill has been generated successfully.",
    "",
    `Bill No: ${params.billNo}`,
    `Date: ${formatWhatsAppDate(params.date)}`,
    "",
    "Items:",
    "",
  ];

  // Fee vs medicine breakdown
  let consultTotal = params.consultationFee;
  let medTotal = params.medicineTotal;

  if (consultTotal === undefined || medTotal === undefined) {
    let c = 0;
    let m = 0;
    for (const it of params.items) {
      const isFee = /consultation|follow-up|followup|visit|registration/i.test(it.label);
      const sub = it.qty * it.rate;
      if (isFee) c += sub;
      else m += sub;
    }
    if (consultTotal === undefined) consultTotal = c;
    if (medTotal === undefined) medTotal = m;
  }

  params.items.forEach((it) => {
    lines.push(`${it.label} × ${it.qty} — ₹${it.qty * it.rate}`);
  });

  lines.push("");
  if (consultTotal > 0) {
    lines.push(`Consultation: ₹${consultTotal}`);
  }
  if (medTotal > 0) {
    lines.push(`Medicine Total: ₹${medTotal}`);
  }
  lines.push(`Discount: ₹${params.discount ?? 0}`);
  lines.push("");
  lines.push(`Total Amount: ₹${params.totalAmount}`);
  lines.push("");
  lines.push(`Thank you for choosing ${clinic}.`);

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// WhatsApp Click-to-Chat Opener
// ─────────────────────────────────────────────────────────────────

/**
 * Validates the patient's phone number, prepares the WhatsApp click-to-chat URL,
 * and opens WhatsApp/WhatsApp Web in a new tab.
 * Does NOT auto-send. Staff presses Send manually.
 */
export function openWhatsAppMessage(phone?: string | null, text?: string): boolean {
  if (!text) {
    toast.error("Message content is empty.");
    return false;
  }

  const normalized = normalizeIndianPhoneNumber(phone);
  if (!normalized) {
    toast.error("WhatsApp number is not available for this patient.");
    return false;
  }

  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/${normalized}?text=${encoded}`;

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
