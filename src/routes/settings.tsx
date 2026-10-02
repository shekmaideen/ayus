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
      </div>
    </>
  );
}
