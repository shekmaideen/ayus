import React from "react";
import type { Bill, ClinicSettings, Patient } from "@/data/types";
import {
  AyusHospitalCrest,
  AyusMedicalCross,
  HOSPITAL_INFO,
} from "./HospitalBranding";
import { formatPrescriptionDate } from "./PrescriptionPrintSheet";
import { inr } from "@/lib/format";

export interface BillPrintSheetProps {
  bill: Bill;
  patient: Patient;
  settings?: ClinicSettings;
}

/**
 * Extracts optional potency and form from medicine labels like:
 * "ARNICA MONTANA 30CH (Bottle)" -> { name: "ARNICA MONTANA", potency: "30CH", form: "Bottle" }
 */
function parseBillItemLabel(label: string): {
  name: string;
  potency: string;
  form: string;
} {
  const trimmed = label.trim();
  // Check if there is (Form) at end
  const formMatch = /\(([^)]+)\)$/.exec(trimmed);
  let withoutForm = trimmed;
  let form = "—";
  if (formMatch && formMatch[1]) {
    form = formMatch[1].trim();
    withoutForm = trimmed.slice(0, formMatch.index).trim();
  }

  // Check if potency is attached e.g. "30CH", "200CH", "1M", "Q", "6X", "12X"
  const potencyMatch = /\s+(Q|[0-9]+(?:CH|C|X|K|M))$/i.exec(withoutForm);
  if (potencyMatch && potencyMatch[1]) {
    const potency = potencyMatch[1].toUpperCase();
    const name = withoutForm.slice(0, potencyMatch.index).trim();
    return { name, potency, form };
  }

  return { name: withoutForm, potency: "—", form };
}

export function BillPrintSheet({
  bill,
  patient,
  settings,
}: BillPrintSheetProps) {
  const subtotal = bill.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const amountReceived = Number(bill.amountReceived || 0);
  const balance = Math.max(0, subtotal - amountReceived);

  // Group or identify consultation fee if present
  const consultationItem = bill.items.find((it) =>
    /consultation|follow-up|followup|registration/i.test(it.label)
  );

  return (
    <article
      id="ayus-bill-document"
      className="print-sheet mx-auto w-full max-w-[850px] bg-white text-black border border-slate-200 shadow-md print:shadow-none print:border-none print:max-w-none print:w-full p-5 print:p-0 print:m-0"
      style={{
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#000000",
        backgroundColor: "#ffffff",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (Official Brand Header)
      ───────────────────────────────────────────────────────────── */}
      <div className="pb-2 border-b-2 border-[#009e49]">
        <div className="flex items-center justify-between gap-3">
          {/* Left Hospital Crest Logo */}
          <div className="w-20 shrink-0 flex items-center justify-start">
            {settings?.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt="Hospital Crest"
                className="h-16 w-16 object-contain"
              />
            ) : (
              <AyusHospitalCrest className="h-16 w-16" />
            )}
          </div>

          {/* Center Title */}
          <div className="flex-1 text-center px-1">
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight text-[#c5161d] uppercase leading-none"
              style={{
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                letterSpacing: "-0.5px",
              }}
            >
              Dr. AYUS
            </h1>
            <h2
              className="text-base sm:text-lg font-black text-[#c5161d] uppercase mt-1 leading-none"
              style={{
                fontFamily: "'Arial Black', sans-serif",
                letterSpacing: "3px",
              }}
            >
              HOMOEOPATHY HOSPITAL
            </h2>
            <p className="text-[11px] font-bold text-[#009e49] mt-1 tracking-wider uppercase">
              Official Medical Bill &amp; Receipt
            </p>
          </div>

          {/* Right Green Medical Cross */}
          <div className="w-20 shrink-0 flex items-center justify-end">
            <AyusMedicalCross className="h-16 w-16" />
          </div>
        </div>

        {/* Doctor Info line */}
        <div className="flex flex-row justify-between items-center text-xs mt-2 pt-1 border-t border-dotted border-[#009e49]">
          <div className="text-left space-y-0.5 leading-tight">
            <span className="font-bold text-[#c5161d] text-sm">
              {settings?.doctorName || HOSPITAL_INFO.doctorName}
            </span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="font-bold text-[#009e49]">
              {HOSPITAL_INFO.doctorDesignation}
            </span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="font-semibold text-slate-600 text-[11px]">
              {HOSPITAL_INFO.regNo}
            </span>
          </div>
          <div className="text-right font-mono font-bold text-xs text-[#c5161d]">
            ORIGINAL RECEIPT
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PATIENT & INVOICE DETAILS
      ───────────────────────────────────────────────────────────── */}
      <div className="my-3 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
        {/* Patient Details */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-[#c5161d] uppercase tracking-wider">
            Patient Information
          </div>
          <div className="text-sm font-bold text-slate-900">{patient.name}</div>
          <div className="flex items-center gap-2 text-slate-600">
            <span>Reg ID:</span>
            <span className="font-mono font-bold text-slate-900">
              {patient.regNo}
            </span>
          </div>
          {patient.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <span>Phone:</span>
              <span className="font-mono text-slate-900">{patient.phone}</span>
            </div>
          )}
          {patient.age > 0 && (
            <div className="text-slate-600">
              <span>Age / Sex: </span>
              <span className="font-medium text-slate-900">
                {patient.age} Yrs / {patient.gender}
              </span>
            </div>
          )}
        </div>

        {/* Invoice Meta */}
        <div className="space-y-1 text-right">
          <div className="text-[10px] font-bold text-[#c5161d] uppercase tracking-wider">
            Invoice Information
          </div>
          <div className="text-sm font-mono font-black text-slate-900">
            {bill.invoiceNo}
          </div>
          <div className="flex items-center justify-end gap-2 text-slate-600">
            <span>Date:</span>
            <span className="font-semibold text-slate-900">
              {formatPrescriptionDate(bill.date)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 text-slate-600">
            <span>Payment Status:</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                bill.status === "Paid"
                  ? "bg-emerald-100 text-emerald-800"
                  : bill.status === "Partial"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {bill.status}
            </span>
          </div>
          {bill.paymentMode && (
            <div className="text-slate-600">
              <span>Mode: </span>
              <span className="font-semibold text-slate-900">
                {bill.paymentMode}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BILL ITEMS TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="my-3 min-h-[220px]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100/80 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              <th className="py-2 px-2 text-center w-[6%] border-r border-slate-200">
                #
              </th>
              <th className="py-2 px-3 w-[44%] border-r border-slate-200">
                Item / Medicine Description
              </th>
              <th className="py-2 px-2 text-center w-[12%] border-r border-slate-200">
                Potency
              </th>
              <th className="py-2 px-2 text-center w-[12%] border-r border-slate-200">
                Form
              </th>
              <th className="py-2 px-2 text-right w-[8%] border-r border-slate-200">
                Qty
              </th>
              <th className="py-2 px-2 text-right w-[10%] border-r border-slate-200">
                Rate
              </th>
              <th className="py-2 px-3 text-right w-[12%]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bill.items.map((item, index) => {
              const { name, potency, form } = parseBillItemLabel(item.label);
              const isConsultation = /consultation|follow-up|followup|registration/i.test(
                item.label
              );

              return (
                <tr
                  key={`${item.label}-${index}`}
                  className="align-middle hover:bg-slate-50/50"
                >
                  <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px] border-r border-slate-100">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100">
                    <span
                      className={`font-semibold ${
                        isConsultation ? "text-[#c5161d]" : "text-slate-900"
                      }`}
                    >
                      {name}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-[#008000] border-r border-slate-100">
                    {potency}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-600 border-r border-slate-100">
                    {form}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-800 border-r border-slate-100">
                    {item.qty}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-700 border-r border-slate-100">
                    {inr(item.rate)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {inr(item.qty * item.rate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TOTALS & FINANCIAL SUMMARY
      ───────────────────────────────────────────────────────────── */}
      <div className="my-4 flex flex-row justify-between items-start gap-4 border-t-2 border-slate-300 pt-3">
        {/* Left Side: Terms / Payment note */}
        <div className="w-[50%] space-y-1 text-[10.5px] text-slate-600">
          <p className="font-bold text-[#c5161d] uppercase tracking-wide">
            Hospital Billing Notes :
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-500">
            <li>Medicines once dispensed cannot be returned or exchanged.</li>
            <li>Consultation validity for follow-up is as per hospital policy.</li>
            <li>Computer-generated invoice; no physical signature required.</li>
          </ul>
        </div>

        {/* Right Side: Totals Card */}
        <div className="w-[45%] max-w-sm space-y-1.5 text-xs">
          <div className="flex justify-between py-0.5 text-slate-600">
            <span>Subtotal :</span>
            <span className="font-mono font-semibold text-slate-900">
              {inr(subtotal)}
            </span>
          </div>

          {consultationItem && (
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Consultation / Review Fee :</span>
              <span className="font-mono text-slate-900">
                {inr(consultationItem.qty * consultationItem.rate)}
              </span>
            </div>
          )}

          {/* Highlighted Total Box */}
          <div className="my-1 flex items-center justify-between rounded-lg bg-emerald-50 border-2 border-[#16a34a] p-2.5">
            <span className="text-xs font-black text-[#15803d] uppercase tracking-wider">
              TOTAL AMOUNT :
            </span>
            <span className="font-mono text-lg font-black text-[#15803d]">
              {inr(subtotal)}
            </span>
          </div>

          <div className="flex justify-between py-0.5 text-slate-600">
            <span>Amount Received :</span>
            <span className="font-mono font-semibold text-emerald-700">
              {inr(amountReceived)}
            </span>
          </div>

          <div className="flex justify-between py-1 border-t border-slate-200 font-bold text-slate-900">
            <span className={balance > 0 ? "text-rose-600" : "text-slate-700"}>
              Balance Due :
            </span>
            <span
              className={`font-mono ${
                balance > 0 ? "text-rose-600 font-black text-sm" : "text-slate-900"
              }`}
            >
              {inr(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. SIGNATURE & STAMP ROW
      ───────────────────────────────────────────────────────────── */}
      <div className="my-4 flex justify-between items-end pt-3">
        <div className="text-left text-[10px] text-slate-500">
          <p className="font-bold text-slate-700">
            Dr. Ayus Homoeopathy Hospital
          </p>
          <p>Thank you for choosing Dr. Ayus Homoeopathy Hospital.</p>
          <p className="italic text-[#009e49]">Wishing you good health.</p>
        </div>

        <div className="text-center min-w-[170px]">
          <div className="h-9"></div>
          <div className="border-t border-slate-400 pt-0.5">
            <p className="text-[10px] font-bold text-slate-900">
              {settings?.doctorName || HOSPITAL_INFO.doctorName}
            </p>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
              Authorized Signatory
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <div className="mt-3 pt-2 border-t-2 border-[#16a34a] space-y-1">
        {/* Tamil Motto */}
        <p className="text-center font-bold text-[#c5161d] text-xs tracking-tight">
          {HOSPITAL_INFO.tamilMotto}
        </p>

        {/* Address and Contact Details */}
        <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-[#c5161d] leading-tight pt-0.5">
          <div>
            <div>No.23, Mudichur Main Road,</div>
            <div>Mudichur, Chennai - 600048. (Near City Union Bank)</div>
          </div>
          <div className="text-right">
            <div>For Appointment Call : 044 - 2276 1103 / 89398 65447</div>
            <div>Email ID : dr.ayushomoeopathyhospital@gmail.com</div>
          </div>
        </div>
      </div>
    </article>
  );
}
