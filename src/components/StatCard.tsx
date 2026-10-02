import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  format,
  trend,
  tone = "primary",
  index = 0,
  to,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  format?: (n: number) => string;
  trend?: number;
  tone?: "primary" | "gold" | "success" | "warning" | "danger" | "info";
  index?: number;
  to?: string;
}) {
  const animated = useCountUp(value);
  const shown = format ? format(animated) : Math.round(animated).toLocaleString("en-IN");
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary-soft-foreground",
    gold: "bg-gold-soft text-gold-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    danger: "bg-danger-soft text-destructive",
    info: "bg-info-soft text-info",
  };

  const Content = (
    <>
      <div className="flex items-start justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        {trend !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              trend >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-destructive",
            )}
          >
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-3xl tabular-nums text-foreground">{shown}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </>
  );

  const MotionComponent = motion(to ? Link : "div");

  return (
    <MotionComponent
      // @ts-expect-error framer-motion doesn't perfectly type tanstack Link
      to={to}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className={cn("card-soft card-lift p-5 block", to && "hover:bg-secondary/20")}
    >
      {Content}
    </MotionComponent>
  );
}
