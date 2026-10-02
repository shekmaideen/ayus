import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinic } from "@/store/clinic";
import { formatDate, initials } from "@/lib/format";

export const Route = createFileRoute("/patients/")({
  head: () => ({
    meta: [
      { title: "Patients — HomeoCare Clinic Manager" },
      { name: "description", content: "Search, filter and open patient records for the homeopathy clinic." },
      { property: "og:title", content: "Patients — HomeoCare Clinic Manager" },
      { property: "og:description", content: "Search, filter and open patient records for the homeopathy clinic." },
    ],
  }),
  component: () => (
    <AppShell>
      <PatientList />
    </AppShell>
  ),
});

const PAGE = 8;

function PatientList() {
  const patients = useClinic((s) => s.patients);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("all");
  const [status, setStatus] = useState("all");
  const [bloodGroup, setBloodGroup] = useState("all");
  const [sort, setSort] = useState<"name" | "recent" | "age">("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = patients.filter((p) => {
      const matches = !t || p.name.toLowerCase().includes(t) || p.phone.includes(t) || p.regNo.toLowerCase().includes(t);
      const g = gender === "all" || p.gender === gender;
      const s = status === "all" || (status === "active" ? p.active : !p.active);
      const bg = bloodGroup === "all" || p.bloodGroup === bloodGroup;
      return matches && g && s && bg;
    });
    return [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "age" ? b.age - a.age : b.registeredOn.localeCompare(a.registeredOn),
    );
  }, [patients, q, gender, status, bloodGroup, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE, current * PAGE);

  return (
    <>
      <PageTitle
        title="Patients"
        subtitle={`${filtered.length} of ${patients.length} records`}
        action={
          <div className="flex items-center gap-2">
            <PatientImportModal />
            <Button asChild className="rounded-xl">
              <Link to="/patients/new">
                <UserPlus className="mr-2 h-4 w-4" /> Register patient
              </Link>
            </Button>
          </div>
        }
      />

      <div className="card-soft p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, phone or reg no."
              className="rounded-xl pl-9"
            />
          </div>
          <Select value={gender} onValueChange={(v) => { setGender(v); setPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bloodGroup} onValueChange={(v) => { setBloodGroup(v); setPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Blood group" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All blood groups</SelectItem>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-44 rounded-xl">
              <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently registered</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
              <SelectItem value="age">Age (high to low)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">No patients match these filters.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-hidden rounded-xl border md:block">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Reg No.</th>
                    <th className="px-4 py-3 font-semibold">Age / Gender</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Registered</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((p) => (
                    <tr key={p.id} className="cursor-pointer transition-colors hover:bg-secondary/50">
                      <td className="px-4 py-3">
                        <Link to="/patients/$id" params={{ id: p.id }} className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary-soft text-xs text-primary-soft-foreground">
                              {initials(p.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            <span className="block font-medium">{p.name}</span>
                            <span className="block text-xs text-muted-foreground">{p.occupation}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.regNo}</td>
                      <td className="px-4 py-3">{p.age}y · {p.gender}</td>
                      <td className="px-4 py-3">{p.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.registeredOn)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={p.active ? "border-success/30 bg-success-soft text-success" : "border-border bg-muted text-muted-foreground"}
                        >
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {rows.map((p) => (
                <Link
                  key={p.id}
                  to="/patients/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary-soft text-xs text-primary-soft-foreground">
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.regNo} · {p.age}y {p.gender} · {p.phone}
                    </p>
                  </div>
                  <Badge variant="outline" className={p.active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}>
                    {p.active ? "Active" : "Inactive"}
                  </Badge>
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {current} of {pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { validatePatientImport, executePatientImport, type RawPatientRow } from "@/lib/patient-import.functions";

function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parser supporting quotes
    const values: string[] = [];
    let curr = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"' || char === "'") inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
        values.push(curr.trim().replace(/^["']|["']$/g, ""));
        curr = "";
      } else {
        curr += char;
      }
    }
    values.push(curr.trim().replace(/^["']|["']$/g, ""));

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ?? "";
    });
    rows.push(rowObj);
  }
  return rows;
}

function PatientImportModal() {
  const [open, setOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<Awaited<ReturnType<typeof validatePatientImport>> | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidating(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = String(evt.target?.result ?? "");
        const rawRows = parseCsvText(text);
        if (rawRows.length === 0) {
          toast.error("CSV file appears to be empty.");
          setValidating(false);
          return;
        }

        const res = await validatePatientImport({ data: { rows: rawRows } });
        setValidationResult(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("CSV Validation Error: " + msg);
      } finally {
        setValidating(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!validationResult) return;
    const validRows = validationResult.results
      .filter((r) => r.status === "valid")
      .map((r) => r.row as RawPatientRow);

    if (validRows.length === 0) {
      toast.error("No valid patient records to import.");
      return;
    }

    setImporting(true);
    try {
      const res = await executePatientImport({ data: { rows: validRows, skipDuplicates: true } });
      toast.success(`Successfully imported ${res.importedCount} patients!`);
      void useClinic.getState().loadAll();
      setOpen(false);
      setValidationResult(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Import failed: " + msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Batch Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Batch Import Patient Records
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm pt-2">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-semibold text-foreground">CSV Columns Expected:</p>
            <code className="text-xs font-mono block mt-1 bg-background p-2 rounded border overflow-x-auto text-muted-foreground">
              Reg No, Name, Age, Gender, Phone, Email, Address, Blood Group, Allergies, Occupation, Registered On
            </code>
          </div>

          <div className="flex items-center justify-center border-2 border-dashed rounded-xl p-8 text-center bg-background hover:bg-muted/20 transition-colors">
            <label className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-primary animate-bounce" />
              <span className="font-medium">Select Patient CSV File</span>
              <span className="text-xs text-muted-foreground">Supports .csv files with up to 3,000+ patient rows</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={validating || importing} />
            </label>
          </div>

          {validating && (
            <div className="text-center py-4 text-muted-foreground text-sm font-medium animate-pulse">
              Validating CSV rows & checking duplicates against database...
            </div>
          )}

          {validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle className="h-4 w-4" /> Ready to Import
                  </div>
                  <div className="text-2xl font-bold mt-1">{validationResult.validCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Duplicates (Skipped)
                  </div>
                  <div className="text-2xl font-bold mt-1">{validationResult.duplicateCount}</div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="h-4 w-4" /> Invalid Rows
                  </div>
                  <div className="text-2xl font-bold mt-1">{validationResult.errorCount}</div>
                </div>
              </div>

              <div className="rounded-xl border overflow-x-auto max-h-56">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Reg No</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {validationResult.results.slice(0, 50).map((r) => (
                      <tr key={r.index}>
                        <td className="p-2 font-mono">{r.index}</td>
                        <td className="p-2">
                          {r.status === "valid" && <Badge className="bg-emerald-600 text-white">Valid</Badge>}
                          {r.status === "duplicate" && <Badge variant="outline" className="text-amber-600 border-amber-400">Duplicate</Badge>}
                          {r.status === "error" && <Badge variant="destructive">Error</Badge>}
                        </td>
                        <td className="p-2 font-mono">{String(r.row.regNo || "")}</td>
                        <td className="p-2 font-medium">{String(r.row.name || "")}</td>
                        <td className="p-2">{String(r.row.phone || "")}</td>
                        <td className="p-2 text-muted-foreground">
                          {r.status === "duplicate" ? r.warning : r.status === "error" ? r.error : "OK"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setValidationResult(null)}>Clear</Button>
                <Button
                  onClick={() => void handleConfirmImport()}
                  disabled={importing || validationResult.validCount === 0}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {importing ? "Importing Patients..." : `Confirm Import (${validationResult.validCount} Patients)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

