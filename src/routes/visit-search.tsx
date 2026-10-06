import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, FileSearch } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useClinic } from "@/store/clinic";
import { formatDate, initials } from "@/lib/format";

export const Route = createFileRoute("/visit-search")({
  head: () => ({
    meta: [
      { title: "Visit Notes Search — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Search across all patient visit complaints and notes." },
    ],
  }),
  component: () => (
    <AppShell>
      <VisitSearch />
    </AppShell>
  ),
});

function VisitSearch() {
  const { visits, patients } = useClinic();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return visits
      .filter(
        (v) =>
          v.complaint.toLowerCase().includes(t) ||
          v.notes.toLowerCase().includes(t),
      )
      .map((v) => ({
        visit: v,
        patient: patients.find((p) => p.id === v.patientId),
      }))
      .sort((a, b) => b.visit.date.localeCompare(a.visit.date));
  }, [visits, patients, q]);

  return (
    <>
      <PageTitle
        title="Visit Notes Search"
        subtitle="Search across all visit complaints and notes to find patients by symptom"
      />

      <div className="card-soft p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a symptom, medicine name or any keyword… (min. 2 chars)"
            className="rounded-xl pl-9 py-3 text-base"
          />
        </div>

        {q.trim().length >= 2 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} found across all visit records
          </p>
        )}

        {q.trim().length < 2 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FileSearch className="h-12 w-12 text-muted-foreground" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">
              Start typing to search across all patient visit notes and complaints.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FileSearch className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">No visits found matching &ldquo;{q}&rdquo;.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {results.map(({ visit: v, patient: p }) => {
              const t = q.trim().toLowerCase();
              const highlightText = (text: string) => {
                const idx = text.toLowerCase().indexOf(t);
                if (idx === -1) return <span>{text}</span>;
                return (
                  <span>
                    {text.slice(0, idx)}
                    <mark className="rounded bg-warning/30 px-0.5 text-foreground">{text.slice(idx, idx + t.length)}</mark>
                    {text.slice(idx + t.length)}
                  </span>
                );
              };
              return (
                <Link
                  key={v.id}
                  to="/patients/$id"
                  params={{ id: v.patientId }}
                  className="flex flex-wrap items-start gap-4 rounded-xl border p-4 transition-colors hover:bg-secondary/50"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary-soft text-xs text-primary-soft-foreground">
                      {initials(p?.name ?? "P")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p?.name ?? "Unknown"}</span>
                      <Badge variant="outline" className="font-mono text-xs">{p?.regNo}</Badge>
                      <Badge
                        variant="outline"
                        className={
                          v.type === "New"
                            ? "border-primary/30 bg-primary-soft text-primary text-xs"
                            : "border-success/30 bg-success-soft text-success text-xs"
                        }
                      >
                        {v.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(v.date)}</span>
                    </div>
                    {v.complaint && (
                      <p className="mt-1 text-sm text-foreground">
                        <span className="text-muted-foreground">Complaint: </span>
                        {highlightText(v.complaint)}
                      </p>
                    )}
                    {v.notes && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        <span>Notes: </span>
                        {highlightText(v.notes)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
