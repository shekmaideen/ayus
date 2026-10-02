import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addStaff, listStaff, removeStaff, resetStaffPassword } from "@/lib/staff.functions";
import { useClinic } from "@/store/clinic";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function StaffManager() {
  const qc = useQueryClient();
  const myId = useClinic((s) => s.userId);
  const fetchStaff = useServerFn(listStaff);
  const add = useServerFn(addStaff);
  const reset = useServerFn(resetStaffPassword);
  const remove = useServerFn(removeStaff);
  const { data: staff = [], isLoading } = useQuery({ queryKey: ["staff"], queryFn: () => fetchStaff() });
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["staff"] });

  return (
    <div className="card-soft p-5 lg:col-span-2">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Staff accounts</h3>
      <div className="divide-y">
        {isLoading && <p className="py-3 text-sm text-muted-foreground">Loading staff…</p>}
        {staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-[10rem] flex-1">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                @{s.username}
                {s.email ? ` · ${s.email}` : ""} · <span className="capitalize">{s.role}</span>
              </p>
            </div>
            {s.id !== myId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const pw = window.prompt(`New password for ${s.name} (min 8 characters)`);
                    if (!pw) return;
                    try {
                      await reset({ data: { userId: s.id, password: pw } });
                      toast.success("Password updated");
                    } catch (e) {
                      toast.error(errMsg(e));
                    }
                  }}
                >
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Set password
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${s.name}`}
                  onClick={async () => {
                    if (!window.confirm(`Remove ${s.name}'s login?`)) return;
                    try {
                      await remove({ data: { userId: s.id } });
                      toast.success("Staff account removed");
                      refresh();
                    } catch (e) {
                      toast.error(errMsg(e));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await add({ data: form });
            toast.success("Receptionist login created");
            setForm({ fullName: "", username: "", email: "", password: "" });
            refresh();
          } catch (err) {
            toast.error(errMsg(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <Input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input required type="password" minLength={8} placeholder="Password (8+)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" className="rounded-xl" disabled={busy}>
          <UserPlus className="mr-2 h-4 w-4" /> Add receptionist
        </Button>
      </form>
    </div>
  );
}
