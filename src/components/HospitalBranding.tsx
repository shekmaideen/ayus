import { cn } from "@/lib/utils";

/**
 * Official hospital constants for Dr. Ayus Homeopathy Hospital.
 * Sourced directly from the official hospital prescription letterhead.
 */
export const HOSPITAL_INFO = {
  name: "Dr. AYUS HOMOEOPATHY HOSPITAL",
  subtitle: "HOMOEOPATHY HOSPITAL",
  doctorName: "Dr. M. HARIRAM, BHMS.,",
  doctorDesignation: "General Homoeopathic Family Physician",
  regNo: "Reg No. TNHMC - 2776 - A Class",
  timings: {
    allDays: {
      days: "Monday to Sunday :",
      time: "Morning 10.00 am to 2.00 pm",
    },
    mwf: {
      days: "Monday / Wednesday / Friday :",
      time: "Evening 5.30 pm to 9.30 pm",
    },
    tts: {
      days: "Tuesday / Thursday / Saturday :",
      time: "Evening 5.30 pm to 7.30 pm",
    },
  },
  address: "No. 23, Mudichur Main Road, Mudichur, Chennai - 600048 (Near City Union Bank)",
  phone: "044 - 2276 1103 / 89398 65447 / 89395 54447",
  email: "dr.ayushomoeopathyhospital@gmail.com",
  tamilMotto: "ஒரே மருத்துவமனையில் அனைத்து நோய்களுக்கும் சிறந்த மருத்துவம் !",
  tagline: "Live Long & Stay Healthy With Us",
} as const;

/**
 * Vector reproduction of the authentic Dr. Ayus Hospital circular crest logo.
 * Features red and green medical iconography, rod of Asclepius, and homeopathic drop/leaf.
 */
export function AyusHospitalCrest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-20 w-20 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Dr. Ayus Hospital Crest"
    >
      {/* Outer Red Ring */}
      <circle cx="50" cy="50" r="46" stroke="#c5161d" strokeWidth="5.5" fill="#ffffff" />
      <circle cx="50" cy="50" r="41.5" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="3 2" fill="#ffffff" />
      <circle cx="50" cy="50" r="39" stroke="#c5161d" strokeWidth="1" fill="#ffffff" />

      {/* Decorative leaf arc left and right */}
      <path
        d="M20 50 C20 34, 30 22, 50 18 C35 25, 27 36, 26 50 Z"
        fill="#16a34a"
        opacity="0.85"
      />
      <path
        d="M80 50 C80 34, 70 22, 50 18 C65 25, 73 36, 74 50 Z"
        fill="#16a34a"
        opacity="0.85"
      />

      {/* Central Medical Shield */}
      <path
        d="M32 30 H68 C68 52, 58 68, 50 78 C42 68, 32 52, 32 30 Z"
        fill="#c5161d"
      />
      <path
        d="M35 33 H65 C65 50, 56 64, 50 72 C44 64, 35 50, 35 33 Z"
        fill="#ffffff"
      />

      {/* Central Rod of Asclepius & Homeopathic drop */}
      {/* Central Rod */}
      <line x1="50" y1="28" x2="50" y2="70" stroke="#c5161d" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="50" cy="27" r="3" fill="#c5161d" />

      {/* Entwined Serpent */}
      <path
        d="M44 36 C44 32, 56 32, 56 38 C56 44, 43 42, 43 48 C43 54, 57 52, 57 58 C57 65, 47 64, 50 70"
        stroke="#16a34a"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Medicinal Droplet */}
      <path
        d="M50 42 C48 45, 46 47, 46 49 C46 51.2, 47.8 53, 50 53 C52.2 53, 54 51.2, 54 49 C54 47, 52 45, 50 42 Z"
        fill="#c5161d"
      />

      {/* Base banner arc */}
      <path
        d="M26 73 Q50 88 74 73"
        stroke="#c5161d"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Vector reproduction of the Dr. Ayus Hospital medical green cross.
 * Styled with bold rounded medical cross and curved leaf dynamic swoosh.
 */
export function AyusMedicalCross({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-18 w-18 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Medical Cross Emblem"
    >
      {/* Green Medical Cross */}
      <path
        d="M38 16 H62 V38 H84 V62 H62 V84 H38 V62 H16 V38 H38 V16 Z"
        fill="#16a34a"
      />
      {/* Inner white highlight cross contour */}
      <path
        d="M44 24 H56 V44 H76 V56 H56 V76 H44 V56 H24 V44 H44 V24 Z"
        fill="#ffffff"
        opacity="0.15"
      />
      {/* Dynamic curved swoosh / health contour across the cross */}
      <path
        d="M12 70 C24 82, 50 88, 78 68 C88 60, 94 48, 92 36 C86 52, 68 70, 42 74 C28 76, 18 74, 12 70 Z"
        fill="#c5161d"
        opacity="0.95"
      />
    </svg>
  );
}

/**
 * Styled classic Latin ℞ (Rx) symbol with medical serif styling
 */
export function RxSymbol({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-serif font-black italic text-[#047857] select-none inline-block",
        className
      )}
      style={{
        fontFamily: "'Times New Roman', Times, Georgia, serif",
        fontSize: "36px",
        lineHeight: "1",
      }}
      aria-label="Rx"
    >
      ℞
    </span>
  );
}
