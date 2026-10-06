import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useServerFn } from "@tanstack/react-start";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useClinic } from "@/store/clinic";
import { importMedicinesExcel } from "@/lib/backup.functions";
import { normalizeMedicinePotency } from "@/data/types";

export interface MedImportRow {
  name: string;
  formType: string;
  potency: string;
  stock: number;
  price: number;
}

export function normaliseMedicineRow(raw: Record<string, any>): MedImportRow {
  const normKeys: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    const cleanKey = String(k)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    normKeys[cleanKey] = v;
  }

  const name = String(
    normKeys["medicinename"] ??
      normKeys["medicine"] ??
      normKeys["name"] ??
      normKeys["remedy"] ??
      normKeys["remedyname"] ??
      normKeys["itemname"] ??
      normKeys["item"] ??
      normKeys["drugname"] ??
      normKeys["drug"] ??
      normKeys["particulars"] ??
      normKeys["description"] ??
      "",
  ).trim();

  let formType = String(
    normKeys["formtype"] ??
      normKeys["form"] ??
      normKeys["type"] ??
      normKeys["dosageform"] ??
      normKeys["packaging"] ??
      "",
  ).trim();
  if (!formType) formType = "Bottle";

  const rawPotency = String(
    normKeys["potency"] ??
      normKeys["power"] ??
      normKeys["strength"] ??
      normKeys["scale"] ??
      "",
  ).trim();
  const potency = normalizeMedicinePotency(rawPotency);

  const rawStock =
    normKeys["stockquantity"] ??
    normKeys["stock"] ??
    normKeys["quantity"] ??
    normKeys["qty"] ??
    normKeys["quantityinstock"] ??
    normKeys["units"] ??
    normKeys["bal"] ??
    normKeys["balance"] ??
    normKeys["available"] ??
    normKeys["count"] ??
    0;
  const numStock = Number(String(rawStock).replace(/[^0-9.-]/g, ""));
  const stock = !isNaN(numStock) && numStock >= 0 ? Math.round(numStock) : 0;

  const rawPrice =
    normKeys["sellingprice"] ??
    normKeys["price"] ??
    normKeys["mrp"] ??
    normKeys["rate"] ??
    normKeys["cost"] ??
    normKeys["amount"] ??
    normKeys["priceperunit"] ??
    0;
  const numPrice = Number(String(rawPrice).replace(/[^0-9.-]/g, ""));
  const price = !isNaN(numPrice) && numPrice >= 0 ? numPrice : 0;

  return { name, formType, potency, stock, price };
}

export function parseExcelWorkbook(wb: XLSX.WorkBook): MedImportRow[] {
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  if (!ws) return [];

  // Try standard sheet_to_json first
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  let parsed = rows.map(normaliseMedicineRow).filter((r) => r.name.length > 0);

  if (parsed.length > 0) return parsed;

  // If 0 found, check if headers were on row 2 or 3 (e.g. title banner in row 1)
  const raw2D = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  for (let headerRowIdx = 0; headerRowIdx < Math.min(6, raw2D.length); headerRowIdx++) {
    const row = raw2D[headerRowIdx];
    if (!Array.isArray(row)) continue;
    const hasNameHeader = row.some((cell) => {
      const s = String(cell || "").toLowerCase().replace(/[^a-z]/g, "");
      return s.includes("medicine") || s.includes("name") || s.includes("remedy") || s.includes("item");
    });
    if (hasNameHeader) {
      const subRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
        range: headerRowIdx,
        defval: "",
      });
      parsed = subRows.map(normaliseMedicineRow).filter((r) => r.name.length > 0);
      if (parsed.length > 0) return parsed;
    }
  }

  return parsed;
}

export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "Medicine Name": "Arnica Montana",
      "Form / Type": "Bottle",
      "Potency": "30CH",
      "Stock Quantity": 25,
      "Selling Price": 120.0,
    },
    {
      "Medicine Name": "Belladonna",
      "Form / Type": "Bottle",
      "Potency": "200CH",
      "Stock Quantity": 20,
      "Selling Price": 150.0,
    },
    {
      "Medicine Name": "Calcarea Phosphorica",
      "Form / Type": "Tablet",
      "Potency": "6CH",
      "Stock Quantity": 30,
      "Selling Price": 180.0,
    },
    {
      "Medicine Name": "Ferrum Phosphoricum",
      "Form / Type": "Tablet",
      "Potency": "",
      "Stock Quantity": 15,
      "Selling Price": 160.0,
    },
    {
      "Medicine Name": "Calendula Ointment",
      "Form / Type": "Ointment",
      "Potency": "",
      "Stock Quantity": 10,
      "Selling Price": 95.0,
    },
    {
      "Medicine Name": "Passiflora Incarnata",
      "Form / Type": "Bottle",
      "Potency": "Q",
      "Stock Quantity": 12,
      "Selling Price": 240.0,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 16 }, { wch: 15 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Medicines");
  XLSX.writeFile(wb, "ayus-medications-template.xlsx");
  toast.success("Excel template (.xlsx) downloaded!");
}

export function downloadSampleCSVTemplate() {
  const csv =
    "Medicine Name,Form / Type,Potency,Stock Quantity,Selling Price\n" +
    "Arnica Montana,Bottle,30CH,25,120.00\n" +
    "Belladonna,Bottle,200CH,20,150.00\n" +
    "Calcarea Phosphorica,Tablet,6CH,30,180.00\n" +
    "Ferrum Phosphoricum,Tablet,,15,160.00\n" +
    "Calendula Ointment,Ointment,,10,95.00\n" +
    "Passiflora Incarnata,Bottle,Q,12,240.00\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ayus-medications-template.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV template (.csv) downloaded!");
}

interface MedicineExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MedicineExcelImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: MedicineExcelImportDialogProps) {
  const doImport = useServerFn(importMedicinesExcel);
  const { loadAll } = useClinic();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<MedImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const resetState = () => {
    setFileName("");
    setRows([]);
    setLoading(false);
    setStatusMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const parsed = parseExcelWorkbook(wb);

        if (parsed.length === 0) {
          toast.error("No valid medicine rows detected. Please ensure your file has a 'Medicine Name' column.");
          setRows([]);
        } else {
          setRows(parsed);
          setStatusMessage(`Found ${parsed.length} medicines in "${file.name}". Ready to import!`);
          toast.info(`${parsed.length} medicines found. Click 'Import Now' to save to inventory.`);
        }
      } catch {
        toast.error("Could not read file. Please ensure it is a valid .xlsx, .xls, or .csv document.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    if (!rows.length) {
      toast.error("Please choose an Excel or CSV file first.");
      return;
    }

    setLoading(true);
    try {
      const res = await doImport({ data: { rows, updateExisting } });
      const total = res.inserted + res.updated;

      // Reload store immediately
      await loadAll();
      if (onSuccess) onSuccess();

      toast.success(
        `Import complete! ${res.inserted} new medicines added${
          res.updated > 0 ? `, ${res.updated} stock quantities updated` : ""
        }.`,
      );

      if (res.errors.length > 0) {
        toast.warning(`${res.errors.length} row(s) had errors and were skipped.`);
      }

      onOpenChange(false);
      resetState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed. Please check your data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 font-display text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            Import Medications from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Step 1: Download Templates */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 border border-border/60">
            <div className="text-xs">
              <p className="font-semibold text-foreground">Need the sample template?</p>
              <p className="text-muted-foreground text-[11px]">
                Columns: Medicine Name, Form / Type, Potency, Stock Quantity, Selling Price
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs gap-1.5"
                onClick={downloadSampleExcelTemplate}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs gap-1.5"
                onClick={downloadSampleCSVTemplate}
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          {/* Step 2: Choose File */}
          <div className="rounded-xl border-2 border-dashed border-primary/30 p-5 text-center bg-primary-soft/10 transition-colors hover:bg-primary-soft/20">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              id="dialog-med-excel-file-input"
            />
            <label
              htmlFor="dialog-med-excel-file-input"
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {fileName ? fileName : "Click to select your Excel (.xlsx, .xls) or CSV file"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rows.length > 0
                    ? `✓ ${rows.length} medicines detected and ready to import`
                    : "Supports Microsoft Excel, Google Sheets, or CSV exports"}
                </p>
              </div>
            </label>
          </div>

          {/* Step 3: Options & Preview */}
          {rows.length > 0 && (
            <div className="space-y-3 rounded-xl border p-3.5 bg-background">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" /> Preview ({rows.length} medicines)
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="dialog-sw-update-existing"
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                  />
                  <Label htmlFor="dialog-sw-update-existing" className="text-xs cursor-pointer select-none">
                    Add to existing stock if already exists
                  </Label>
                </div>
              </div>

              {/* Table preview */}
              <div className="max-h-44 overflow-y-auto rounded-lg border text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted sticky top-0 text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5">Medicine Name</th>
                      <th className="px-2.5 py-1.5">Form / Type</th>
                      <th className="px-2.5 py-1.5">Potency</th>
                      <th className="px-2.5 py-1.5 text-right">Stock</th>
                      <th className="px-3 py-1.5 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-1.5 font-medium text-foreground max-w-[180px] truncate">{r.name}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{r.formType}</td>
                        <td className="px-2.5 py-1.5 font-mono text-primary font-medium">{r.potency || "—"}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono">{r.stock}</td>
                        <td className="px-3 py-1.5 text-right font-mono">₹{r.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && (
                  <p className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/20 border-t">
                    …plus {rows.length - 5} more medicines
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            className="rounded-xl gap-2 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleExecuteImport}
            disabled={loading || rows.length === 0}
            id="btn-confirm-import-medicines-now"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {loading ? "Importing to Inventory…" : `Import ${rows.length > 0 ? rows.length : ""} Medicines Now`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
