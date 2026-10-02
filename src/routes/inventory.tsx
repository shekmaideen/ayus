import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { can, useClinic } from "@/store/clinic";
import { formatStockEntryDateTime, inr } from "@/lib/format";
import {
  MEDICINE_FORM_TYPES,
  MEDICINE_POTENCIES,
  BOTTLE_POTENCIES,
  TABLET_POTENCIES,
  isPotencyApplicable,
  isBrandApplicable,
  getPotencyOptions,
  type Medicine,
  type MedicineFormType,
  type MedicinePotency,
} from "@/data/types";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — HomeoCare Clinic Manager" },
      { name: "description", content: "Homeopathic medicine stock levels, potencies, forms, and entry history." },
      { property: "og:title", content: "Inventory — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Homeopathic medicine stock levels, potencies, forms, and entry history." },
    ],
  }),
  component: () => (
    <AppShell>
      <Inventory />
    </AppShell>
  ),
});

const defaultForm = {
  name: "",
  brand: "Schwabe",
  formType: "Bottle" as MedicineFormType,
  potency: "30CH",
  customPotency: "",
  stock: "20",
  price: "10.00",
};

function Inventory() {
  const { medicines, settings, role, addMedicine, updateMedicine, adjustStock, deleteMedicine } = useClinic();
  const editable = can(role, "inventory") === "full";

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [potencyFilter, setPotencyFilter] = useState<string>("all");
  const [formTypeFilter, setFormTypeFilter] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirm, setConfirm] = useState<Medicine | null>(null);

  // Adjust stock state
  const [adjustModal, setAdjustModal] = useState<Medicine | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "remove" | "set">("add");
  const [adjustQty, setAdjustQty] = useState("10");
  const [adjustReason, setAdjustReason] = useState("New shipment received");

  // Real-time IST preview for Stock Entry Date/Day/Time
  const [livePreview, setLivePreview] = useState(() => formatStockEntryDateTime(new Date()));

  useEffect(() => {
    if (!open || editing) return;
    setLivePreview(formatStockEntryDateTime(new Date()));
    const timer = setInterval(() => {
      setLivePreview(formatStockEntryDateTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [open, editing]);

  const allAvailablePotencies = useMemo(() => {
    const set = new Set<string>();
    MEDICINE_POTENCIES.forEach((p) => set.add(p));
    medicines.forEach((m) => {
      const p = (m.potency || "").trim();
      if (p && p !== "-") set.add(p);
    });
    return Array.from(set);
  }, [medicines]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return medicines
      .filter((m) => {
        if (!t) return true;
        return (
          m.name.toLowerCase().includes(t) ||
          m.brand.toLowerCase().includes(t) ||
          m.potency.toLowerCase().includes(t) ||
          m.formType.toLowerCase().includes(t)
        );
      })
      .filter((m) => {
        if (statusFilter === "low") return m.stock > 0 && m.stock < settings.lowStockThreshold;
        if (statusFilter === "out") return m.stock === 0;
        if (statusFilter === "in") return m.stock >= settings.lowStockThreshold;
        return true;
      })
      .filter((m) => {
        if (potencyFilter === "all") return true;
        return m.potency === potencyFilter;
      })
      .filter((m) => {
        if (formTypeFilter === "all") return true;
        return m.formType === formTypeFilter;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, q, statusFilter, potencyFilter, formTypeFilter, settings.lowStockThreshold]);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (m: Medicine) => {
    setEditing(m);
    const formType = (m.formType as MedicineFormType) || "Bottle";
    const applicable = isPotencyApplicable(formType);
    let pot = "";
    let custom = "";

    if (applicable) {
      const opts = getPotencyOptions(formType);
      if ((opts as readonly string[]).includes(m.potency)) {
        pot = m.potency;
      } else if (m.potency && m.potency.trim() !== "") {
        pot = "Other";
        custom = m.potency;
      } else {
        pot = formType === "Tablet" ? "3X" : "30CH";
      }
    }

    setForm({
      name: m.name,
      brand: isBrandApplicable(formType) ? (m.brand || "Schwabe") : "",
      formType,
      potency: pot,
      customPotency: custom,
      stock: String(m.stock),
      price: String(m.price),
    });
    setOpen(true);
  };

  const handleFormTypeChange = (newType: MedicineFormType) => {
    if (newType === "Bottle") {
      const isCurrentValid = (BOTTLE_POTENCIES as readonly string[]).includes(form.potency);
      setForm((prev) => ({
        ...prev,
        formType: newType,
        brand: prev.brand && prev.brand.trim() !== "" ? prev.brand : "Schwabe",
        potency: isCurrentValid ? prev.potency : "30CH",
      }));
    } else if (newType === "Tablet") {
      const isCurrentValid = (TABLET_POTENCIES as readonly string[]).includes(form.potency);
      setForm((prev) => ({
        ...prev,
        formType: newType,
        brand: "",
        potency: isCurrentValid ? prev.potency : "3X",
      }));
    } else {
      // For other form/type: neither potency nor brand appear!
      setForm((prev) => ({
        ...prev,
        formType: newType,
        brand: "",
        potency: "",
        customPotency: "",
      }));
    }
  };

  const openAdjust = (m: Medicine) => {
    setAdjustModal(m);
    setAdjustType("add");
    setAdjustQty("10");
    setAdjustReason("New shipment received");
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Medicine Name is required");
      return;
    }
    if (isBrandApplicable(form.formType) && !form.brand.trim()) {
      toast.error("Medicine Brand Name is required for Bottle");
      return;
    }

    const finalBrand = isBrandApplicable(form.formType) ? form.brand.trim() : "";

    let finalPotency = "";
    if (isPotencyApplicable(form.formType)) {
      if (form.potency === "Other") {
        finalPotency = form.customPotency.trim();
        if (!finalPotency) {
          toast.error(`Please type a manual potency for ${form.formType}`);
          return;
        }
      } else {
        finalPotency = form.potency.trim();
        if (!finalPotency) {
          toast.error(`Please select a potency for ${form.formType}`);
          return;
        }
      }
    } else {
      // Other forms: potency does not appear
      finalPotency = "";
    }

    const numStock = Number(form.stock);
    if (isNaN(numStock) || numStock < 0) {
      toast.error("Stock Quantity must be a valid non-negative number");
      return;
    }
    const numPrice = Number(form.price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error("Selling Price must be a valid non-negative number");
      return;
    }

    if (editing) {
      updateMedicine(editing.id, {
        name: form.name.trim(),
        brand: finalBrand,
        potency: finalPotency,
        formType: form.formType,
        stock: Math.round(numStock),
        price: numPrice,
      });
      toast.success(`Updated ${form.name.trim()}${finalPotency ? ` (${finalPotency})` : ""}`);
    } else {
      // Check for exact duplicate variant
      const exists = medicines.some(
        (m) =>
          m.name.toLowerCase() === form.name.trim().toLowerCase() &&
          (isBrandApplicable(form.formType)
            ? (m.brand || "").toLowerCase() === finalBrand.toLowerCase()
            : true) &&
          (m.potency || "").trim().toLowerCase() === finalPotency.toLowerCase() &&
          m.formType.toLowerCase() === form.formType.toLowerCase(),
      );
      if (exists) {
        toast.error("This medicine variant (same name, brand, potency, and form) already exists in inventory.");
        return;
      }

      addMedicine({
        name: form.name.trim(),
        brand: finalBrand,
        potency: finalPotency,
        formType: form.formType,
        stock: Math.round(numStock),
        price: numPrice,
        potencies: finalPotency ? [finalPotency] : [],
      });
      toast.success(
        `Added ${form.name.trim()} (${form.formType}${finalPotency ? ` · ${finalPotency}` : ""}) to inventory`,
      );
    }
    setOpen(false);
  };

  const handleAdjustSubmit = () => {
    if (!adjustModal) return;
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than zero");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("Please provide an adjustment reason");
      return;
    }

    let delta = 0;
    if (adjustType === "add") {
      delta = qty;
    } else if (adjustType === "remove") {
      if (qty > adjustModal.stock) {
        toast.error(`Cannot remove ${qty} units. Current stock is only ${adjustModal.stock}.`);
        return;
      }
      delta = -qty;
    } else if (adjustType === "set") {
      delta = qty - adjustModal.stock;
    }

    adjustStock(adjustModal.id, delta, adjustReason.trim());
    toast.success(`Stock adjusted for ${adjustModal.name} (${delta >= 0 ? "+" + delta : delta})`);
    setAdjustModal(null);
  };

  const lowCount = medicines.filter((m) => m.stock > 0 && m.stock < settings.lowStockThreshold).length;
  const outCount = medicines.filter((m) => m.stock === 0).length;

  return (
    <>
      <PageTitle
        title="Medicine inventory"
        subtitle={`${medicines.length} medicine variants · ${lowCount} low stock · ${outCount} out of stock`}
        action={
          editable ? (
            <Button className="rounded-xl shadow-sm" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Add medicine
            </Button>
          ) : (
            <Badge variant="outline">View only</Badge>
          )
        }
      />

      <div className="space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="card-soft p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by medicine, brand, potency, or form..."
                className="rounded-xl pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Potency Filter */}
            <Select value={potencyFilter} onValueChange={setPotencyFilter}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <SelectValue placeholder="Potency" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All Potency</SelectItem>
                {allAvailablePotencies.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Form / Type Filter */}
            <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
              <SelectTrigger className="w-[150px] rounded-xl">
                <SelectValue placeholder="Form / Type" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All Forms</SelectItem>
                {MEDICINE_FORM_TYPES.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inventory Table (Requirement 12) */}
        <div className="card-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5">Medicine Name</th>
                  <th className="px-4 py-3.5">Brand</th>
                  <th className="px-3 py-3.5">Potency</th>
                  <th className="px-3 py-3.5">Form / Type</th>
                  <th className="px-4 py-3.5 text-right">Stock</th>
                  <th className="px-4 py-3.5 text-right">Price</th>
                  <th className="px-4 py-3.5">Stock Entry Date</th>
                  <th className="px-4 py-3.5">Stock Entry Time</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  {editable && <th className="px-4 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={editable ? 10 : 9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-10 w-10 text-muted-foreground/60" strokeWidth={1.3} />
                        <p className="font-medium text-foreground">No medicines found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search query or filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((m) => {
                    const isOut = m.stock === 0;
                    const isLow = m.stock > 0 && m.stock < settings.lowStockThreshold;
                    const entry = formatStockEntryDateTime(m.createdAt);

                    return (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        {/* Medicine Name */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{m.name}</p>
                        </td>

                        {/* Brand (only for Bottle) */}
                        <td className="px-4 py-3 text-muted-foreground">
                          {isBrandApplicable(m.formType) && m.brand && m.brand.trim() !== "" ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                              {m.brand}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Potency */}
                        <td className="px-3 py-3">
                          {m.potency && m.potency.trim() !== "" && m.potency !== "-" ? (
                            <Badge variant="outline" className="border-primary/30 bg-primary-soft text-primary font-mono font-medium">
                              {m.potency}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Form / Type */}
                        <td className="px-3 py-3">
                          <Badge variant="secondary" className="font-normal text-xs">
                            {m.formType || "Globules"}
                          </Badge>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className={`font-semibold font-mono ${isOut ? "text-destructive" : isLow ? "text-warning-foreground" : "text-foreground"}`}>
                              {m.stock}
                            </span>
                            <span className="text-[10px] text-muted-foreground">units</span>
                          </div>
                        </td>

                        {/* Selling Price */}
                        <td className="px-4 py-3 text-right font-medium font-mono text-foreground">
                          {inr(m.price)}
                        </td>

                        {/* Stock Entry Date & Day */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-xs">
                            <span className="font-medium text-foreground">{entry.date}</span>
                            <span className="text-[11px] text-muted-foreground">{entry.day}</span>
                          </div>
                        </td>

                        {/* Stock Entry Time */}
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {entry.time}
                        </td>

                        {/* Status (Requirement 12) */}
                        <td className="px-4 py-3 text-center">
                          {isOut ? (
                            <Badge variant="outline" className="border-destructive/40 bg-danger-soft text-destructive text-[11px] font-semibold">
                              OUT OF STOCK
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning-foreground text-[11px] font-semibold">
                              LOW STOCK
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-success/40 bg-success-soft text-success text-[11px] font-semibold">
                              IN STOCK
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        {editable && (
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg px-2.5 text-xs font-medium"
                                onClick={() => openAdjust(m)}
                              >
                                <ArrowUpDown className="mr-1 h-3.5 w-3.5" /> Adjust
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(m)}
                                aria-label={`Edit ${m.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setConfirm(m)}
                                aria-label={`Delete ${m.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Medicine Dialog (Requirement 11) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? "Edit medicine" : "Add Medicine"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* 1. Medicine Name */}
            <div className="space-y-1.5">
              <Label htmlFor="m-name" className="text-xs font-medium">
                Medicine Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Arnica Montana"
                className="rounded-xl"
              />
            </div>

            {/* 3. Form / Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Form / Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.formType}
                onValueChange={(v) => handleFormTypeChange(v as MedicineFormType)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Form / Type" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {MEDICINE_FORM_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 9. Medicine Brand Name (ONLY for Bottle) */}
            {isBrandApplicable(form.formType) && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="m-brand" className="text-xs font-medium">
                  Medicine Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="m-brand"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. Schwabe, SBL, Dr. Reckeweg"
                  className="rounded-xl"
                  autoFocus={!form.brand}
                />
              </div>
            )}

            {/* 2. Potency (Conditionally rendered: ONLY appears if Form/Type is Bottle or Tablet) */}
            {isPotencyApplicable(form.formType) && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary-soft/30 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Potency for {form.formType} <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Select option or choose Other</span>
                  </div>
                  <Select
                    value={form.potency}
                    onValueChange={(v) => setForm({ ...form, potency: v })}
                  >
                    <SelectTrigger className="rounded-xl bg-background">
                      <SelectValue placeholder="Select Potency" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPotencyOptions(form.formType).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p === "Other" ? "Other (to type manually)" : p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.potency === "Other" && (
                  <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                    <Label htmlFor="m-custom-potency" className="text-[11px] font-medium text-foreground">
                      Type Manual Potency <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="m-custom-potency"
                      value={form.customPotency}
                      onChange={(e) => setForm({ ...form, customPotency: e.target.value })}
                      placeholder={form.formType === "Tablet" ? "e.g. 12X, 30X, 200X..." : "e.g. 10M, 50M, CM, Mother Tincture..."}
                      className="rounded-xl bg-background font-mono text-xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. Stock Quantity & 5. Selling Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-stock" className="text-xs font-medium">
                  Stock Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="m-stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="e.g. 20"
                  className="rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-price" className="text-xs font-medium">
                  Selling Price (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="m-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 10.00"
                  className="rounded-xl font-mono"
                />
              </div>
            </div>

            {/* 6, 7, 8. Automatically Generated Stock Entry Timestamp Preview */}
            <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {editing ? "Stock Entry Timestamp" : "Automatically Generated Entry Details"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="block text-[11px] text-muted-foreground">Stock Entry Date</span>
                  <span className="font-semibold text-foreground">
                    {editing ? formatStockEntryDateTime(editing.createdAt).date : livePreview.date}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground">Stock Entry Day</span>
                  <span className="font-semibold text-foreground">
                    {editing ? formatStockEntryDateTime(editing.createdAt).day : livePreview.day}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground">Stock Entry Time</span>
                  <span className="font-semibold text-foreground font-mono">
                    {editing ? formatStockEntryDateTime(editing.createdAt).time : livePreview.time}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleSave}>
              {editing ? "Save changes" : "Add Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog (Requirement 16) */}
      <Dialog open={!!adjustModal} onOpenChange={(o) => !o && setAdjustModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Adjust stock</DialogTitle>
          </DialogHeader>

          {adjustModal && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-primary-soft p-3.5 text-xs text-primary-soft-foreground space-y-1">
                <p className="font-semibold text-sm">{adjustModal.name}</p>
                <p className="text-muted-foreground">
                  {adjustModal.brand}
                  {adjustModal.potency && adjustModal.potency.trim() !== "" && adjustModal.potency !== "-" ? ` · ${adjustModal.potency}` : ""}
                  {` · ${adjustModal.formType}`}
                </p>
                <p className="pt-1 font-mono">Current Stock: <strong>{adjustModal.stock} units</strong></p>
              </div>

              {/* Action Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Adjustment Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={adjustType === "add" ? "default" : "outline"}
                    className="rounded-xl text-xs"
                    onClick={() => setAdjustType("add")}
                  >
                    + Add Stock
                  </Button>
                  <Button
                    type="button"
                    variant={adjustType === "remove" ? "default" : "outline"}
                    className="rounded-xl text-xs"
                    onClick={() => setAdjustType("remove")}
                  >
                    - Remove Stock
                  </Button>
                  <Button
                    type="button"
                    variant={adjustType === "set" ? "default" : "outline"}
                    className="rounded-xl text-xs"
                    onClick={() => setAdjustType("set")}
                  >
                    = Set Exact
                  </Button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label htmlFor="adj-qty" className="text-xs font-medium">
                  {adjustType === "set" ? "New Exact Stock Count" : "Quantity to " + (adjustType === "add" ? "Add" : "Remove")}
                </Label>
                <Input
                  id="adj-qty"
                  type="number"
                  min={1}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="rounded-xl font-mono text-base"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label htmlFor="adj-reason" className="text-xs font-medium">
                  Reason for Adjustment
                </Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New shipment received">New shipment received</SelectItem>
                    <SelectItem value="Physical audit count correction">Physical audit count correction</SelectItem>
                    <SelectItem value="Damaged or expired bottles removed">Damaged or expired bottles removed</SelectItem>
                    <SelectItem value="Dispensed outside prescription system">Dispensed outside prescription</SelectItem>
                    <SelectItem value="Patient return / restock">Patient return / restock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Preview */}
              <div className="rounded-xl bg-muted p-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Updated Stock:</span>
                <span className="font-semibold text-sm font-mono">
                  {adjustType === "add"
                    ? `${adjustModal.stock} + ${Number(adjustQty) || 0} = ${adjustModal.stock + (Number(adjustQty) || 0)} units`
                    : adjustType === "remove"
                      ? `${adjustModal.stock} - ${Number(adjustQty) || 0} = ${Math.max(0, adjustModal.stock - (Number(adjustQty) || 0))} units`
                      : `${Number(adjustQty) || 0} units`}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="ghost" className="rounded-xl" onClick={() => setAdjustModal(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleAdjustSubmit}>
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Archive Confirmation Dialog */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {confirm?.name} ({confirm?.potency})?</AlertDialogTitle>
            <AlertDialogDescription>
              This archives the medicine from active inventory. Historical prescriptions and visits will still preserve their medicine records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm) deleteMedicine(confirm.id);
                setConfirm(null);
                toast.success("Medicine archived");
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
