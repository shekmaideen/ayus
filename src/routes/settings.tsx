import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload,
  Download,
  RotateCcw,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
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
import { exportBackup, importBackup, importPatientsCSV } from "@/lib/backup.functions";
import { listAuditLogs } from "@/lib/clinic.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Alhuda Homeo Hospital" },
      { name: "description", content: "Clinic fees, stock threshold, staff accounts and clinic profile." },
      { property: "og:title", content: "Settings — Alhuda Homeo Hospital" },
      { property: "og:description", content: "Clinic fees, stock threshold, staff accounts and clinic profile." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

// ─── CSV parser helpers ────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = splitCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim().replace(/^"|"$/g, ""); });
    return obj;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function normaliseRow(raw: Record<string, string>): Record<string, string> {
  // Accept common column name variants
  const alias: Record<string, string> = {
    "patient name": "name", fullname: "name", "full name": "name",
    "date of birth": "age", dob: "age",
    sex: "gender",
    mobile: "phone", "mobile no": "phone", "phone no": "phone", "contact": "phone",
    "e-mail": "email", "email id": "email",
    "blood type": "bloodgroup", "blood grp": "bloodgroup",
    "allergy": "allergies",
    "occupation/profession": "occupation",
    "reg date": "registeredon", "registration date": "registeredon", "registered on": "registeredon",
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = alias[k.toLowerCase()] ?? k.toLowerCase().replace(/\s+/g, "");
    out[key] = v;
  }
  return out;
}

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

        {/* ── Patient CSV Import ────────────────────────────────── */}
        <PatientImportPanel onImported={() => void loadAll()} />

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
      a.download = `alhuda-backup-${date}.json`;
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

// ─── Patient CSV Import Panel ─────────────────────────────────────
type ImportRow = Record<string, string>;
type ImportResult = { inserted: number; errors: { row: number; error: string }[] };

function PatientImportPanel({ onImported }: { onImported: () => void }) {
  const doImport = useServerFn(importPatientsCSV);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const parsed = parseCSV(text).map(normaliseRow);
      setRows(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!rows.length) { toast.error("Load a CSV file first."); return; }
    setLoading(true);
    try {
      const res = await doImport({ data: { rows } });
      setResult(res);
      if (res.inserted > 0) {
        toast.success(`Imported ${res.inserted} patient${res.inserted !== 1 ? "s" : ""}!`);
        onImported();
      }
      if (res.errors.length > 0) {
        toast.warning(`${res.errors.length} row(s) had errors and were skipped.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "name,age,gender,phone,email,address,bloodGroup,allergies,occupation\n" +
                "Mohammed Arif,45,Male,9876543210,arif@email.com,123 Main St,A+,,Teacher\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-soft p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft">
          <FileSpreadsheet className="h-4 w-4 text-success" />
        </span>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Patient Import (CSV)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Bulk-import patients from an Excel or CSV file</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Step 1: Download template */}
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Step 1 — Download the template</p>
          <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={downloadTemplate} id="btn-download-csv-template">
            <Download className="h-4 w-4" /> CSV Template
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Fill in patient data. Required columns: <code className="bg-muted rounded px-1">name</code>. Others are optional.</p>
        </div>

        {/* Step 2: Upload CSV */}
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Step 2 — Upload your filled CSV</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary">
            <Upload className="h-4 w-4" /> Choose CSV file
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </label>
          {fileName && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{fileName}</Badge>
              <span className="text-xs text-muted-foreground">{rows.length} rows detected</span>
            </div>
          )}
        </div>

        {/* Step 3: Import */}
        {rows.length > 0 && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Step 3 — Import</p>
            <div className="mb-3 max-h-40 overflow-y-auto rounded border text-xs">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {["name","age","gender","phone","email"].map(h => (
                      <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t">
                      {["name","age","gender","phone","email"].map(h => (
                        <td key={h} className="px-2 py-1 truncate max-w-[100px]">{r[h] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && <p className="px-2 py-1 text-muted-foreground">…and {rows.length - 5} more rows</p>}
            </div>
            <Button
              onClick={handleImport}
              disabled={loading}
              className="gap-2 rounded-xl"
              id="btn-run-csv-import"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {loading ? "Importing…" : `Import ${rows.length} Patients`}
            </Button>
          </div>
        )}

        {/* Result summary */}
        {result && (
          <div className="space-y-1.5">
            {result.inserted > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {result.inserted} patient{result.inserted !== 1 ? "s" : ""} imported successfully
              </div>
            )}
            {result.errors.map((e) => (
              <div key={e.row} className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-destructive">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                Row {e.row}: {e.error}
              </div>
            ))}
          </div>
        )}
      </div>
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

