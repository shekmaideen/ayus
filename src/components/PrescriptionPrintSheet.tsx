import React from "react";
import type { ClinicSettings, Medicine, Patient, Prescription, Visit } from "@/data/types";
import { AyusHospitalCrest, AyusMedicalCross, HOSPITAL_INFO } from "./HospitalBranding";

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

  const doctorName = settings?.doctorName || HOSPITAL_INFO.doctorName;

  return (
    <article
      id="ayus-prescription-document"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        maxWidth: "794px",
        width: "100%",
        margin: "0 auto",
        padding: "28px 36px",
        boxSizing: "border-box",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER — Logo | Hospital Name | Medical Cross
      ───────────────────────────────────────────────────────────── */}
      <header>
        {/* Top row: Crest | Title | Cross */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          {/* Left Hospital Crest */}
          <div style={{ width: "72px", flexShrink: 0, display: "flex", alignItems: "center" }}>
            {settings?.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="Hospital Crest" style={{ height: "68px", width: "68px", objectFit: "contain" }} />
            ) : (
              <AyusHospitalCrest className="h-16 w-16" />
            )}
          </div>

          {/* Center Title */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 900,
                color: "#c5161d",
                fontFamily: "'Times New Roman', Georgia, serif",
                letterSpacing: "1px",
                lineHeight: 1,
                textTransform: "uppercase",
              }}
            >
              DR. AYUS
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#c5161d",
                letterSpacing: "3.5px",
                textTransform: "uppercase",
                marginTop: "3px",
              }}
            >
              HOMOEOPATHY HOSPITAL
            </div>
          </div>

          {/* Right Green Medical Cross */}
          <div style={{ width: "72px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <AyusMedicalCross className="h-16 w-16" />
          </div>
        </div>

        {/* Dotted separator line */}
        <div style={{ marginTop: "8px", borderTop: "2px dotted #15803d" }} />

        {/* Doctor Info (left) + Consulting Timings (right) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "6px", gap: "12px" }}>
          {/* Doctor Credentials */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#c5161d", margin: 0, lineHeight: 1.4 }}>
              {doctorName}
            </p>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#15803d", margin: "1px 0 0 0", lineHeight: 1.4 }}>
              {HOSPITAL_INFO.doctorDesignation}
            </p>
            <p style={{ fontSize: "11px", fontWeight: 500, color: "#1e293b", margin: "1px 0 0 0", lineHeight: 1.4 }}>
              {HOSPITAL_INFO.regNo}
            </p>
          </div>

          {/* Consulting Timings */}
          <div style={{ textAlign: "right", fontSize: "10.5px", lineHeight: 1.5, flexShrink: 0, maxWidth: "260px" }}>
            <p style={{ fontWeight: 700, color: "#c5161d", fontSize: "11px", textTransform: "uppercase", margin: 0, letterSpacing: "0.5px" }}>
              CONSULTING TIMINGS
            </p>
            <p style={{ margin: "1px 0 0 0", color: "#1e293b" }}>
              <span style={{ color: "#15803d", fontWeight: 700 }}>Mon to Sun :</span>
              {" "}<span style={{ fontWeight: 700 }}>Morning 10:00 AM to 2:00 PM</span>
            </p>
            <p style={{ margin: "1px 0 0 0", color: "#1e293b" }}>
              <span style={{ color: "#15803d", fontWeight: 700 }}>Mon / Wed / Fri :</span>
              {" "}<span style={{ fontWeight: 700 }}>Evening 5:30 PM to 9:30 PM</span>
            </p>
            <p style={{ margin: "1px 0 0 0", color: "#1e293b" }}>
              <span style={{ color: "#15803d", fontWeight: 700 }}>Tue / Thu / Sat :</span>
              {" "}<span style={{ fontWeight: 700 }}>Evening 5:30 PM to 7:30 PM</span>
            </p>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. PATIENT INFORMATION BOX — horizontal rows
      ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          marginTop: "14px",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          padding: "10px 14px",
          fontSize: "11.5px",
          backgroundColor: "#f8fafc",
        }}
      >
        {/* Row 1: Patient Name | Reg. ID | Date */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", flex: "2 1 0", minWidth: 0 }}>
            <span style={{ color: "#c5161d", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Patient Name:</span>
            <span style={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{patient.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: "1.5 1 0", minWidth: 0 }}>
            <span style={{ color: "#64748b", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Reg. ID:</span>
            <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "monospace", fontSize: "10.5px", wordBreak: "break-all" }}>{patient.regNo}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <span style={{ color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>Date:</span>
            <span style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{formatPrescriptionDate(prescription.date)}</span>
          </div>
        </div>

        {/* Row 2: Age/Sex | Doctor | Phone */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "5px", flexWrap: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: "2 1 0" }}>
            <span style={{ color: "#c5161d", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Age / Sex:</span>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>{patient.age} Yrs / {patient.gender}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: "1.5 1 0", minWidth: 0 }}>
            <span style={{ color: "#64748b", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Doctor:</span>
            <span style={{ fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>{doctorName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <span style={{ color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>Phone:</span>
            <span style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{patient.phone || "—"}</span>
          </div>
        </div>

        {/* Row 3 (optional): Address */}
        {patient.address && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginTop: "5px", paddingTop: "5px", borderTop: "1px solid #e2e8f0" }}>
            <span style={{ color: "#64748b", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Address:</span>
            <span style={{ color: "#1e293b", wordBreak: "break-word" }}>{patient.address}</span>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. PRESCRIPTION SECTION — Big R with underline
      ───────────────────────────────────────────────────────────── */}
      <section style={{ marginTop: "16px" }}>
        {/* Rx Header Row: big R + extending underline */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              fontFamily: "'Times New Roman', Georgia, serif",
              fontSize: "42px",
              fontWeight: 900,
              color: "#15803d",
              lineHeight: 1,
              display: "inline-block",
            }}
          >
            R
          </span>
          <div style={{ flex: 1, borderBottom: "2px solid #cbd5e1", marginBottom: "6px" }} />
        </div>

        {/* Prescription Table */}
        <div style={{ width: "100%", overflowX: "hidden" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "10.5px",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                  borderTop: "1px solid #94a3b8",
                  borderBottom: "1px solid #94a3b8",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <th style={{ padding: "6px 4px", textAlign: "center", width: "4%", borderRight: "1px solid #cbd5e1" }}>#</th>
                <th style={{ padding: "6px 6px", textAlign: "left", width: "22%", borderRight: "1px solid #cbd5e1" }}>Medicine Name</th>
                <th style={{ padding: "6px 5px", textAlign: "left", width: "10%", borderRight: "1px solid #cbd5e1" }}>Brand</th>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "8%", borderRight: "1px solid #cbd5e1" }}>Potency</th>
                <th style={{ padding: "6px 5px", textAlign: "left", width: "8%", borderRight: "1px solid #cbd5e1" }}>Form</th>
                <th style={{ padding: "6px 5px", textAlign: "left", width: "11%", borderRight: "1px solid #cbd5e1" }}>Dosage</th>
                <th style={{ padding: "6px 5px", textAlign: "left", width: "12%", borderRight: "1px solid #cbd5e1" }}>Frequency</th>
                <th style={{ padding: "6px 5px", textAlign: "left", width: "9%", borderRight: "1px solid #cbd5e1" }}>Duration</th>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "4%", borderRight: "1px solid #cbd5e1" }}>Qty</th>
                <th style={{ padding: "6px 5px", textAlign: "left", width: "12%" }}>Instructions</th>
              </tr>
            </thead>
            <tbody>
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
                    style={{ borderBottom: "1px solid #e2e8f0", verticalAlign: "top" }}
                  >
                    <td style={{ padding: "6px 4px", textAlign: "center", color: "#64748b", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "6px 6px", fontWeight: 700, color: "#0f172a", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {item.medicineName}
                    </td>
                    <td style={{ padding: "6px 5px", color: "#334155", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {displayBrand}
                    </td>
                    <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "#047857", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {displayPotency}
                    </td>
                    <td style={{ padding: "6px 5px", color: "#334155", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {displayForm}
                    </td>
                    <td style={{ padding: "6px 5px", color: "#1e293b", fontWeight: 500, borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {item.dosage || "—"}
                    </td>
                    <td style={{ padding: "6px 5px", color: "#1e293b", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {item.frequency || "—"}
                    </td>
                    <td style={{ padding: "6px 5px", color: "#1e293b", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {item.duration || "—"}
                    </td>
                    <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600, color: "#0f172a", borderRight: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                      {item.quantity || 1}
                    </td>
                    <td style={{ padding: "6px 5px", color: "#334155", wordBreak: "break-word" }}>
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
          4. CLINICAL NOTES & NEXT REVIEW (if present)
      ───────────────────────────────────────────────────────────── */}
      {hasClinicalSection && (
        <section
          style={{
            marginTop: "14px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "10px 14px",
            fontSize: "11px",
            backgroundColor: "#f8fafc",
          }}
        >
          {notes.diagnosis && (
            <div style={{ marginBottom: notes.specialInstructions || prescription.followUpDate ? "8px" : "0" }}>
              <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Diagnosis / Clinical Notes:
              </span>
              <p style={{ margin: "3px 0 0 0", color: "#0f172a", whiteSpace: "pre-wrap", fontSize: "11px" }}>
                {notes.diagnosis}
              </p>
            </div>
          )}

          {notes.specialInstructions && (
            <div style={{ marginBottom: prescription.followUpDate ? "8px" : "0" }}>
              <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Special Instructions:
              </span>
              <p style={{ margin: "3px 0 0 0", color: "#0f172a", whiteSpace: "pre-wrap", fontSize: "11px" }}>
                {notes.specialInstructions}
              </p>
            </div>
          )}

          {prescription.followUpDate && (
            <div>
              <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Next Review / Follow-up Date:{" "}
                <span style={{ color: "#15803d" }}>{formatPrescriptionDate(prescription.followUpDate)}</span>
              </span>
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. DOCTOR SIGNATURE — bottom right
      ───────────────────────────────────────────────────────────── */}
      <section style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ textAlign: "center", minWidth: "220px" }}>
          {/* Space for handwritten signature / stamp */}
          <div style={{ height: "52px" }} />
          <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {doctorName}
            </p>
            <p style={{ fontSize: "11px", color: "#15803d", fontWeight: 600, margin: "2px 0 0 0" }}>
              {HOSPITAL_INFO.doctorDesignation}
            </p>
            <p style={{ fontSize: "10px", color: "#475569", fontWeight: 500, margin: "2px 0 0 0" }}>
              {HOSPITAL_INFO.regNo}
            </p>
            <p style={{ marginTop: "4px", fontSize: "9.5px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "2px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Doctor&apos;s Signature
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer style={{ marginTop: "20px", paddingTop: "10px", borderTop: "2px solid #16a34a", textAlign: "center" }}>
        {/* Tamil Motto */}
        <p style={{ color: "#c5161d", fontWeight: 700, fontSize: "12px", letterSpacing: "0.3px", margin: 0 }}>
          {HOSPITAL_INFO.tamilMotto}
        </p>

        {/* Tagline pill with green lines on both sides */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0" }}>
          <div style={{ flex: 1, borderTop: "1px solid #16a34a" }} />
          <span
            style={{
              display: "inline-block",
              border: "1px solid #16a34a",
              borderRadius: "999px",
              padding: "2px 16px",
              fontSize: "10.5px",
              fontWeight: 700,
              color: "#15803d",
              whiteSpace: "nowrap",
            }}
          >
            &ldquo;{HOSPITAL_INFO.tagline}&rdquo;
          </span>
          <div style={{ flex: 1, borderTop: "1px solid #16a34a" }} />
        </div>

        {/* Address + Contact */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "8px",
            fontSize: "10px",
            color: "#475569",
            textAlign: "left",
          }}
        >
          {/* Left: Address lines */}
          <div style={{ maxWidth: "50%", wordBreak: "break-word" }}>
            {HOSPITAL_INFO.addressLines.map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : "1px 0 0 0", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "#1e293b" : "#475569" }}>
                {line}
              </p>
            ))}
          </div>

          {/* Right: Appointment call + email lines */}
          <div style={{ textAlign: "right", maxWidth: "50%", wordBreak: "break-word" }}>
            {HOSPITAL_INFO.appointmentLines.map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : "1px 0 0 0", fontWeight: i === 0 ? 700 : 400, color: i === 0 ? "#1e293b" : "#475569" }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </footer>
    </article>
  );
}
