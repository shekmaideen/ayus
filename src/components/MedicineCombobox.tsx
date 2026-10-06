import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/data/types";

export interface MedicineComboboxProps {
  value: string;
  onChange: (m: Medicine) => void;
  medicines: Medicine[];
  placeholder?: string;
  className?: string;
}

export function MedicineCombobox({
  value,
  onChange,
  medicines,
  placeholder = "Click to search 9,500+ medicines...",
  className,
}: MedicineComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedMed = useMemo(() => medicines.find((m) => m.id === value), [medicines, value]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) {
      return medicines.slice(0, 30);
    }
    const results: Medicine[] = [];
    for (const m of medicines) {
      if (!m) continue;
      if (
        m.name.toLowerCase().includes(t) ||
        m.potency.toLowerCase().includes(t) ||
        m.formType.toLowerCase().includes(t)
      ) {
        results.push(m);
        if (results.length >= 35) break;
      }
    }
    return results;
  }, [medicines, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm hover:bg-muted/40 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
        >
          {selectedMed ? (
            <span className="truncate">
              <strong className="font-semibold text-foreground">{selectedMed.name}</strong>
              {selectedMed.potency && selectedMed.potency !== "-" && (
                <span className="ml-1.5 font-mono text-primary font-medium">({selectedMed.potency})</span>
              )}
              <span className="ml-1.5 text-muted-foreground">· {selectedMed.formType} · {selectedMed.stock} in stock · ₹{selectedMed.price}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,480px)] p-2 shadow-xl" align="start">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type medicine name (e.g. Arnica, 30CH)..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1 text-xs divide-y divide-border/40">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No matching medicines found for "{search}"
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left rounded-md transition-colors hover:bg-primary-soft hover:text-primary-soft-foreground",
                  m.id === value && "bg-secondary font-medium"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground truncate">{m.name}</span>
                    {m.potency && m.potency !== "-" && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono border-primary/30 text-primary">
                        {m.potency}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">{m.formType}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono text-[11px]">
                  <span className={m.stock === 0 ? "text-destructive" : m.stock < 10 ? "text-warning-foreground" : "text-muted-foreground"}>
                    {m.stock} in stock
                  </span>
                  <span className="ml-2 font-medium text-foreground">₹{m.price}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
