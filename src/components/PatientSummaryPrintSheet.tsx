import React from "react";
import type { Bill, CaseHistory, ChiefComplaint, ClinicSettings, FollowUp, Patient, Prescription, Visit } from "@/data/types";
import { AyusHospitalCrest, AyusMedicalCross, HOSPITAL_INFO } from "./HospitalBranding";
import { formatDate, inr } from "@/lib/format";

export interface PatientSummaryPrintSheetProps {
  patient: Patient;
  caseHistory?: CaseHistory | null | undefined;
  chiefComplaints?: ChiefComplaint[];
  visits?: Visit[];
  prescriptions?: Prescription[];
  bills?: Bill[];
  followUps?: FollowUp[];
  settings?: ClinicSettings | null | undefined;
}

export function PatientSummaryPrintSheet({
  patient,
  caseHistory,
  chiefComplaints = [],
  visits = [],
  prescriptions = [],
  bills = [],
  followUps = [],
  settings,
}: PatientSummaryPrintSheetProps) {
  const sortedVisits = [...visits].sort((a, b) => b.date.localeCompare(a.date));
  const sortedComplaints = [...chiefComplaints].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sortedPrescriptions = [...prescriptions].sort((a, b) => b.date.localeCompare(a.date));
  const pendingFollowUp = followUps.find((f) => f.status === "Pending");

  return (
    <article
      id="ayus-patient-summary-document"
      className="print-sheet mx-auto w-full max-w-[850px] bg-white text-black border border-slate-200 shadow-md print:shadow-none print:border-none print:max-w-none print:w-full p-6 print:p-0 print:m-0"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#000000",
        backgroundColor: "#ffffff",
      }}
    >
      {/* ───────────────── HEADER ───────────────── */}
      <div className="pb-3 border-b-2 border-[#009e49]">
        <div className="flex items-center justify-between gap-3">
          <div className="w-16 shrink-0 flex items-center justify-start">
            {settings?.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="Hospital Logo" className="h-16 w-16 object-contain" />
            ) : (
              <AyusHospitalCrest className="h-16 w-16" />
            )}
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-black tracking-tight text-[#c8102e] uppercase leading-tight font-serif">
              {settings?.clinicName || HOSPITAL_INFO.name}
            </h1>
            <p className="text-sm font-bold text-[#009e49] tracking-wider uppercase mt-0.5">
              {settings?.doctorName || HOSPITAL_INFO.doctorName}
            </p>
            <p className="text-[11px] font-semibold text-slate-700">
              {HOSPITAL_INFO.doctorDesignation} &bull; {HOSPITAL_INFO.regNo}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {settings?.address || HOSPITAL_INFO.address} &bull; Ph: {settings?.phone || HOSPITAL_INFO.phone}
            </p>
          </div>
          <div className="w-16 shrink-0 flex items-center justify-end">
            <AyusMedicalCross className="h-14 w-14" />
          </div>
        </div>
      </div>

      <div className="bg-[#009e49] text-white text-center py-1 px-3 mt-2 font-bold text-xs tracking-wider uppercase rounded-sm print:bg-[#009e49] print:text-white">
        Comprehensive Patient Medical Profile & Visit History
      </div>

      {/* ───────────────── DEMOGRAPHICS BOX ───────────────── */}
      <div className="mt-3 border border-slate-300 rounded-sm p-3 bg-slate-50/50 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
          <div>
            <span className="font-semibold text-slate-600 block text-[10px] uppercase">Patient Name</span>
            <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600 block text-[10px] uppercase">Reg ID</span>
            <span className="font-mono font-bold text-[#c8102e] text-sm">{patient.regNo}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600 block text-[10px] uppercase">Age / Gender</span>
            <span className="font-medium text-slate-900">{patient.age} Yrs &bull; {patient.gender}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600 block text-[10px] uppercase">Contact Phone</span>
            <span className="font-medium text-slate-900">{patient.phone || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600 block text-[10px] uppercase">Registered Date</span>
            <span className="font-medium text-slate-900">{formatDate(patient.registeredOn)}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600 block text-[10px] uppercase">Occupation</span>
            <span className="font-medium text-slate-900">{patient.occupation || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600 block text-[10px] uppercase">Known Allergies</span>
            <span className="font-bold text-red-600">
              {patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "None reported"}
            </span>
          </div>
        </div>
        {patient.address && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <span className="font-semibold text-slate-600 text-[10px] uppercase mr-2">Address:</span>
            <span className="text-slate-800">{patient.address}</span>
          </div>
        )}
      </div>

      {/* ───────────────── CHIEF COMPLAINTS & CASE HISTORY ───────────────── */}
      <div className="mt-4 border border-slate-300 rounded-sm p-3">
        <h3 className="font-bold text-xs uppercase text-[#009e49] tracking-wider border-b border-slate-200 pb-1 mb-2">
          Clinical Case Summary & Chief Complaints
        </h3>
        
        {sortedComplaints.length > 0 ? (
          <div className="mb-3">
            <span className="font-semibold text-[11px] text-slate-700 block mb-1">Chief Complaints History:</span>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-800">
              {sortedComplaints.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.complaint}</span>
                  <span className="text-slate-500 text-[10px] ml-2">({c.createdAt.slice(0, 10)})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : caseHistory?.chiefComplaint ? (
          <div className="mb-2 text-xs">
            <span className="font-semibold text-slate-700">Chief Complaint: </span>
            <span>{caseHistory.chiefComplaint}</span>
          </div>
        ) : null}

        {caseHistory && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-800 mt-2 pt-2 border-t border-slate-100">
            {caseHistory.presentIllness && (
              <div>
                <span className="font-semibold text-slate-700 block text-[10px] uppercase">Present Illness:</span>
                <p className="text-slate-800">{caseHistory.presentIllness}</p>
              </div>
            )}
            {caseHistory.pastHistory && (
              <div>
                <span className="font-semibold text-slate-700 block text-[10px] uppercase">Past History:</span>
                <p className="text-slate-800">{caseHistory.pastHistory}</p>
              </div>
            )}
            {caseHistory.familyHistory && (
              <div>
                <span className="font-semibold text-slate-700 block text-[10px] uppercase">Family History:</span>
                <p className="text-slate-800">{caseHistory.familyHistory}</p>
              </div>
            )}
            {(caseHistory.better?.length > 0 || caseHistory.worse?.length > 0) && (
              <div>
                <span className="font-semibold text-slate-700 block text-[10px] uppercase">Modalities:</span>
                <p className="text-slate-800">
                  {caseHistory.better?.length > 0 && <span className="text-emerald-700">&lt; Better: {caseHistory.better.join(", ")} </span>}
                  {caseHistory.worse?.length > 0 && <span className="text-amber-700">&gt; Worse: {caseHistory.worse.join(", ")}</span>}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───────────────── VISIT HISTORY TABLE ───────────────── */}
      <div className="mt-4">
        <h3 className="font-bold text-xs uppercase text-[#009e49] tracking-wider mb-2">
          Visit History Timeline ({sortedVisits.length} Recorded Visits)
        </h3>
        
        {sortedVisits.length === 0 ? (
          <div className="text-center py-4 border border-dashed border-slate-300 rounded text-xs text-slate-500">
            No consultation visits recorded yet.
          </div>
        ) : (
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold text-left">
                <th className="border border-slate-300 p-2 w-16 text-center">Visit #</th>
                <th className="border border-slate-300 p-2 w-24">Date</th>
                <th className="border border-slate-300 p-2 w-24">Type</th>
                <th className="border border-slate-300 p-2">Chief Complaint / Case Notes</th>
                <th className="border border-slate-300 p-2 w-36">Prescription</th>
                <th className="border border-slate-300 p-2 w-28 text-right">Bill / Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedVisits.map((v, idx) => {
                const visitNumber = sortedVisits.length - idx;
                const rx = sortedPrescriptions.find((p) => p.visitId === v.id || p.date === v.date);
                const bill = bills.find((b) => (rx && b.prescriptionId === rx.id) || b.date === v.date);

                return (
                  <tr key={v.id} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">
                      #{visitNumber}
                    </td>
                    <td className="border border-slate-300 p-2 font-medium whitespace-nowrap">
                      {formatDate(v.date)}
                    </td>
                    <td className="border border-slate-300 p-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        v.type === "New" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {v.type || "Consultation"}
                      </span>
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-semibold text-slate-900">{v.complaint || "Routine Consultation"}</div>
                      {v.notes && <div className="text-[11px] text-slate-600 mt-0.5">{v.notes}</div>}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {rx && rx.items && rx.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {rx.items.slice(0, 3).map((item, i) => (
                            <div key={i} className="text-[11px] truncate text-slate-800">
                              &bull; {item.medicineName} <span className="font-semibold">({item.potency})</span>
                            </div>
                          ))}
                          {rx.items.length > 3 && (
                            <div className="text-[10px] text-slate-500 font-medium">
                              +{rx.items.length - 3} more medicines
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">
                      {bill ? (
                        <div>
                          <div className="font-bold text-slate-900">{inr(bill.items.reduce((s, it) => s + it.qty * it.rate, 0))}</div>
                          <span className={`inline-block text-[10px] font-semibold px-1 rounded ${
                            bill.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {bill.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ───────────────── UPCOMING FOLLOW-UP ───────────────── */}
      {pendingFollowUp && (
        <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between text-xs text-emerald-900">
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] block text-emerald-700">Next Scheduled Follow-up</span>
            <span className="font-semibold">{formatDate(pendingFollowUp.dueDate)}</span> &bull; {pendingFollowUp.reason || "Review consultation"}
          </div>
          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]">PENDING</span>
        </div>
      )}

      {/* ───────────────── FOOTER ───────────────── */}
      <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between text-xs">
        <div className="text-slate-500 text-[10px]">
          <p>Generated on {formatDate(new Date().toISOString().slice(0, 10))} from Dr. Ayus Hospital Records</p>
          <p>This medical summary is issued for clinical consultation and hospital record purposes.</p>
        </div>
        <div className="text-center w-48">
          <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
          <p className="font-bold text-slate-900 text-xs">{settings?.doctorName || HOSPITAL_INFO.doctorName}</p>
          <p className="text-[10px] text-slate-600">Authorized Medical Officer</p>
        </div>
      </div>
    </article>
  );
}
