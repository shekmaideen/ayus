import { createFileRoute } from "@tanstack/react-router";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { can, useClinic } from "@/store/clinic";
import { inr } from "@/lib/format";
import type { Medicine } from "@/data/types";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — HomeoCare Clinic Manager" },
      { name: "description", content: "Homeopathic medicine stock levels, prices and low-stock alerts." },
      { property: "og:title", content: "Inventory — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Homeopathic medicine stock levels, prices and low-stock alerts." },
    ],
  }),
  component: () => (
    <AppShell>
      <Inventory />
    </AppShell>
  ),
});

const empty = { name: "", potencies: "6C, 30C, 200C", stock: "20", price: "10" };

function Inventory() {
  const { medicines, settings, role, addMedicine, updateMedicine, deleteMedicine } = useClinic();
  const editable = can(role, "inventory") === "full";
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState(empty);
  const [confirm, setConfirm] = useState<Medicine | null>(null);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return medicines
      .filter((m) => !t || m.name.toLowerCase().includes(t))
      .filter((m) => !lowOnly || m.stock < settings.lowStockThreshold);
  }, [medicines, q, lowOnly, settings.lowStockThreshold]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (m: Medicine) => {
    setEditing(m);
    setForm({ name: m.name, potencies: m.potencies.join(", "), stock: String(m.stock), price: String(m.price) });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error("Medicine name is required"); return; }
    const payload = {
      name: form.name.trim(),
      potencies: form.potencies.split(",").map((p) => p.trim()).filter(Boolean),
      stock: Number(form.stock) || 0,
      price: Number(form.price) || 0,
    };
    if (editing) {
      updateMedicine(editing.id, payload);
      toast.success("Medicine updated");
    } else {
      addMedicine(payload);
      toast.success("Medicine added");
    }
    setOpen(false);
  };

  return (
    <>
      <PageTitle
        title="Medicine inventory"
        subtitle={`${medicines.length} medicines · ${medicines.filter((m) => m.stock < settings.lowStockThreshold).length} low on stock`}
        action={
          editable ? (
            <Button className="rounded-xl" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Add medicine
            </Button>
          ) : (
            <Badge variant="outline">View only</Badge>
          )
        }
      />

      <div className="card-soft p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medicines" className="rounded-xl pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="low" checked={lowOnly} onCheckedChange={setLowOnly} />
            <Label htmlFor="low" className="text-sm">Low stock only</Label>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">No medicines match this filter.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((m) => {
              const low = m.stock < settings.lowStockThreshold;
              return (
                <div key={m.id} className="card-lift rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{inr(m.price)} per unit</p>
                    </div>
                    {low && <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Low stock</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.potencies.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[11px]">{p}</Badge>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Stock</span>
                      <span className="font-medium">{m.stock} units</span>
                    </div>
                    <Progress value={Math.min(100, (m.stock / (settings.lowStockThreshold * 5)) * 100)} className="h-1.5" />
                  </div>
                  {editable && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(m)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete ${m.name}`} onClick={() => setConfirm(m)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit medicine" : "Add medicine"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-name">Name</Label>
              <Input id="m-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-pot">Potencies (comma separated)</Label>
              <Input id="m-pot" value={form.potencies} onChange={(e) => setForm({ ...form, potencies: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="m-stock">Stock</Label>
                <Input id="m-stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-price">Price (₹)</Label>
                <Input id="m-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={save}>{editing ? "Save changes" : "Add medicine"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the medicine from the inventory.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) deleteMedicine(confirm.id);
                setConfirm(null);
                toast.success("Medicine deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
