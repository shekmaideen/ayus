import { format, parseISO } from "date-fns";

const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function inr(amount: number): string {
  return "₹" + inrFormatter.format(Math.round(amount));
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return iso;
  }
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

const istDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const istDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  weekday: "long",
});

const istTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

// Cache formatted strings since thousands of imported medicines share identical timestamps
const stockDateTimeCache = new Map<string, { date: string; day: string; time: string }>();

/**
 * Formats a timestamp into Indian Standard Time (Asia/Kolkata) components:
 * - date: DD/MM/YYYY (e.g. 02/10/2026)
 * - day: Full weekday (e.g. Friday)
 * - time: 12-hour AM/PM (e.g. 07:35 PM)
 */
export function formatStockEntryDateTime(timestamp?: string | Date | null): {
  date: string;
  day: string;
  time: string;
} {
  if (!timestamp) {
    return { date: "—", day: "—", time: "—" };
  }

  const cacheKey = typeof timestamp === "string" ? timestamp : timestamp instanceof Date ? timestamp.toISOString() : "";
  if (cacheKey && stockDateTimeCache.has(cacheKey)) {
    return stockDateTimeCache.get(cacheKey)!;
  }

  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else {
    const s = String(timestamp).trim();
    if (!s) return { date: "—", day: "—", time: "—" };

    // Standardize "YYYY-MM-DD HH:mm:ss" to ISO
    const cleaned = s.includes("T") ? s : s.replace(" ", "T");
    const withTz = cleaned.endsWith("Z") || /[+-]\d{2}(:?\d{2})?$/.test(cleaned)
      ? cleaned
      : cleaned + "Z";
    d = new Date(withTz);
  }

  if (isNaN(d.getTime())) {
    return { date: "—", day: "—", time: "—" };
  }

  const result = {
    date: istDateFormatter.format(d),
    day: istDayFormatter.format(d),
    time: istTimeFormatter.format(d).toUpperCase(),
  };

  if (cacheKey) {
    if (stockDateTimeCache.size > 2000) stockDateTimeCache.clear();
    stockDateTimeCache.set(cacheKey, result);
  }

  return result;
}

const istComplaintFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/**
 * Formats a timestamp into human-readable IST: "03 Oct 2026 • 11:15 AM"
 */
export function formatComplaintDateTime(timestamp?: string | Date | null): string {
  if (!timestamp) return "—";
  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else {
    const s = String(timestamp).trim();
    if (!s) return "—";
    const cleaned = s.includes("T") ? s : s.replace(" ", "T");
    const withTz = cleaned.endsWith("Z") || /[+-]\d{2}(:?\d{2})?$/.test(cleaned)
      ? cleaned
      : cleaned + "Z";
    d = new Date(withTz);
  }
  if (isNaN(d.getTime())) {
    d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
  }

  try {
    const parts = istComplaintFormatter.formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    const hour = parts.find((p) => p.type === "hour")?.value ?? "";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "";
    const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toUpperCase();
    return `${day} ${month} ${year} • ${hour}:${minute} ${dayPeriod}`;
  } catch {
    return String(timestamp);
  }
}

/**
 * Returns the current date (YYYY-MM-DD) and time (HH:mm) in Indian Standard Time (IST).
 */
export function getNowIST(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

/**
 * Parses a timestamp into IST date (YYYY-MM-DD) and time (HH:mm) strings.
 */
export function parseISTDateTime(timestamp?: string | Date | null): { date: string; time: string } {
  if (!timestamp) return getNowIST();
  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else {
    const s = String(timestamp).trim();
    if (!s) return getNowIST();
    const cleaned = s.includes("T") ? s : s.replace(" ", "T");
    const withTz = cleaned.endsWith("Z") || /[+-]\d{2}(:?\d{2})?$/.test(cleaned)
      ? cleaned
      : cleaned + "Z";
    d = new Date(withTz);
  }
  if (isNaN(d.getTime())) return getNowIST();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

/**
 * Converts an IST date (YYYY-MM-DD) and time (HH:mm) into a UTC SQL DATETIME string (YYYY-MM-DD HH:MM:SS).
 */
export function istToUtcString(dateStr: string, timeStr: string): string {
  const safeTime = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : "00:00:00";
  const d = new Date(`${dateStr}T${safeTime}+05:30`);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  return d.toISOString().slice(0, 19).replace("T", " ");
}


