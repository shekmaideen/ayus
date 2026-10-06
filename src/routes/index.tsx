import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Lock, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeafMark } from "@/components/Logo";
import { getSetupStatus, createFirstDoctor, signIn } from "@/lib/staff.functions";
import { useClinic } from "@/store/clinic";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Sign in — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Staff sign-in for Dr. Ayus Homoeopathy Hospital clinic manager." },
      { property: "og:title", content: "Sign in — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Staff sign-in for Dr. Ayus Homoeopathy Hospital clinic manager." },
    ],
  }),
  component: LoginPage,
}));

const errMsg = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Something went wrong";
};

function LoginPage() {
  const navigate = useNavigate();
  const { loggedIn, loaded, userName, role, clear } = useClinic();
  const status = useServerFn(getSetupStatus);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [publicName, setPublicName] = useState<string | null>(null);
  const [publicLogo, setPublicLogo] = useState<string | null>(null);

  useEffect(() => {
    status().then((r) => {
      setNeedsSetup(r.needsSetup);
      setPublicName(r.clinicName);
      setPublicLogo(r.logoDataUrl);
    }).catch(() => setNeedsSetup(false));
  }, [status]);

  const activeSettings = useClinic.getState().settings;
  const displayLogo = publicLogo || activeSettings.logoDataUrl;
  const displayName = publicName || (activeSettings.clinicName !== "Dr. Ayus Homoeopathy Hospital" ? activeSettings.clinicName : "Dr. Ayus Homoeopathy Hospital");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel — branding */}
      <div className="leaf-bg relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          {displayLogo ? (
            <img src={displayLogo} alt="Clinic Logo" className="h-11 w-11 rounded-md object-cover" />
          ) : (
            <LeafMark className="h-11 w-11 text-primary-foreground" />
          )}
          <span className="font-display text-2xl">{displayName}</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-5xl leading-tight text-primary-foreground">
            Gentle care, precisely managed.
          </h1>
          <p className="mt-5 text-base text-primary-foreground/80">
            Patients, case histories, prescriptions, billing, inventory and follow-ups — the whole
            practice in one calm workspace.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Staff access only</p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            {displayLogo ? (
              <img src={displayLogo} alt="Clinic Logo" className="h-10 w-10 rounded-md object-cover" />
            ) : (
              <LeafMark className="h-10 w-10 text-primary" />
            )}
            <span className="font-display text-xl">{displayName}</span>
          </div>
          {needsSetup === null ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : needsSetup ? (
            <SetupForm onDone={() => setNeedsSetup(false)} />
          ) : loaded && loggedIn ? (
            <div className="space-y-4">
              <h2 className="mt-4 font-display text-3xl">Already signed in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You are currently signed in as <span className="font-semibold text-foreground">{userName || "Staff"}</span> ({role}).
              </p>
              <div className="pt-4 flex flex-col gap-3">
                <Button onClick={() => navigate({ to: "/dashboard", replace: true })} className="h-11 w-full rounded-xl">
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    clear();
                  }}
                  className="h-11 w-full rounded-xl"
                >
                  Sign in as different user
                </Button>
              </div>
            </div>
          ) : (
            <SignInForm />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SignInForm() {
  const doSignIn = useServerFn(signIn);
  const { setAuth, loadAll } = useClinic();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <h2 className="mt-4 font-display text-3xl">Welcome back</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in with your email or username.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await doSignIn({ data: { identifier: identifier.trim(), password } });
            // Store token for server function calls (session only, not 30-day persistent)
            sessionStorage.setItem("hc_token", result.token);
            document.cookie = `hc_token=${result.token}; path=/; SameSite=Lax`;
            // Set auth in Zustand
            setAuth({ userId: result.userId, role: result.role, userName: result.userName });
            // Load all clinic data with fallback
            try {
              await loadAll();
            } catch (err) {
              console.warn("[SignIn] loadAll warning:", err);
            }
            toast.success("Signed in");
            navigate({ to: "/dashboard", replace: true });
          } catch (err) {
            toast.error(errMsg(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or username</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="identifier"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-8 text-xs text-muted-foreground">New staff accounts are created by the doctor in Settings.</p>
    </>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createFirstDoctor);
  const { setAuth, loadAll } = useClinic();
  const navigate = useNavigate();
  const [f, setF] = useState({ fullName: "", email: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);

  return (
    <>
      <h2 className="mt-4 font-display text-3xl">Set up your clinic</h2>
      <p className="mt-1 text-sm text-muted-foreground">Create the doctor account. This only happens once.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await create({ data: f });
            // Store token returned directly from setup
            sessionStorage.setItem("hc_token", result.token);
            document.cookie = `hc_token=${result.token}; path=/; SameSite=Lax`;
            setAuth({ userId: result.userId, role: result.role, userName: result.userName });
            try {
              await loadAll();
            } catch (err) {
              console.warn("[Setup] loadAll warning:", err);
            }
            toast.success("Clinic set up — welcome!");
            onDone();
            navigate({ to: "/dashboard", replace: true });
          } catch (err) {
            toast.error(errMsg(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            ["fullName", "Full name (e.g. Dr. Ananya Raghavan)", "text"],
            ["email", "Email", "email"],
            ["username", "Username", "text"],
            ["password", "Password (8+ characters)", "password"],
          ] as const
        ).map(([k, label, type]) => (
          <div key={k} className="space-y-2">
            <Label htmlFor={k}>{label}</Label>
            <Input
              id={k}
              type={type}
              required
              minLength={k === "password" ? 8 : undefined}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </div>
        ))}
        <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
          {busy ? "Creating…" : "Create doctor account"}
        </Button>
      </form>
    </>
  );
}
