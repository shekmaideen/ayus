import { cn } from "@/lib/utils";

export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="currentColor" opacity="0.12" />
      <path
        d="M34 12c0 12-6.5 20-16 22 0-12 6-19 16-22Z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M14 34c4-9 9.5-14.5 17-18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <path d="M13 36c-1.5-6 0-11 3-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

import { useClinic } from "@/store/clinic";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { settings } = useClinic();
  
  // Read from localStorage synchronously (safe in Vite client-side app)
  // to avoid the 1-frame flicker of the default name on reload.
  let activeSettings = settings;
  if (settings.clinicName === "Dr. Ayus Homoeopathy Hospital") {
    try {
      const stored = localStorage.getItem("clinic-store");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.settings) {
          activeSettings = parsed.state.settings;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {activeSettings.logoDataUrl ? (
        <img src={activeSettings.logoDataUrl} alt="Clinic Logo" className="h-9 w-9 rounded-md object-cover" />
      ) : (
        <LeafMark className="h-9 w-9 text-primary" />
      )}
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-lg text-foreground line-clamp-1">{activeSettings.clinicName || "Dr. Ayus Homoeopathy Hospital"}</span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Clinic Manager
          </span>
        </span>
      )}
    </span>
  );
}
