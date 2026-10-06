import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload,
  Download,
  RotateCcw,
  Database,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { LeafMark } from "@/components/Logo";
import { StaffManager } from "@/components/StaffManager";
import { can, useClinic } from "@/store/clinic";
import { exportBackup, importBackup } from "@/lib/backup.functions";
import { listAuditLogs } from "@/lib/clinic.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Clinic fees, stock threshold, staff accounts and clinic profile for Dr. Ayus Homoeopathy Hospital." },
      { property: "og:title", content: "Settings — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Clinic fees, stock threshold, staff accounts and clinic profile for Dr. Ayus Homoeopathy Hospital." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});



// ─── Main Settings Page ───────────────────────────────────────────
function SettingsPage() {
  const { settings, role, updateSettings, loadAll } = useClinic();

  if (can(role, "settings") !== "full") {
    return (
      <div className="card-soft p-12 text-center">
        <h2 className="font-display text-2xl">Doctor access only</h2>
        <p className="mt-2 text-sm text-muted-foreground">Settings are hidden for the receptionist role.</p>
        <Button asChild variant="outline" className="mt-5 rounded-xl">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageTitle title="Settings" subtitle="Fees, stock rules, staff and clinic profile" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Fees & Stock ───────────────────────────────────────── */}
        <div className="card-soft p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fees & stock</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["consultationFee", "Consultation fee (₹)"],
              ["followUpFee", "Follow-up fee (₹)"],
              ["registrationFee", "New registration fee (₹)"],
              ["lowStockThreshold", "Low stock threshold"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  value={settings[key]}
                  onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Changes apply immediately to new bills and stock alerts.</p>
        </div>

        {/* ── Clinic Profile ─────────────────────────────────────── */}
        <div className="card-soft p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Clinic profile</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {settings.logoDataUrl ? (
                <img src={settings.logoDataUrl} alt="Clinic logo" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <LeafMark className="h-14 w-14 text-primary" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-secondary">
                <Upload className="h-4 w-4" /> Upload logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      updateSettings({ logoDataUrl: String(reader.result) });
                      toast.success("Logo updated — printed layouts refreshed");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {settings.logoDataUrl && (
                <Button variant="ghost" size="sm" onClick={() => updateSettings({ logoDataUrl: null })}>
                  Remove
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic">Clinic name</Label>
              <Input id="clinic" value={settings.clinicName} onChange={(e) => updateSettings({ clinicName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor">Doctor name</Label>
              <Input id="doctor" value={settings.doctorName} onChange={(e) => updateSettings({ doctorName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr">Address</Label>
              <Textarea id="addr" rows={2} value={settings.address} onChange={(e) => updateSettings({ address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph">Phone</Label>
              <Input id="ph" value={settings.phone} onChange={(e) => updateSettings({ phone: e.target.value })} />
            </div>
          </div>
        </div>

        {/* ── Staff Manager ─────────────────────────────────────── */}
        <StaffManager />

        {/* ── Database Backup & Restore ─────────────────────────── */}
        <BackupRestorePanel onRestored={() => void loadAll()} />

        {/* ── Clinical & System Audit Trail ─────────────────────── */}
        <AuditLogsPanel />
      </div>
    </>
  );
}

// ─── Backup / Restore Panel ───────────────────────────────────────
function BackupRestorePanel({ onRestored }: { onRestored: () => void }) {
  const doExport = useServerFn(exportBackup);
  const doImport = useServerFn(importBackup);
  const [loading, setLoading] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreJson, setRestoreJson] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await doExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ayus-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully!");
    } catch {
      toast.error("Backup failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreJson.trim()) { toast.error("Paste the backup JSON first."); return; }
    let parsed: unknown;
    try {
      parsed = JSON.parse(restoreJson);
    } catch {
      toast.error("Invalid JSON — make sure you pasted the complete backup file.");
      return;
    }
    setLoading(true);
    try {
      const result = await doImport({ data: { backup: parsed as any } });
      toast.success(`Restore complete! Imported ${result.counts.patients} patients, ${result.counts.visits} visits.`);
      setRestoreOpen(false);
      setRestoreJson("");
      onRestored();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRestoreJson(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="card-soft p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">
          <Database className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Database Backup & Restore</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Download a full backup or restore from a previous one</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleExport}
          disabled={loading}
          className="gap-2 rounded-xl"
          id="btn-download-backup"
        >
          <Download className="h-4 w-4" />
          {loading ? "Preparing…" : "Download Backup"}
        </Button>

        <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl" id="btn-restore-backup">
              <RotateCcw className="h-4 w-4" />
              Restore from Backup
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Restore from Backup
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ This will <strong>permanently delete all current data</strong> and replace it with the backup. This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-lg"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> Load backup file
                </Button>
                <input type="file" accept=".json" className="hidden" ref={fileRef} onChange={handleFileSelect} />
                <span className="text-xs text-muted-foreground">or paste JSON below</span>
              </div>
              <Textarea
                placeholder='Paste backup JSON here or load a .json file above…'
                rows={8}
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setRestoreOpen(false); setRestoreJson(""); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleRestore} disabled={loading || !restoreJson.trim()}>
                {loading ? "Restoring…" : "Yes, Restore Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Backup includes patients, visits, prescriptions, medicines, bills, and follow-ups.
      </p>
    </div>
  );
}



// ─── Audit Logs Panel ─────────────────────────────────────────────
function AuditLogsPanel() {
  const getLogs = useServerFn(listAuditLogs);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
      setLoadedOnce(true);
    } catch {
      toast.error("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-soft p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Clinical & System Audit Trail
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Immutable log of clinical actions, financial updates, prescriptions, and system backups.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl shrink-0"
          onClick={fetchLogs}
          disabled={loading}
          id="btn-view-audit-logs"
        >
          <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loadedOnce ? "Refresh Logs" : "View Audit Logs"}
        </Button>
      </div>

      {loadedOnce ? (
        logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No audit records logged yet.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-xl border text-xs">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Timestamp</th>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">Entity</th>
                  <th className="px-3 py-2 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{log.createdAt}</td>
                    <td className="px-3 py-2 font-medium">{log.userName || "System"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 capitalize">{log.entityType}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={log.details ?? ""}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
          Click <strong>View Audit Logs</strong> to inspect recent clinical, billing, and administrative events.
        </div>
      )}
    </div>
  );
}

