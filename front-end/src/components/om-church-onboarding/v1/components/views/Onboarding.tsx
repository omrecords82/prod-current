import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    CircleAlert,
    Copy,
    Droplets,
    Flame,
    HeartHandshake,
    Loader2,
    Mail,
    MapPin,
    PartyPopper,
    Save,
    Search,
    ShieldCheck,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../ThemeToggle";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

const steps = [
  { key: "find-parish", label: "Find Your Parish", n: 1 },
  { key: "profile", label: "Church Profile", n: 2 },
  { key: "modules", label: "Record Modules", n: 3 },
  { key: "admin", label: "Admin Account", n: 4 },
  { key: "review", label: "Review & Submit", n: 5 },
  { key: "confirm", label: "Confirmation", n: 6 },
] as const;

type StepKey = (typeof steps)[number]["key"];

type Props = {
  onCancel: () => void;
  onComplete: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

type CrmChurch = {
  id: number;
  name: string;
  city: string;
  state_code: string;
  jurisdiction: string;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const STATE_CODES = Object.keys(STATE_NAMES);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStrongPassword(pw: string): boolean {
  return pw.length >= 12 && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

// Required-field validation for the Church Profile step. Returns a map of
// field → error message; an empty map means the step is valid.
function getProfileErrors(p: any): Record<string, string> {
  const e: Record<string, string> = {};
  const required: [string, string][] = [
    ["churchName", "Church name"],
    ["jurisdiction", "Jurisdiction"],
    ["firstName", "Parish contact first name"],
    ["lastName", "Parish contact last name"],
    ["address", "Address"],
    ["city", "City"],
    ["state", "State / Province"],
    ["zip", "Postal code"],
    ["country", "Country"],
    ["timezone", "Timezone"],
  ];
  for (const [k, label] of required) {
    if (!String(p[k] ?? "").trim()) e[k] = `${label} is required`;
  }
  if (!String(p.email ?? "").trim()) e.email = "Contact email is required";
  else if (!EMAIL_RE.test(String(p.email).trim())) e.email = "Enter a valid email address";
  return e;
}

// Required-field validation for the Admin Account step.
function getAdminErrors(a: any): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(a.firstName ?? "").trim()) e.firstName = "Admin first name is required";
  if (!String(a.lastName ?? "").trim()) e.lastName = "Admin last name is required";
  if (!String(a.email ?? "").trim()) e.email = "Admin email is required";
  else if (!EMAIL_RE.test(String(a.email).trim())) e.email = "Enter a valid email address";
  if (!a.password) e.password = "Password is required";
  else if (!isStrongPassword(a.password)) e.password = "At least 12 characters, with one number and one symbol";
  if (!a.confirm) e.confirm = "Please confirm your password";
  else if (a.confirm !== a.password) e.confirm = "Passwords do not match";
  return e;
}

export function Onboarding({ onCancel, onComplete, theme, onToggleTheme }: Props) {
  const [step, setStep] = useState<StepKey>("find-parish");

  // Frame 1: parish location
  const [parish, setParish] = useState<{
    state: string;
    query: string;
    results: CrmChurch[];
    selected: CrmChurch | null;
    searching: boolean;
    notListed: boolean;
    manualName: string;
  }>({
    state: "",
    query: "",
    results: [],
    selected: null,
    searching: false,
    notListed: false,
    manualName: "",
  });

  const [profile, setProfile] = useState({
    churchName: "",
    jurisdiction: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    timezone: "",
    size: "",
    referral: "",
  });
  const [modules, setModules] = useState({ baptism: true, marriage: true, funeral: false });
  const [admin, setAdmin] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
    secondAdmin: false,
  });

  // Reveals inline field errors once the user has attempted to advance past a
  // form step. Reset whenever the active step changes.
  const [triedNext, setTriedNext] = useState(false);

  const stepIndex = steps.findIndex((s) => s.key === step);

  const findParishComplete =
    parish.selected !== null ||
    (parish.notListed && parish.manualName.trim().length > 0);

  const profileErrors = getProfileErrors(profile);
  const adminErrors = getAdminErrors(admin);
  const profileComplete = Object.keys(profileErrors).length === 0;
  const adminComplete = Object.keys(adminErrors).length === 0;

  // find-parish drives the disabled state of Next; the form steps stay
  // clickable so pressing Next can surface their validation errors.
  const canProceed = step === "find-parish" ? findParishComplete : true;

  function goNext() {
    if (!canProceed) return;
    // Block advancing past a form step until its required fields are valid,
    // and reveal the inline errors.
    if (step === "profile" && !profileComplete) { setTriedNext(true); return; }
    if (step === "admin" && !adminComplete) { setTriedNext(true); return; }
    // Carry the chosen church forward into the profile step. Without this the
    // profile step keeps its seeded placeholder church name, so a user who
    // selected (or typed in) a different church sees the wrong name pre-filled.
    if (step === "find-parish") {
      if (parish.selected) {
        const c = parish.selected;
        setProfile((p) => ({
          ...p,
          churchName: c.name,
          jurisdiction: c.jurisdiction || "",
          city: c.city || "",
          state: c.state_code || "",
        }));
      } else if (parish.notListed && parish.manualName.trim()) {
        setProfile((p) => ({
          ...p,
          churchName: parish.manualName.trim(),
          // A church the CRM doesn't know about — clear the placeholder
          // location fields so the user enters their own, not another church's.
          jurisdiction: "",
          city: "",
          state: "",
        }));
      }
    }
    if (stepIndex < steps.length - 1) {
      setTriedNext(false);
      setStep(steps[stepIndex + 1].key);
    }
  }
  function goBack() {
    setTriedNext(false);
    if (stepIndex > 0) setStep(steps[stepIndex - 1].key);
    else onCancel();
  }

  const selectedModules = Object.entries(modules).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/frontend-pages/homepage" className="flex items-center no-underline">
            <img src="/images/logos/logo-top.svg" alt="Orthodox Metrics" className="h-10 w-auto object-contain dark:hidden" />
            <img src="/images/logos/logo-top-dark.svg" alt="Orthodox Metrics" className="h-10 w-auto object-contain hidden dark:block" />
          </a>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden md:inline-flex">
              <Save className="h-3 w-3 mr-1" /> Draft saved · 2 min ago
            </Badge>
            <Button variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[260px_1fr] gap-10">
        <aside>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Onboarding Wizard
          </div>
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => { if (i <= stepIndex) { setTriedNext(false); setStep(s.key); } }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors ${
                      active
                        ? "bg-[#2d1b4e] dark:bg-[#1e2a3a] dark:border-l-2 dark:border-l-[#d4af37] text-white"
                        : done
                          ? "text-foreground hover:bg-muted dark:hover:bg-[#1e2a3a]/60"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        active
                          ? "bg-[#d4af37] text-[#2d1b4e]"
                          : done
                            ? "bg-[#d4af37]/30 text-[#2d1b4e] dark:text-[#d4af37]"
                            : "border border-border"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                    </span>
                    <div>
                      <div className="text-xs opacity-70">Step {s.n}</div>
                      <div className="text-sm">{s.label}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="space-y-6">
          {step === "find-parish" && (
            <FindParishStep parish={parish} setParish={setParish} />
          )}
          {step === "profile" && (
            <ProfileStep profile={profile} setProfile={setProfile} errors={profileErrors} showErrors={triedNext} />
          )}
          {step === "modules" && (
            <ModulesStep modules={modules} setModules={setModules} />
          )}
          {step === "admin" && (
            <AdminStep admin={admin} setAdmin={setAdmin} errors={adminErrors} showErrors={triedNext} />
          )}
          {step === "review" && (
            <ReviewStep
              profile={profile}
              modules={selectedModules}
              admin={admin}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              profile={profile}
              modules={selectedModules}
              admin={admin}
              onDashboard={onComplete}
              onHome={onCancel}
            />
          )}

          {triedNext &&
            ((step === "profile" && !profileComplete) ||
              (step === "admin" && !adminComplete)) && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5 text-sm text-destructive">
                <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Please complete the required fields highlighted above before continuing.</span>
              </div>
            )}

          {step !== "confirm" && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canProceed}
                  className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium px-6"
                >
                  {step === "review" ? "Submit Provision Request" : "Next"}{" "}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1 border-b border-border pb-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Step {number}
          </div>
          <h2 className="font-['Georgia'] text-xl text-[#2d1b4e] dark:text-[#d4af37]" style={{ fontWeight: 400 }}>{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Req() {
  return <span className="text-destructive ml-0.5">*</span>;
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <Req />}
      </Label>
      {children}
      {error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : (
        hint && <div className="text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function FindParishStep({
  parish,
  setParish,
}: {
  parish: {
    state: string;
    query: string;
    results: CrmChurch[];
    selected: CrmChurch | null;
    searching: boolean;
    notListed: boolean;
    manualName: string;
  };
  setParish: React.Dispatch<React.SetStateAction<any>>;
}) {
  const { state, query, results, selected, searching, notListed, manualName } = parish;
  const update = (patch: Partial<typeof parish>) => setParish((p: any) => ({ ...p, ...patch }));

  // Live church search: debounced fetch against OM public API.
  // In Workshop preview the API isn't reachable — fail soft and surface
  // the "I don't see my church" manual path.
  useEffect(() => {
    if (!state) {
      update({ results: [], selected: null });
      return;
    }
    let cancelled = false;
    update({ searching: true });
    const params = new URLSearchParams({ state });
    if (query.trim().length >= 2) params.set("q", query.trim());
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/church-search?${params}`);
        const data = await res.json();
        if (cancelled) return;
        update({
          results: data?.success ? (data.churches ?? []) : [],
          searching: false,
        });
      } catch {
        if (cancelled) return;
        update({ results: [], searching: false });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, query]);

  return (
    <SectionCard
      number={1}
      title="Find Your Parish"
      description="Tell us which Orthodox parish you serve. We use this to match you to the right diocese and pre-fill what we already know."
    >
      <div className="space-y-5">
        <Field label="State" required>
          <Select
            value={state}
            onValueChange={(v) =>
              update({ state: v, query: "", selected: null, notListed: false, manualName: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your state…" />
            </SelectTrigger>
            <SelectContent>
              {STATE_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {STATE_NAMES[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {state && !notListed && (
          <Field
            label="Parish name"
            required
            hint="Start typing to search Orthodox parishes in your state."
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={selected ? selected.name : query}
                onChange={(e) => update({ query: e.target.value, selected: null })}
                placeholder="e.g. Holy Trinity"
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {!selected && query.length >= 2 && (
              <div className="mt-2 rounded-md border border-border overflow-hidden">
                {results.length === 0 && !searching ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No parishes found. Try a different spelling or use{" "}
                    <em>I don't see my church</em> below.
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto divide-y divide-border">
                    {results.slice(0, 8).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => update({ selected: c })}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                        >
                          <div className="text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.city}, {c.state_code} · {c.jurisdiction}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
        )}

        {selected && (
          <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <Check className="h-4 w-4 mt-0.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
            <div className="flex-1">
              <div className="text-sm">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                {selected.city}, {selected.state_code} · {selected.jurisdiction}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ selected: null, query: "" })}
            >
              Change
            </Button>
          </div>
        )}

        {state && !selected && (
          <div>
            <Button
              type="button"
              variant={notListed ? "outline" : "ghost"}
              size="sm"
              onClick={() =>
                update({ notListed: !notListed, query: "", results: [] })
              }
            >
              <Building2 className="h-3.5 w-3.5 mr-2" />
              {notListed ? "Cancel — search the list" : "I don't see my church"}
            </Button>
            {notListed && (
              <div className="mt-3">
                <Field
                  label="Enter your parish name"
                  required
                  hint="We'll add it to the directory after we verify with you."
                >
                  <Input
                    value={manualName}
                    onChange={(e) => update({ manualName: e.target.value })}
                    placeholder="e.g. SS Peter & Paul Orthodox Church"
                  />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(212,175,55,0.08)] dark:bg-[rgba(30,42,58,0.8)] border border-[#d4af37]/25 dark:border-white/8 text-sm">
        <MapPin className="h-4 w-4 mt-0.5 text-[#2d1b4e] dark:text-[#d4af37] shrink-0" />
        <div>
          We pull from the Orthodox Metrics parish directory. If your church
          isn't there yet, choose <em>I don't see my church</em> — we'll add it.
        </div>
      </div>
    </SectionCard>
  );
}

function ProfileStep({ profile, setProfile, errors = {}, showErrors = false }: any) {
  const set = (k: string, v: string) => setProfile({ ...profile, [k]: v });
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  return (
    <SectionCard
      number={2}
      title="Church Profile"
      description="Tell us about your parish. These details help Orthodox Metrics provision your workspace and tailor your records."
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Church name" required error={err("churchName")}>
          <Input value={profile.churchName} onChange={(e) => set("churchName", e.target.value)} />
        </Field>
        <Field label="Jurisdiction" required error={err("jurisdiction")}>
          <Select value={profile.jurisdiction} onValueChange={(v) => set("jurisdiction", v)}>
            <SelectTrigger><SelectValue placeholder="Select jurisdiction…" /></SelectTrigger>
            <SelectContent>
              {[
                "Greek Orthodox Archdiocese of America",
                "Orthodox Church in America (OCA)",
                "Antiochian Orthodox Christian Archdiocese",
                "Serbian Orthodox Church",
                "Russian Orthodox Church Outside Russia",
                "Romanian Orthodox Archdiocese",
                "Other",
              ].map((j) => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Parish contact first name" required error={err("firstName")}>
          <Input value={profile.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Parish contact last name" required error={err("lastName")}>
          <Input value={profile.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Contact email" required hint="Used for provisioning updates." error={err("email")}>
          <Input type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={profile.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Website">
          <Input value={profile.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Field label="Church size">
          <Select value={profile.size} onValueChange={(v) => set("size", v)}>
            <SelectTrigger><SelectValue placeholder="Select church size…" /></SelectTrigger>
            <SelectContent>
              {["Under 100", "100–200", "200–500", "500–1000", "1000+"].map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Address" required error={err("address")}>
          <Input value={profile.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="City" required error={err("city")}>
          <Input value={profile.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="State / Province" required error={err("state")}>
          <Input value={profile.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field label="Postal code" required error={err("zip")}>
          <Input value={profile.zip} onChange={(e) => set("zip", e.target.value)} />
        </Field>
        <Field label="Country" required error={err("country")}>
          <Input value={profile.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="Timezone" required error={err("timezone")}>
          <Select value={profile.timezone} onValueChange={(v) => set("timezone", v)}>
            <SelectTrigger><SelectValue placeholder="Select timezone…" /></SelectTrigger>
            <SelectContent>
              {[
                "America/New_York",
                "America/Chicago",
                "America/Denver",
                "America/Los_Angeles",
                "Europe/Athens",
                "Europe/Bucharest",
              ].map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Referral source">
          <Input value={profile.referral} onChange={(e) => set("referral", e.target.value)} />
        </Field>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(212,175,55,0.08)] dark:bg-[rgba(30,42,58,0.8)] border border-[#d4af37]/25 dark:border-white/8 text-sm">
        <CircleAlert className="h-4 w-4 mt-0.5 text-[#2d1b4e] dark:text-[#d4af37] shrink-0" />
        <div>
          Required fields are marked with <Req />. Your draft is saved automatically every minute.
        </div>
      </div>
    </SectionCard>
  );
}

function ModulesStep({ modules, setModules }: any) {
  const cards = [
    {
      key: "baptism",
      icon: Droplets,
      title: "Baptism Records",
      desc: "Names, sponsors, clergy, and dates of holy baptism — searchable across decades.",
      recommended: true,
    },
    {
      key: "marriage",
      icon: HeartHandshake,
      title: "Marriage Records",
      desc: "Sacramental marriages with full witness, clergy, and dispensation details.",
      recommended: true,
    },
    {
      key: "funeral",
      icon: Flame,
      title: "Funeral Records",
      desc: "Honor the departed with organized funeral, burial, and memorial records.",
      recommended: false,
    },
  ] as const;
  const count = Object.values(modules).filter(Boolean).length;
  return (
    <SectionCard
      number={3}
      title="Record Module Selection"
      description="Choose the sacramental record books you want to digitize and manage. You can add more later."
    >
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const selected = modules[c.key];
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setModules({ ...modules, [c.key]: !selected })}
              className={`text-left rounded-lg border p-5 transition-all ${
                selected
                  ? "border-[#2d1b4e] dark:border-[#d4af37] ring-2 ring-[#2d1b4e]/15 dark:ring-[#d4af37]/20 bg-[rgba(45,27,78,0.05)] dark:bg-[rgba(212,175,55,0.06)]"
                  : "border-border hover:border-[#2d1b4e]/30"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-md bg-[#2d1b4e] dark:bg-[#1e2a3a] text-[#d4af37] flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                {c.recommended && (
                  <Badge className="bg-[#d4af37] text-[#2d1b4e] border-transparent">
                    Recommended
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <div>{c.title}</div>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selected ? "Selected" : "Tap to select"}
                </span>
                <span
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    selected
                      ? "bg-[#2d1b4e] dark:bg-[#d4af37] border-[#2d1b4e] dark:border-[#d4af37] text-white dark:text-[#2d1b4e]"
                      : "border-border"
                  }`}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-md bg-muted">
        <div className="text-sm">
          <span className="text-muted-foreground">Selected modules: </span>
          <strong>{count}</strong> of 3
        </div>
        <div className="flex gap-2">
          {Object.entries(modules)
            .filter(([, v]) => v)
            .map(([k]) => (
              <Badge key={k} variant="outline" className="capitalize">
                {k}
              </Badge>
            ))}
        </div>
      </div>
    </SectionCard>
  );
}

function AdminStep({ admin, setAdmin, errors = {}, showErrors = false }: any) {
  const set = (k: string, v: any) => setAdmin({ ...admin, [k]: v });
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  return (
    <SectionCard
      number={4}
      title="Admin Account Setup"
      description="Create the first church administrator. You can invite additional users after approval."
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Admin first name" required error={err("firstName")}>
          <Input value={admin.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Admin last name" required error={err("lastName")}>
          <Input value={admin.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Admin email" required error={err("email")}>
          <Input type="email" value={admin.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div />
        <Field
          label="Password"
          required
          hint="At least 12 characters, with one number and one symbol."
          error={err("password")}
        >
          <Input
            type="password"
            value={admin.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>
        <Field label="Confirm password" required error={err("confirm")}>
          <Input
            type="password"
            value={admin.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 rounded-md border border-border">
        <div className="space-y-1">
          <div>Invite a second administrator</div>
          <div className="text-sm text-muted-foreground">
            Recommended for parishes with more than one priest or records keeper.
          </div>
        </div>
        <Switch
          checked={admin.secondAdmin}
          onCheckedChange={(v) => set("secondAdmin", v)}
        />
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(212,175,55,0.08)] dark:bg-[rgba(30,42,58,0.8)] border border-[#d4af37]/25 dark:border-white/8 text-sm">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-[#2d1b4e] dark:text-[#d4af37] shrink-0" />
        <div>
          Your password is hashed and stored securely. Orthodox Metrics staff cannot read your
          password. You can change it at any time from Settings.
        </div>
      </div>
    </SectionCard>
  );
}

function ReviewStep({ profile, modules, admin }: any) {
  return (
    <SectionCard
      number={5}
      title="Review & Submit"
      description="Confirm your details below. Submitting will create a provision request for Orthodox Metrics staff to review."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <SummaryCard title="Church profile" icon={Building2}>
          <Row k="Church name" v={profile.churchName} />
          <Row k="Jurisdiction" v={profile.jurisdiction} />
          <Row k="Size" v={profile.size} />
          <Row k="Address" v={`${profile.address}, ${profile.city}, ${profile.state} ${profile.zip}`} />
          <Row k="Country" v={profile.country} />
          <Row k="Timezone" v={profile.timezone} />
        </SummaryCard>
        <SummaryCard title="Contact" icon={Mail}>
          <Row k="Name" v={`${profile.firstName} ${profile.lastName}`} />
          <Row k="Email" v={profile.email} />
          <Row k="Phone" v={profile.phone} />
          <Row k="Website" v={profile.website} />
          <Row k="Referral" v={profile.referral} />
        </SummaryCard>
        <SummaryCard title="Selected modules" icon={Droplets}>
          <div className="flex flex-wrap gap-2">
            {modules.length === 0 && (
              <span className="text-sm text-muted-foreground">None selected</span>
            )}
            {modules.map((m: string) => (
              <Badge key={m} variant="outline" className="capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </SummaryCard>
        <SummaryCard title="Admin account" icon={ShieldCheck}>
          <Row k="Name" v={`${admin.firstName} ${admin.lastName}`} />
          <Row k="Email" v={admin.email} />
          <Row k="Password" v="••••••••••••" />
          <Row k="Second admin" v={admin.secondAdmin ? "Yes — invite later" : "No"} />
        </SummaryCard>
      </div>

      <div className="p-4 rounded-lg bg-[rgba(45,27,78,0.05)] dark:bg-[rgba(30,42,58,0.8)] border border-[#2d1b4e]/20 dark:border-white/8 text-sm">
        <div className="mb-1">What happens next</div>
        <div className="text-muted-foreground">
          Orthodox Metrics staff will review your request within 1–2 business days. You'll get an
          email once your workspace is approved and ready for record uploads.
        </div>
      </div>
    </SectionCard>
  );
}

function ConfirmStep({ profile, modules, admin, onDashboard, onHome }: any) {
  const requestId = "OM-PROV-2026-0429";
  return (
    <SectionCard
      number={6}
      title="Submission Confirmation"
      description="Your provision request has been received."
    >
      <div className="flex flex-col items-center text-center py-6 space-y-4">
        <div className="h-16 w-16 rounded-full bg-[#2d1b4e] dark:bg-[#1e2a3a] dark:ring-2 dark:ring-[#d4af37]/40 text-[#d4af37] flex items-center justify-center">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h2 className="text-2xl">Thank you, {profile.firstName}.</h2>
        <p className="text-muted-foreground max-w-md">
          We've received your request for {profile.churchName}. Our staff will review it shortly.
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
          <span className="text-sm text-muted-foreground">Provision ID:</span>
          <code className="text-sm">{requestId}</code>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SummaryCard title="Submitted details" icon={Building2}>
          <Row k="Church" v={profile.churchName} />
          <Row k="Contact email" v={profile.email} />
          <Row k="Modules" v={modules.join(", ") || "None"} />
          <Row k="Admin" v={admin.email} />
        </SummaryCard>
        <SummaryCard title="What happens next" icon={ShieldCheck}>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>1. OM staff verifies your church and contact details.</li>
            <li>2. We provision your workspace and selected record modules.</li>
            <li>3. You receive an approval email with a sign-in link.</li>
            <li>4. Begin uploading your first batch of records.</li>
          </ul>
        </SummaryCard>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button variant="outline" onClick={onHome}>Return Home</Button>
        <Button onClick={onDashboard} className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium">
          Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </SectionCard>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-[#2d1b4e] dark:text-[#d4af37]" />
        <span>{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <div className="text-muted-foreground">{k}</div>
      <div className="break-words">{v}</div>
    </div>
  );
}
