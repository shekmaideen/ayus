import { format, parseISO } from "date-fns";

export function inr(amount: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(amount));
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
  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else {
    const cleaned = timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T");
    d = new Date(cleaned);
  }

  if (isNaN(d.getTime())) {
    return { date: "—", day: "—", time: "—" };
  }

  const dateStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(d);

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  return { date: dateStr, day: dayStr, time: timeStr };
}

