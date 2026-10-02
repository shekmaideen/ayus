import { createFileRoute, Link } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { Ban, CalendarClock, CheckCircle2, MessageCircle, Phone, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can, useClinic } from "@/store/clinic";
import { formatDate, initials, todayISO } from "@/lib/format";

export const Route = createFileRoute("/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — HomeoCare Clinic Manager" },
      { name: "description", content: "Track patient follow-ups due today, this week, overdue and completed." },
      { property: "og:title", content: "Follow-ups — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Track patient follow-ups due today, this week, overdue and completed." },
    ],
  }),
  component: () => (
    <AppShell>
      <FollowUps />
    </AppShell>
  ),
});

function FollowUps() {
  const { followUps, patients, visits, role, setFollowUpStatus } = useClinic();
  const editable = can(role, "followUp") === "full";
  const [tab, setTab] = useState("today");
  const today = todayISO();
  const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const filtered = followUps.filter((f) => {
    if (tab === "today") return f.status === "Pending" && f.dueDate === today;
    if (tab === "week") return f.status === "Pending" && f.dueDate > today && f.dueDate <= weekEnd;
    if (tab === "overdue") return f.status === "Missed" || (f.status === "Pending" && f.dueDate < today);
    return f.status === "Completed" || f.status === "Cancelled";
  });

  const nameOf = (id: string) => patients.find((p) => p.id === id);

  return (
    <>
      <PageTitle
        title="Follow-up management"
        subtitle={`${followUps.filter((f) => f.status === "Pending").length} follow-ups still open`}
        action={!editable ? <Badge variant="outline">View only</Badge> : undefined}
      />

      <div className="card-soft p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex h-auto flex-wrap rounded-xl">
            <TabsTrigger value="today" className="rounded-lg">Today</TabsTrigger>
            <TabsTrigger value="week" className="rounded-lg">This Week</TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-lg">Overdue / Missed</TabsTrigger>
            <TabsTrigger value="done" className="rounded-lg">Completed / Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">Nothing in this list right now.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {filtered.map((f) => {
              const p = nameOf(f.patientId);
              const lastVisit = visits
                .filter((v) => v.patientId === f.patientId)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
              return (
                <div key={f.id} className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary-soft text-xs text-primary-soft-foreground">
                      {initials(p?.name ?? "P")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-[10rem] flex-1">
                    <Link to="/patients/$id" params={{ id: f.patientId }} className="font-medium hover:underline">
                      {p?.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {f.reason} · last visit {lastVisit ? formatDate(lastVisit.date) : "—"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      f.status === "Completed"
                        ? "bg-success-soft text-success"
                        : f.status === "Cancelled"
                          ? "bg-secondary text-muted-foreground"
                          : f.status === "Missed"
                            ? "bg-danger-soft text-destructive"
                            : "bg-warning-soft text-warning-foreground"
                    }
                  >
                    {f.status === "Pending" ? `Due ${formatDate(f.dueDate)}` : f.status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label="Call patient" title={p?.phone}>
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Message on WhatsApp">
                      <MessageCircle className="h-4 w-4 text-success" />
                    </Button>
                  </div>
                  {editable && f.status === "Pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFollowUpStatus(f.id, "Completed");
                          toast.success("Follow-up completed");
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4 text-success" /> Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFollowUpStatus(f.id, "Missed");
                          toast("Marked as missed");
                        }}
                      >
                        <XCircle className="mr-1.5 h-4 w-4 text-destructive" /> Missed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFollowUpStatus(f.id, "Cancelled");
                          toast("Follow-up cancelled");
                        }}
                      >
                        <Ban className="mr-1.5 h-4 w-4 text-muted-foreground" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
