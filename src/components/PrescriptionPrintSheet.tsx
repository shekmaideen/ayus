import React from "react";
import type { ClinicSettings, Medicine, Patient, Prescription, Visit } from "@/data/types";
import { AyusHospitalCrest, AyusMedicalCross, HOSPITAL_INFO, RxSymbol } from "./HospitalBranding";

export interface ClinicalNotesParsed {
  diagnosis: string;
  specialInstructions: string;
}

/**
 * Parses the raw notes string which may be a JSON string or plain text.
 */
export function parseClinicalNotes(rawNotes?: string | null): ClinicalNotesParsed {
  if (!rawNotes || !rawNotes.trim()) {
    return { diagnosis: "", specialInstructions: "" };
  }
  const trimmed = rawNotes.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        diagnosis: typeof parsed.diagnosis === "string" ? parsed.diagnosis.trim() : "",
        specialInstructions: typeof parsed.specialInstructions === "string" ? parsed.specialInstructions.trim() : "",
      };
    } catch {
      // Fall through to plain text
    }
  }
  return { diagnosis: trimmed, specialInstructions: "" };
}

/**
 * Serializes diagnosis and special instructions into a single notes string.
 */
export function serializeClinicalNotes(diagnosis: string, specialInstructions: string): string {
  const d = diagnosis.trim();
  const s = specialInstructions.trim();
  if (!d && !s) return "";
  if (!s) return d; // If only diagnosis, simple string for backward-compat
  return JSON.stringify({ diagnosis: d, specialInstructions: s });
}

/**
 * Formats a date string into DD/MM/YYYY
 */
export function formatPrescriptionDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      const d = String(dt.getDate()).padStart(2, "0");
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const y = dt.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export interface PrescriptionPrintSheetProps {
  prescription: Prescription;
  patient: Patient;
  visit?: Visit | null | undefined;
  medicines?: Medicine[] | undefined;
  settings?: ClinicSettings | undefined;
}

export function PrescriptionPrintSheet({
  prescription,
  patient,
  visit,
  medicines = [],
  settings,
}: PrescriptionPrintSheetProps) {
  const notes = parseClinicalNotes(prescription.notes);
  const hasClinicalSection = Boolean(
    notes.diagnosis || notes.specialInstructions || prescription.followUpDate
  );

  return (
    <article
      id="ayus-prescription-document"
      className="print-sheet mx-auto w-full max-w-[850px] bg-white text-slate-900 shadow-sm print:shadow-none print:max-w-none print:w-full rounded-xl print:rounded-none p-6 md:p-8 print:p-0 print:m-0"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#0f172a",
        backgroundColor: "#ffffff",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER
      ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 pb-3">
        {/* Top Logo and Hospital Name Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Hospital Crest Logo */}
          <div className="w-24 shrink-0 flex items-center justify-start">
            {settings?.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt="Hospital Crest"
                className="h-20 w-20 object-contain"
              />
            ) : (
              <AyusHospitalCrest className="h-20 w-20" />
            )}
          </div>

          {/* Center Title */}
          <div className="flex-1 text-center px-2">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight text-[#c5161d] font-sans uppercase leading-none"
              style={{ letterSpacing: "-0.5px" }}
            >
              Dr. AYUS
            </h1>
            <h2
              className="text-sm sm:text-base font-extrabold tracking-[0.16em] text-[#c5161d] uppercase mt-1 leading-tight font-sans"
              style={{ letterSpacing: "2.5px" }}
            >
              HOMOEOPATHY HOSPITAL
            </h2>
          </div>

          {/* Right Green Medical Cross */}
          <div className="w-24 shrink-0 flex items-center justify-end">
            <AyusMedicalCross className="h-16 w-16" />
          </div>
        </div>

        {/* Dual color / dashed separator line */}
        <div className="my-2.5 border-t-2 border-dashed border-[#15803d]" />

        {/* Doctor Info & Consulting Timings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Doctor Credentials (Left) */}
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-[#b91c1c] tracking-tight">
              {settings?.doctorName || HOSPITAL_INFO.doctorName}
            </p>
            <p className="text-xs font-semibold text-[#15803d]">
              {HOSPITAL_INFO.doctorDesignation}
            </p>
            <p className="text-[11px] font-semibold text-slate-800">
              {HOSPITAL_INFO.regNo}
            </p>
          </div>

          {/* Consulting Timings (Right) */}
          <div className="sm:text-right space-y-0.5 text-[11px]">
            <p className="font-bold text-[#b91c1c] uppercase tracking-wider text-[11px]">
              CONSULTING TIMINGS :
            </p>
            <p>
              <strong className="text-[#15803d]">Monday to Sunday :</strong>{" "}
              <span className="text-slate-800">Morning 10.00 am to 2.00 pm</span>
            </p>
            <p>
              <strong className="text-[#15803d]">Monday / Wednesday / Friday :</strong>{" "}
              <span className="text-slate-800">Evening 5.30 pm to 9.30 pm</span>
            </p>
            <p>
              <strong className="text-[#15803d]">Tuesday / Thursday / Saturday :</strong>{" "}
              <span className="text-slate-800">Evening 5.30 pm to 7.30 pm</span>
            </p>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. PATIENT INFORMATION BOX
      ───────────────────────────────────────────────────────────── */}
      <section className="my-3 rounded-lg border border-slate-300 bg-[#fbfcfd] p-3 text-xs print:bg-white print:border-slate-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          <div className="flex items-center">
            <span className="w-28 shrink-0 font-medium text-slate-600">Patient Name:</span>
            <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
          </div>
          <div className="flex items-center">
            <span className="w-28 shrink-0 font-medium text-slate-600">Reg. ID:</span>
            <span className="font-bold font-mono text-slate-900">{patient.regNo}</span>
          </div>

          <div className="flex items-center">
            <span className="w-28 shrink-0 font-medium text-slate-600">Age / Sex:</span>
            <span className="font-semibold text-slate-900">
              {patient.age} Yrs / {patient.gender}
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-28 shrink-0 font-medium text-slate-600">Date:</span>
            <span className="font-bold text-slate-900">
              {formatPrescriptionDate(prescription.date)}
            </span>
          </div>

          <div className="flex items-center">
            <span className="w-28 shrink-0 font-medium text-slate-600">Phone:</span>
            <span className="font-semibold text-slate-900">{patient.phone || "—"}</span>
          </div>
          <div className="flex items-center">
            <span className="w-28 shrink-0 font-medium text-slate-600">Visit Type:</span>
            <span className="font-semibold text-slate-900">
              {visit?.type || (prescription.isRefill ? "Refill Visit" : "Consultation")}
            </span>
          </div>

          {patient.address && (
            <div className="col-span-1 sm:col-span-2 flex pt-1 mt-0.5 border-t border-slate-200/70">
              <span className="w-28 shrink-0 font-medium text-slate-600">Address:</span>
              <span className="text-slate-800">{patient.address}</span>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. PRESCRIPTION SECTION (Rx)
      ───────────────────────────────────────────────────────────── */}
      <section className="mt-4">
        <div className="flex items-baseline gap-2 mb-2">
          <RxSymbol className="text-3xl text-[#047857]" />
          <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
            Prescription
          </span>
        </div>

        {/* Clean 10-column table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-left text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 uppercase tracking-wide text-[10px] font-bold">
                <th className="py-2 px-1.5 text-center w-[4%] border-r border-slate-300">No.</th>
                <th className="py-2 px-2 w-[23%] border-r border-slate-300">Medicine Name</th>
                <th className="py-2 px-2 w-[10%] border-r border-slate-300">Brand</th>
                <th className="py-2 px-1.5 text-center w-[8%] border-r border-slate-300">Potency</th>
                <th className="py-2 px-1.5 w-[8%] border-r border-slate-300">Form</th>
                <th className="py-2 px-2 w-[11%] border-r border-slate-300">Dosage</th>
                <th className="py-2 px-2 w-[11%] border-r border-slate-300">Frequency</th>
                <th className="py-2 px-1.5 w-[9%] border-r border-slate-300">Duration</th>
                <th className="py-2 px-1 text-center w-[5%] border-r border-slate-300">Qty</th>
                <th className="py-2 px-2 w-[11%]">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {prescription.items.map((item, idx) => {
                const med = medicines.find((m) => m.id === item.medicineId);
                const displayBrand = item.brand || med?.brand || "—";
                const displayForm = item.formType || med?.formType || "Bottle";
                const displayPotency =
                  item.potency && item.potency.trim() !== "" && item.potency !== "-"
                    ? item.potency
                    : "—";

                return (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-slate-50/70 print:hover:bg-transparent page-break-inside-avoid"
                  >
                    <td className="py-2 px-1.5 text-center font-medium text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 font-bold text-slate-900 border-r border-slate-200">
                      {item.medicineName}
                    </td>
                    <td className="py-2 px-2 text-slate-700 border-r border-slate-200">
                      {displayBrand}
                    </td>
                    <td className="py-2 px-1.5 text-center font-mono font-semibold text-emerald-800 border-r border-slate-200">
                      {displayPotency}
                    </td>
                    <td className="py-2 px-1.5 text-slate-700 border-r border-slate-200">
                      {displayForm}
                    </td>
                    <td className="py-2 px-2 text-slate-800 font-medium border-r border-slate-200">
                      {item.dosage || "—"}
                    </td>
                    <td className="py-2 px-2 text-slate-800 border-r border-slate-200">
                      {item.frequency || "—"}
                    </td>
                    <td className="py-2 px-1.5 text-slate-800 border-r border-slate-200">
                      {item.duration || "—"}
                    </td>
                    <td className="py-2 px-1 text-center font-medium text-slate-900 border-r border-slate-200">
                      {item.quantity || 1}
                    </td>
                    <td className="py-2 px-2 text-slate-700">
                      {item.instructions || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. CLINICAL NOTES & SPECIAL INSTRUCTIONS (Only if present)
      ───────────────────────────────────────────────────────────── */}
      {hasClinicalSection && (
        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs print:bg-white print:border-slate-300 space-y-2">
          {notes.diagnosis && (
            <div>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                Diagnosis / Clinical Notes:
              </span>
              <p className="mt-0.5 text-slate-900 whitespace-pre-wrap">{notes.diagnosis}</p>
            </div>
          )}

          {notes.specialInstructions && (
            <div>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                Special Instructions:
              </span>
              <p className="mt-0.5 text-slate-900 whitespace-pre-wrap">{notes.specialInstructions}</p>
            </div>
          )}

          {prescription.followUpDate && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                <span>Follow-up Date:</span>
                <span className="font-bold">{formatPrescriptionDate(prescription.followUpDate)}</span>
              </span>
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. DOCTOR SIGNATURE (Bottom Right)
      ───────────────────────────────────────────────────────────── */}
      <section className="mt-6 flex justify-end page-break-inside-avoid">
        <div className="text-center min-w-[220px]">
          {/* Dedicated whitespace for physical handwritten signature or clinic stamp */}
          <div className="h-14"></div>
          <div className="border-t border-slate-400 pt-1.5">
            <p className="text-xs font-bold text-slate-900">
              {settings?.doctorName || HOSPITAL_INFO.doctorName}
            </p>
            <p className="text-[11px] text-[#15803d] font-semibold">
              {HOSPITAL_INFO.doctorDesignation}
            </p>
            <p className="text-[10px] text-slate-600 font-medium">
              {HOSPITAL_INFO.regNo}
            </p>
            <p className="mt-1 text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Doctor&apos;s Signature
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="mt-6 pt-2.5 border-t-2 border-[#16a34a] text-center text-xs page-break-inside-avoid">
        {/* Tamil Motto from Hospital Letterhead */}
        <p className="text-[#c5161d] font-bold text-xs tracking-wide">
          {HOSPITAL_INFO.tamilMotto}
        </p>

        {/* Tagline Badge */}
        <div className="my-1.5 inline-block rounded-full border border-[#16a34a] bg-emerald-50/70 px-4 py-0.5 text-[11px] font-bold text-[#15803d]">
          &ldquo;{HOSPITAL_INFO.tagline}&rdquo;
        </div>

        {/* Hospital Address and Contact Info */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[10px] sm:text-[11px] text-slate-700">
          <div className="text-left">
            <p className="font-bold text-slate-900">
              {settings?.clinicName || HOSPITAL_INFO.name}
            </p>
            <p className="text-slate-600">
              {settings?.address || HOSPITAL_INFO.address}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p>
              <strong className="text-slate-900">For Appointment Call:</strong>{" "}
              {settings?.phone || HOSPITAL_INFO.phone}
            </p>
            <p>
              <strong className="text-slate-900">Email:</strong> {HOSPITAL_INFO.email}
            </p>
          </div>
        </div>
      </footer>
    </article>
  );
}
