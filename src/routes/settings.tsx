import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeafMark } from "@/components/Logo";
import { StaffManager } from "@/components/StaffManager";
import { can, useClinic } from "@/store/clinic";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HomeoCare Clinic Manager" },
      { name: "description", content: "Clinic fees, stock threshold, staff accounts and clinic profile." },
      { property: "og:title", content: "Settings — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Clinic fees, stock threshold, staff accounts and clinic profile." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

function SettingsPage() {
  const { settings, role, updateSettings } = useClinic();

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

        <StaffManager />
        <BackupManager />
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { Database, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { createDatabaseBackup, listDatabaseBackups, restoreDatabaseBackup } from "@/lib/backup.functions";

function BackupManager() {
  const [backups, setBackups] = useState<Awaited<ReturnType<typeof listDatabaseBackups>>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const list = await listDatabaseBackups();
      setBackups(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Could not load backups: " + msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await createDatabaseBackup();
      toast.success(`Backup created: ${res.filename} (${res.sizeFormatted})`);
      await fetchBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`WARNING: Restoring '${filename}' will overwrite current database records. Continue?`)) {
      return;
    }

    setRestoringFile(filename);
    try {
      await restoreDatabaseBackup({ data: { filename } });
      toast.success(`Database restored successfully from ${filename}`);
      void useClinic.getState().loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setRestoringFile(null);
    }
  };

  return (
    <div className="card-soft p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> MySQL Database Backup & Restore
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Backups are stored locally in the <code>backups/</code> directory on your PC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchBackups()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => void handleCreateBackup()} disabled={creating} className="rounded-xl">
            <Download className="h-4 w-4 mr-1" /> {creating ? "Creating Backup..." : "Create Backup Now"}
          </Button>
        </div>
      </div>

      {backups.length === 0 ? (
        <div className="border border-dashed rounded-xl p-6 text-center text-sm text-muted-foreground">
          No database backups created yet. Click "Create Backup Now" to safeguard your clinic data.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Backup Filename</th>
                <th className="p-3">Created Date & Time</th>
                <th className="p-3">File Size</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {backups.map((b) => (
                <tr key={b.filename} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs font-medium">{b.filename}</td>
                  <td className="p-3 text-xs">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-xs">{b.sizeFormatted}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      onClick={() => void handleRestore(b.filename)}
                      disabled={restoringFile === b.filename}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      {restoringFile === b.filename ? "Restoring..." : "Restore"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

