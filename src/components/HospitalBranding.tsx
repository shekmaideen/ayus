import { cn } from "@/lib/utils";
import { AYUS_MEDICAL_CROSS_DATA_URL } from "./medicalCrossAsset";

/**
 * Official hospital constants for Dr. Ayus Homoeopathy Hospital.
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
      days: "Monday to Sunday",
      time: "Morning 10.00 am to 2.00 pm",
    },
    mwf: {
      days: "Monday / Wednesday / Friday",
      time: "Evening 5.30 pm to 9.30 pm",
    },
    tts: {
      days: "Tuesday / Thursday / Saturday",
      time: "Evening 5.30 pm to 7.30 pm",
    },
  },
  sidebarTimings: {
    morning: "Morning : 9.00 am to 2.00 pm",
    evening: "Evening : 5.00 pm to 9.30 pm",
  },
  homeCareServices: [
    "Homoeopathy to Home",
    "100% No Side Effects",
    "100% No Diet Restriction",
    "100% No Need Surgery",
  ],
  address: "No.23, Mudichur Main Road, Mudichur, Chennai - 600048. (Near City Union Bank)",
  addressLines: [
    "No.23, Mudichur Main Road,",
    "Mudichur, Chennai - 600048.",
    "(Near City Union Bank)",
  ],
  appointmentLines: [
    "For Appointment Call :",
    "044 - 2276 1103 / 89398 65447 / 89395 54447",
    "Email ID : dr.ayushomoeopathyhospital@gmail.com",
  ],
  phone: "044 - 2276 1103 / 89398 65447 / 89395 54447",
  email: "dr.ayushomoeopathyhospital@gmail.com",
  tamilMotto: "ஒரே மருத்துவமனையில் அனைத்து நோய்களுக்கும் சிறந்த மருத்துவம் !",
  tagline: "Live Long & Stay Healthy With Us",
} as const;

/**
 * All 12 Clinical Specialities as featured on the authentic Dr. Ayus Hospital prescription pad.
 */
export interface SpecialityCategory {
  category: string;
  items: { text: string; fullWidth?: boolean }[];
}

export const AYUS_SPECIALITIES: SpecialityCategory[] = [
  {
    category: "EYE",
    items: [
      { text: "Chalazion / Styes", fullWidth: true },
      { text: "Conjunctivitis", fullWidth: true },
    ],
  },
  {
    category: "ENT",
    items: [
      { text: "Sinusitis" },
      { text: "Tonsillitis" },
      { text: "Nasal Poly", fullWidth: true },
    ],
  },
  {
    category: "GASTROENTEROLOGY",
    items: [
      { text: "Gastric Ulcer" },
      { text: "Acidity" },
      { text: "Liver Diseases" },
      { text: "Gall Stone" },
      { text: "Piles" },
      { text: "Constipation" },
    ],
  },
  {
    category: "NEUROLOGY / PHLEBOLOGY",
    items: [
      { text: "Migraine" },
      { text: "Headache" },
      { text: "Insomnia" },
      { text: "Varicose Vein" },
    ],
  },
  {
    category: "GYNAECOLOGY",
    items: [
      { text: "Women Menses Problem", fullWidth: true },
      { text: "PCOD / Ovarian Cyst", fullWidth: true },
      { text: "Fibroid Uterus" },
      { text: "Leucorrhoea" },
    ],
  },
  {
    category: "DERMATOLOGY",
    items: [
      { text: "Corns / Warts" },
      { text: "Psoriasis" },
      { text: "Allergy" },
      { text: "Hair Fall" },
      { text: "Dandruff" },
      { text: "Crack Heel" },
    ],
  },
  {
    category: "ENDOCRINOLOGY",
    items: [
      { text: "Diabetes" },
      { text: "Obesity" },
      { text: "Thyroid Problem", fullWidth: true },
    ],
  },
  {
    category: "PULMONOLOGY",
    items: [
      { text: "Asthma" },
      { text: "Wheezing" },
      { text: "Bronchitis" },
      { text: "COPD" },
      { text: "Cold / Cough", fullWidth: true },
    ],
  },
  {
    category: "ORTHOPEDIC",
    items: [
      { text: "Knee Joint Pain" },
      { text: "Hip Joint" },
      { text: "Hand / Neck Pain" },
      { text: "Arthritis / Gout" },
    ],
  },
  {
    category: "UROLOGY",
    items: [
      { text: "Kidney Stones" },
      { text: "UTI / Cystitis" },
    ],
  },
  {
    category: "ANDROLOGY",
    items: [
      { text: "Prostatitis" },
      { text: "Hydrocele" },
      { text: "Sex Problem", fullWidth: true },
    ],
  },
  {
    category: "CARDIOLOGY",
    items: [
      { text: "Blood Pressure" },
      { text: "Cholesterol" },
      { text: "Heart Diseases", fullWidth: true },
    ],
  },
];

/**
 * Authentic vector reproduction of the Dr. Ayus Hospital circular crest logo.
 * Features red and green medical iconography, rod of Asclepius, and shield.
 */
export function AyusHospitalCrest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-16 w-16 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Dr. Ayus Hospital Crest"
    >
      {/* Outer Red Ring */}
      <circle cx="50" cy="50" r="47" stroke="#c5161d" strokeWidth="5.5" fill="#ffffff" />
      <circle cx="50" cy="50" r="41" stroke="#009e49" strokeWidth="1.5" strokeDasharray="3 2" fill="#ffffff" />

      {/* Decorative leaf arcs left and right */}
      <path
        d="M18 50 C18 32, 30 20, 50 16 C34 23, 25 35, 24 50 Z"
        fill="#009e49"
        opacity="0.9"
      />
      <path
        d="M82 50 C82 32, 70 20, 50 16 C66 23, 75 35, 76 50 Z"
        fill="#009e49"
        opacity="0.9"
      />

      {/* Central Red Shield */}
      <path
        d="M32 28 H68 C68 52, 58 68, 50 78 C42 68, 32 52, 32 28 Z"
        fill="#c5161d"
      />
      <path
        d="M35 31 H65 C65 50, 56 64, 50 73 C44 64, 35 50, 35 31 Z"
        fill="#ffffff"
      />

      {/* Central Rod of Asclepius */}
      <line x1="50" y1="26" x2="50" y2="70" stroke="#c5161d" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="50" cy="25" r="3" fill="#c5161d" />

      {/* Entwined Serpent */}
      <path
        d="M44 34 C44 30, 56 30, 56 36 C56 42, 43 40, 43 46 C43 52, 57 50, 57 56 C57 63, 47 62, 50 68"
        stroke="#009e49"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Medicinal Droplet */}
      <path
        d="M50 40 C48 43, 46 45, 46 47 C46 49.2, 47.8 51, 50 51 C52.2 51, 54 49.2, 54 47 C54 45, 52 43, 50 40 Z"
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
 * Authentic Dr. Ayus Hospital medical green cross logo.
 * Green plus cross with dynamic leaping human figure and red quadrant.
 */
export function AyusMedicalCross({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={AYUS_MEDICAL_CROSS_DATA_URL}
      alt="Dr. Ayus Medical Cross Logo"
      className={cn("h-16 w-16 shrink-0 object-contain", className)}
      style={{ display: "inline-block", ...style }}
      loading="eager"
      decoding="sync"
    />
  );
}




/**
 * Styled classic Latin ℞ (Rx) symbol with medical serif styling
 */
export function RxSymbol({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-serif font-bold italic select-none inline-block leading-none",
        className
      )}
      style={{
        fontFamily: "'Times New Roman', Georgia, serif",
        fontSize: "36px",
        color: "#008000",
      }}
      aria-label="Rx"
    >
      ℞
    </span>
  );
}

