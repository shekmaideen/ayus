import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface UseIdleTimeoutOptions {
  /** Total idle time before automatic logout (in ms). Default: 15 minutes (900,000 ms). */
  timeoutMs?: number;
  /** Warning duration shown before automatic logout (in ms). Default: 60 seconds (60,000 ms). */
  warningMs?: number;
  /** Whether the idle timer is actively monitoring. Default: true. */
  enabled?: boolean;
  /** Callback fired when timeout occurs. */
  onTimeout: () => void;
}

const TOAST_ID = "session-idle-warning-toast";

/**
 * useIdleTimeout
 * Monitors user interaction and triggers a warning toast 60s before auto-logging out
 * after 15 minutes of inactivity. Resets automatically on user activity.
 */
export function useIdleTimeout({
  timeoutMs = 15 * 60 * 1000, // 15 minutes
  warningMs = 60 * 1000,      // 60 seconds warning
  enabled = true,
  onTimeout,
}: UseIdleTimeoutOptions) {
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWarningShowingRef = useRef<boolean>(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
  }, []);

  const dismissWarning = useCallback(() => {
    if (isWarningShowingRef.current) {
      toast.dismiss(TOAST_ID);
      isWarningShowingRef.current = false;
    }
  }, []);

  const triggerLogout = useCallback(() => {
    clearTimers();
    dismissWarning();
    onTimeoutRef.current();
  }, [clearTimers, dismissWarning]);

  const scheduleTimers = useCallback(() => {
    clearTimers();

    const warningDelay = Math.max(0, timeoutMs - warningMs);

    // Schedule warning
    warningTimerRef.current = setTimeout(() => {
      isWarningShowingRef.current = true;
      toast.warning("Inactivity Warning", {
        id: TOAST_ID,
        description: "You've been idle for 14 minutes. For security, you will be logged out in 60 seconds.",
        duration: warningMs,
        action: {
          label: "Stay logged in",
          onClick: () => {
            resetTimer();
            toast.success("Session renewed.");
          },
        },
      });

      // Schedule final logout
      logoutTimerRef.current = setTimeout(() => {
        triggerLogout();
      }, warningMs);
    }, warningDelay);
  }, [timeoutMs, warningMs, clearTimers, triggerLogout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    dismissWarning();
    scheduleTimers();
  }, [dismissWarning, scheduleTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      dismissWarning();
      return;
    }

    lastActivityRef.current = Date.now();
    scheduleTimers();

    // Throttled activity handler so high-frequency events (like mousemove) don't thrash timers
    let lastThrottled = 0;
    const handleActivity = () => {
      const now = Date.now();
      // If warning is currently showing, any user action should immediately dismiss and reset
      if (isWarningShowingRef.current) {
        resetTimer();
        return;
      }
      // Otherwise throttle to once every 2.5 seconds
      if (now - lastThrottled > 2500) {
        lastThrottled = now;
        lastActivityRef.current = now;
        scheduleTimers();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const idleDuration = Date.now() - lastActivityRef.current;
        if (idleDuration >= timeoutMs) {
          triggerLogout();
        } else if (idleDuration >= timeoutMs - warningMs) {
          // Tab became visible while in warning window
          resetTimer();
        } else {
          scheduleTimers();
        }
      }
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "wheel",
      "pointerdown",
    ];

    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimers();
      dismissWarning();
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, scheduleTimers, clearTimers, dismissWarning, resetTimer, timeoutMs, warningMs, triggerLogout]);

  return { resetTimer };
}
