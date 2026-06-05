import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    CircleAlert,
    Copy,
    Droplets,
    FileText,
    Flame,
    HeartHandshake,
    Loader2,
    Mail,
    MapPin,
    PartyPopper,
    Search,
    ShieldCheck,
    X
} from "lucide-react";
import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ParishGeoJSON } from "@/features/devel-tools/us-church-map/ParishDetailMap";
import { apiClient } from "@/api/utils/axiosInstance";
import { inferLocationFields, reconcileInferredLocation } from "../../lib/inferLocationFields";
import { Logo } from "../Logo";
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
const steps = [
  { key: "find-parish", label: "Find Your Parish", n: 1 },
  { key: "contact", label: "Your Contact", n: 2 },
  { key: "parish", label: "Parish Info", n: 3 },
  { key: "location", label: "Location", n: 4 },
  { key: "modules", label: "Record Modules", n: 5 },
] as const;

type WizardStepKey = (typeof steps)[number]["key"];
type StepKey = WizardStepKey | "confirm";

const IMPORT_METHOD_OPTIONS = [
  {
    value: "om_full_service",
    label: "Have Orthodox Metrics handle everything",
    description:
      "Our team manages digitization, OCR, and onboarding — you focus on approving records.",
  },
  {
    value: "self_service",
    label: "Self Service",
    description:
      "Your parish handles scanning records and uploading them through the platform.",
  },
] as const;

const START_TIMELINE_OPTIONS = [
  { value: "asap", label: "As Soon As Possible" },
  { value: "few_weeks", label: "A few weeks from now" },
  { value: "month_plus", label: "A month or more before I'm ready" },
] as const;

type ImportMethod = (typeof IMPORT_METHOD_OPTIONS)[number]["value"] | "";
type StartTimeline = (typeof START_TIMELINE_OPTIONS)[number]["value"] | "";

const MODULE_LABELS: Record<string, string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  funeral: "Funeral",
  custom: "Custom Records",
};

function formatImportMethod(value: ImportMethod): string {
  return IMPORT_METHOD_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function formatStartTimeline(value: StartTimeline): string {
  return START_TIMELINE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

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

const EnrollmentParishMap = lazy(() =>
  import("@/features/devel-tools/us-church-map/ParishDetailMap").then((m) => ({
    default: m.EnrollmentParishMap,
  }))
);

function getContactErrors(p: any): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(p.firstName ?? "").trim()) e.firstName = "First name is required";
  if (!String(p.lastName ?? "").trim()) e.lastName = "Last name is required";
  if (!String(p.email ?? "").trim()) e.email = "Email is required";
  else if (!EMAIL_RE.test(String(p.email).trim())) e.email = "Enter a valid email address";
  return e;
}

function getParishErrors(p: any): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(p.churchName ?? "").trim()) e.churchName = "Church name is required";
  return e;
}

function getModulesStepErrors(
  modules: Record<string, boolean>,
  importMethod: ImportMethod,
  startTimeline: StartTimeline,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Object.values(modules).some(Boolean)) {
    e.modules = "Select at least one record module.";
  }
  if (!importMethod) {
    e.importMethod = "Choose how you want to import your records.";
  }
  if (!startTimeline) {
    e.startTimeline = "Let us know when you hope to get started.";
  }
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
  const [modules, setModules] = useState({
    baptism: true,
    marriage: true,
    funeral: false,
    custom: false,
  });
  const [importMethod, setImportMethod] = useState<ImportMethod>("");
  const [startTimeline, setStartTimeline] = useState<StartTimeline>("");

  // Reveals inline field errors once the user has attempted to advance past a
  // form step. Reset whenever the active step changes.
  const [triedNext, setTriedNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    inquiryId: number;
    leadId: number;
  } | null>(null);

  // Location auto-fill: remembers where each inferred field's value came from
  // ("city_state" | "address" | "user") so we never clobber a user edit — the
  // one exception being a city/state change, which intentionally re-infers.
  const [locSource, setLocSource] = useState<
    Partial<Record<"country" | "timezone" | "zip", "city_state" | "address" | "user">>
  >({});
  // Read the latest source inside the effect without making it a dependency
  // (so the effect only re-runs on real city/state/address changes).
  const locSourceRef = useRef(locSource);
  locSourceRef.current = locSource;
  const prevCityStateRef = useRef({ city: "", state: "" });

  useEffect(() => {
    const { city, state, address } = profile;
    const inferred = inferLocationFields({ city, state, address, country: profile.country });
    const cityStateChanged =
      city !== prevCityStateRef.current.city || state !== prevCityStateRef.current.state;
    prevCityStateRef.current = { city, state };

    const { values: valueUpdates, sources: sourceUpdates } = reconcileInferredLocation(
      inferred,
      locSourceRef.current,
      { cityStateChanged },
    );

    if (Object.keys(valueUpdates).length) {
      setProfile((p) => ({ ...p, ...valueUpdates }));
      setLocSource(sourceUpdates);
    }
    // Only city/state/address drive re-inference; locSource is read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.city, profile.state, profile.address]);

  // Mark a location field as user-owned so inference won't overwrite it
  // (until the user changes city/state, which resets inference).
  const markLocationUserEdited = (field: "country" | "timezone" | "zip") =>
    setLocSource((s) => ({ ...s, [field]: "user" }));

  const stepIndex = steps.findIndex((s) => s.key === step);

  const findParishComplete =
    parish.selected !== null ||
    (parish.notListed && parish.manualName.trim().length > 0);

  const contactErrors = getContactErrors(profile);
  const parishErrors = getParishErrors(profile);
  const modulesErrors = getModulesStepErrors(modules, importMethod, startTimeline);
  const contactComplete = Object.keys(contactErrors).length === 0;
  const parishComplete = Object.keys(parishErrors).length === 0;
  const modulesComplete = Object.keys(modulesErrors).length === 0;

  // find-parish drives the disabled state of Next; the form steps stay
  // clickable so pressing Next can surface their validation errors.
  const canProceed = step === "find-parish" ? findParishComplete : true;

  async function submitEnrollment() {
    setSubmitError("");
    setSubmitting(true);
    try {
      const data = await apiClient.post<{
        success: boolean;
        message?: string;
        reference?: string;
        inquiryId?: number;
        leadId?: number;
      }>("/crm-public/enroll", {
        churchId: parish.selected?.id ?? null,
        churchName: profile.churchName.trim(),
        stateCode: parish.state || profile.state || null,
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim() || null,
        website: profile.website.trim() || null,
        address: profile.address.trim(),
        city: profile.city.trim(),
        state: profile.state.trim(),
        zip: profile.zip.trim(),
        country: profile.country.trim(),
        timezone: profile.timezone.trim(),
        jurisdiction: profile.jurisdiction.trim(),
        parishSize: profile.size.trim() || null,
        referral: profile.referral.trim() || null,
        modules,
        recordImportMethod: importMethod || null,
        startTimeline: startTimeline || null,
        adminFirstName: profile.firstName.trim(),
        adminLastName: profile.lastName.trim(),
        adminEmail: profile.email.trim(),
        secondAdmin: false,
      });
      if (!data.success) {
        setSubmitError(data.message || "Submission failed. Please try again.");
        return;
      }
      setConfirmation({
        reference: data.reference || `OM-ENR-${data.inquiryId}`,
        inquiryId: data.inquiryId ?? 0,
        leadId: data.leadId ?? 0,
      });
      setTriedNext(false);
      setStep("confirm");
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Network error. Please try again later.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!canProceed || submitting) return;
    // Block advancing past a form step until its required fields are valid,
    // and reveal the inline errors.
    if (step === "contact" && !contactComplete) { setTriedNext(true); return; }
    if (step === "parish" && !parishComplete) { setTriedNext(true); return; }
    if (step === "modules") {
      if (!modulesComplete) { setTriedNext(true); return; }
      void submitEnrollment();
      return;
    }
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
    if (step === "confirm") {
      setStep("modules");
      return;
    }
    if (stepIndex > 0) setStep(steps[stepIndex - 1].key);
    else onCancel();
  }

  const selectedModules = Object.entries(modules)
    .filter(([, v]) => v)
    .map(([k]) => MODULE_LABELS[k] ?? k);
  const showWizardSteps = step !== "confirm";

  const stepButtonClass = (done: boolean, active: boolean) =>
    active
      ? "bg-[#2d1b4e] dark:bg-[#1e2a3a] dark:border-l-2 dark:border-l-[#d4af37] text-white"
      : done
        ? "text-foreground hover:bg-muted dark:hover:bg-[#1e2a3a]/60"
        : "text-muted-foreground";

  const stepBadgeClass = (done: boolean, active: boolean) =>
    active
      ? "bg-[#d4af37] text-[#2d1b4e]"
      : done
        ? "bg-[#d4af37]/30 text-[#2d1b4e] dark:text-[#d4af37]"
        : "border border-border";

  return (
    <div className="flex-1 w-full bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center no-underline">
            <Logo colorScheme={theme} size="md" />
          </a>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto px-6 py-6 lg:py-10 w-full">
        {showWizardSteps && (
        <nav
          className="lg:hidden -mx-6 px-4 mb-6 overflow-x-auto overscroll-x-contain"
          aria-label="Enrollment progress"
        >
          <ol className="flex gap-2 min-w-max pb-1">
            {steps.map((s, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={s.key} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => { if (i <= stepIndex) { setTriedNext(false); setStep(s.key); } }}
                    disabled={i > stepIndex}
                    aria-current={active ? "step" : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-left transition-colors whitespace-nowrap ${stepButtonClass(done, active)} ${
                      i > stepIndex ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 ${stepBadgeClass(done, active)}`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                    </span>
                    <span className="text-xs font-medium max-w-[7rem] truncate sm:max-w-none">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        )}

        <div className="grid lg:grid-cols-[260px_1fr] gap-10">
        {showWizardSteps && (
        <aside className="hidden lg:block">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Onboarding Wizard
          </div>
          <p className="font-['Inter'] text-[13px] text-muted-foreground mb-3">
            Step {stepIndex + 1} of {steps.length} · about 5 minutes
          </p>
          <p className="font-['Inter'] text-[12px] text-muted-foreground mb-3">
            <a href="mailto:support@orthodoxmetrics.com" className="text-[#2d1b4e] dark:text-[#d4af37] no-underline hover:underline">
              support@orthodoxmetrics.com
            </a>
          </p>
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => { if (i <= stepIndex) { setTriedNext(false); setStep(s.key); } }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors ${stepButtonClass(done, active)}`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 ${stepBadgeClass(done, active)}`}
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
        )}

        <div className="space-y-6 min-w-0">
          {step === "find-parish" && (
            <FindParishStep parish={parish} setParish={setParish} theme={theme} />
          )}
          {step === "contact" && (
            <ContactStep profile={profile} setProfile={setProfile} errors={contactErrors} showErrors={triedNext} />
          )}
          {step === "parish" && (
            <ParishInfoStep profile={profile} setProfile={setProfile} errors={parishErrors} showErrors={triedNext} />
          )}
          {step === "location" && (
            <LocationStep
              profile={profile}
              setProfile={setProfile}
              locSource={locSource}
              markLocationUserEdited={markLocationUserEdited}
            />
          )}
          {step === "modules" && (
            <ModulesStep
              modules={modules}
              setModules={setModules}
              importMethod={importMethod}
              setImportMethod={setImportMethod}
              startTimeline={startTimeline}
              setStartTimeline={setStartTimeline}
              errors={modulesErrors}
              showErrors={triedNext}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              profile={profile}
              modules={selectedModules}
              importMethod={importMethod}
              startTimeline={startTimeline}
              reference={confirmation?.reference ?? ""}
              onHome={onCancel}
            />
          )}

          {submitError && step === "modules" && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5 text-sm text-destructive">
              <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {triedNext &&
            ((step === "contact" && !contactComplete) ||
              (step === "parish" && !parishComplete) ||
              (step === "modules" && !modulesComplete)) && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5 text-sm text-destructive">
                <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div>Please complete the required fields highlighted above before continuing.</div>
                  {step === "modules" && !modulesComplete && (
                    <ul className="mt-2 list-disc pl-4 space-y-0.5">
                      {Object.values(modulesErrors).map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

          {step !== "confirm" && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {step === "location" && (
                  <Button variant="outline" onClick={goNext}>
                    Skip for now
                  </Button>
                )}
                <Button
                  onClick={goNext}
                  disabled={!canProceed || submitting}
                  className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium px-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      {step === "modules"
                        ? "Submit Enrollment"
                        : step === "location"
                          ? "Continue"
                          : "Next"}{" "}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      <SiteFooter />
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
  theme,
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
  theme: "light" | "dark";
}) {
  const { state, query, results, selected, searching, notListed, manualName } = parish;
  const update = (patch: Partial<typeof parish>) => setParish((p: any) => ({ ...p, ...patch }));
  const [geoData, setGeoData] = useState<ParishGeoJSON | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  function selectParishById(id: number) {
    const fromList = results.find((c) => c.id === id);
    if (fromList) {
      update({ selected: fromList, query: fromList.name, notListed: false });
      return;
    }
    const feature = geoData?.features.find((f) => f.properties.id === id);
    if (feature) {
      update({
        selected: {
          id: feature.properties.id,
          name: feature.properties.name,
          city: feature.properties.city || "",
          state_code: feature.properties.state || state,
          jurisdiction: feature.properties.affiliation || feature.properties.affiliation_normalized || "",
        },
        query: feature.properties.name,
        notListed: false,
      });
    }
  }

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

  useEffect(() => {
    if (!state) {
      setGeoData(null);
      return;
    }
    let cancelled = false;
    setGeoLoading(true);
    fetch(`/api/crm-public/parishes-geo?state=${encodeURIComponent(state)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.type === "FeatureCollection") {
          setGeoData(data as ParishGeoJSON);
        } else {
          setGeoData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setGeoData(null);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <SectionCard
      number={1}
      title="Find Your Parish"
      description="Select your state, then pick your parish on the map or search by name. We match you to our CRM directory and pre-fill your profile."
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
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Parish map
              <span className="text-destructive ml-0.5">*</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Zoom and tap a pin, or search by name below. Pins use our CRM parish directory.
            </p>
            <div className="rounded-md border border-border overflow-hidden bg-muted/30">
              {geoLoading ? (
                <div className="flex items-center justify-center gap-2 h-[340px] text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading map…
                </div>
              ) : geoData ? (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-[340px] text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading map…
                    </div>
                  }
                >
                  <EnrollmentParishMap
                    geoData={geoData}
                    selectedParishId={selected?.id ?? null}
                    nameQuery={selected ? "" : query}
                    colorScheme={theme}
                    stateCode={state}
                    onSelectParish={selectParishById}
                  />
                </Suspense>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Map unavailable. Use parish search below.
                </div>
              )}
            </div>
          </div>
        )}

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
                          onClick={() => selectParishById(c.id)}
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
          Parishes shown on the map come from the Orthodox Metrics CRM directory.
          If yours is not listed, choose <em>I don&apos;t see my church</em> and we will verify it with you.
        </div>
      </div>
    </SectionCard>
  );
}

function ContactStep({
  profile,
  setProfile,
  errors = {},
  showErrors = false,
}: any) {
  const set = (k: string, v: string) => setProfile({ ...profile, [k]: v });
  const err = (k: string) => (showErrors ? errors[k] : undefined);

  return (
    <SectionCard
      number={2}
      title="Your Contact"
      description="Who should we reach about this enrollment? Just the basics — we will ask for parish details next."
    >
      <div className="grid md:grid-cols-2 gap-5 max-w-xl">
        <Field label="First name" required error={err("firstName")}>
          <Input value={profile.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
        </Field>
        <Field label="Last name" required error={err("lastName")}>
          <Input value={profile.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Email" required hint="We send approval and onboarding updates here." error={err("email")}>
            <Input type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}

function ParishInfoStep({
  profile,
  setProfile,
  errors = {},
  showErrors = false,
}: any) {
  const set = (k: string, v: string) => setProfile({ ...profile, [k]: v });
  const err = (k: string) => (showErrors ? errors[k] : undefined);

  return (
    <SectionCard
      number={3}
      title="Parish Info"
      description="Confirm your church name and add optional details. Jurisdiction and size help us route your request."
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Church name" required error={err("churchName")}>
          <Input value={profile.churchName} onChange={(e) => set("churchName", e.target.value)} />
        </Field>
        <Field label="Jurisdiction" hint="Optional — select if you know it.">
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
        <Field label="Phone" hint="Optional">
          <Input value={profile.phone} onChange={(e) => set("phone", e.target.value)} type="tel" />
        </Field>
        <Field label="Website" hint="Optional">
          <Input value={profile.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Field label="Approximate church size" hint="Optional">
          <Select value={profile.size} onValueChange={(v) => set("size", v)}>
            <SelectTrigger><SelectValue placeholder="Select church size…" /></SelectTrigger>
            <SelectContent>
              {["Under 100", "100–200", "200–500", "500–1000", "1000+"].map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="How did you hear about us?" hint="Optional">
          <Input value={profile.referral} onChange={(e) => set("referral", e.target.value)} />
        </Field>
      </div>
    </SectionCard>
  );
}

function LocationStep({
  profile,
  setProfile,
  locSource = {},
  markLocationUserEdited = () => {},
}: any) {
  const set = (k: string, v: string) => setProfile({ ...profile, [k]: v });
  const setLoc = (k: "country" | "timezone" | "zip", v: string) => {
    setProfile({ ...profile, [k]: v });
    markLocationUserEdited(k);
  };

  const zipSuggested = locSource.zip === "city_state";
  const zipAlternatives: string[] =
    inferLocationFields({ city: profile.city, state: profile.state, address: profile.address }).zip
      ?.alternatives ?? [];

  const TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Phoenix",
    "America/Los_Angeles",
    "America/Anchorage",
    "America/Adak",
    "Pacific/Honolulu",
    "Europe/Athens",
    "Europe/Bucharest",
  ];
  const tzOptions =
    profile.timezone && !TIMEZONES.includes(profile.timezone)
      ? [profile.timezone, ...TIMEZONES]
      : TIMEZONES;

  return (
    <SectionCard
      number={4}
      title="Location"
      description="Optional now — add your parish address when you have it, or skip and continue. You can update this after approval."
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Street address" hint="Optional">
          <Input value={profile.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="City" hint="Optional">
          <Input value={profile.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="State / Province" hint="Optional">
          <Input value={profile.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field
          label="Postal code"
          hint={zipSuggested ? "Suggested from city/state — confirm or change." : "Optional"}
        >
          <Input
            list="enroll-zip-suggestions"
            value={profile.zip}
            onChange={(e) => setLoc("zip", e.target.value)}
            className={
              zipSuggested
                ? "border-amber-400 ring-2 ring-amber-300/50 bg-amber-50/60 dark:border-amber-500/70 dark:bg-amber-900/15"
                : undefined
            }
          />
          {zipAlternatives.length > 0 && (
            <datalist id="enroll-zip-suggestions">
              {zipAlternatives.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          )}
        </Field>
        <Field label="Country" hint="Optional">
          <Input value={profile.country} onChange={(e) => setLoc("country", e.target.value)} />
        </Field>
        <Field label="Timezone" hint="Optional">
          <Select value={profile.timezone} onValueChange={(v) => setLoc("timezone", v)}>
            <SelectTrigger><SelectValue placeholder="Select timezone…" /></SelectTrigger>
            <SelectContent>
              {tzOptions.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </SectionCard>
  );
}

function ModulesStep({
  modules,
  setModules,
  importMethod,
  setImportMethod,
  startTimeline,
  setStartTimeline,
  errors = {},
  showErrors = false,
}: {
  modules: Record<string, boolean>;
  setModules: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  importMethod: ImportMethod;
  setImportMethod: (v: ImportMethod) => void;
  startTimeline: StartTimeline;
  setStartTimeline: (v: StartTimeline) => void;
  errors?: Record<string, string>;
  showErrors?: boolean;
}) {
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
    {
      key: "custom",
      icon: FileText,
      title: "Custom Records",
      desc: "Other parish registers, historical ledgers, or record types tailored to your needs.",
      recommended: false,
    },
  ] as const;
  const count = Object.values(modules).filter(Boolean).length;
  const moduleErr = showErrors ? errors.modules : undefined;
  const importErr = showErrors ? errors.importMethod : undefined;
  const timelineErr = showErrors ? errors.startTimeline : undefined;

  return (
    <SectionCard
      number={5}
      title="Record Modules & Next Steps"
      description="Choose the records you want to manage, how you'd like to import them, and when you hope to begin."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const selected = modules[c.key];
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
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

      {moduleErr && (
        <p className="text-sm text-destructive" role="alert">{moduleErr}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-md bg-muted">
        <div className="text-sm">
          <span className="text-muted-foreground">Selected modules: </span>
          <strong>{count}</strong> of {cards.length}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(modules)
            .filter(([, v]) => v)
            .map(([k]) => (
              <Badge key={k} variant="outline">
                {MODULE_LABELS[k] ?? k}
              </Badge>
            ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <Label className="text-base">
          How do you want to import your records? <span className="text-destructive">*</span>
        </Label>
        <div className="grid md:grid-cols-2 gap-4" role="radiogroup" aria-invalid={!!importErr}>
          {IMPORT_METHOD_OPTIONS.map((opt) => {
            const selected = importMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setImportMethod(opt.value)}
                className={`text-left rounded-lg border p-5 transition-all ${
                  selected
                    ? "border-[#2d1b4e] dark:border-[#d4af37] ring-2 ring-[#2d1b4e]/15 dark:ring-[#d4af37]/20 bg-[rgba(45,27,78,0.05)] dark:bg-[rgba(212,175,55,0.06)]"
                    : "border-border hover:border-[#2d1b4e]/30"
                }`}
              >
                <div className="font-medium mb-2">{opt.label}</div>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </button>
            );
          })}
        </div>
        {importErr && <p className="text-sm text-destructive" role="alert">{importErr}</p>}
      </div>

      <div className="space-y-3 pt-2">
        <Label className="text-base">
          How soon are you interested in getting started? <span className="text-destructive">*</span>
        </Label>
        <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-invalid={!!timelineErr}>
          {START_TIMELINE_OPTIONS.map((opt) => {
            const selected = startTimeline === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setStartTimeline(opt.value)}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                  selected
                    ? "border-[#2d1b4e] dark:border-[#d4af37] bg-[#2d1b4e] text-white dark:bg-[#1e2a3a] dark:text-[#d4af37]"
                    : "border-border hover:border-[#2d1b4e]/30"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {timelineErr && <p className="text-sm text-destructive" role="alert">{timelineErr}</p>}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(212,175,55,0.08)] dark:bg-[rgba(30,42,58,0.8)] border border-[#d4af37]/25 dark:border-white/8 text-sm">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-[#2d1b4e] dark:text-[#d4af37] shrink-0" />
        <div>
          Click <strong>Submit Enrollment</strong> when you're ready. Our team will follow up using
          the contact details you provided.
        </div>
      </div>
    </SectionCard>
  );
}

function ConfirmStep({
  profile,
  modules,
  importMethod,
  startTimeline,
  reference,
  onHome,
}: {
  profile: any;
  modules: string[];
  importMethod: ImportMethod;
  startTimeline: StartTimeline;
  reference: string;
  onHome: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const requestId = reference || "—";

  function copyReference() {
    if (!requestId || requestId === "—") return;
    void navigator.clipboard.writeText(requestId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <SectionCard
      number={5}
      title="Submission Confirmation"
      description="Your enrollment request has been received."
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
          <span className="text-sm text-muted-foreground">Reference:</span>
          <code className="text-sm">{requestId}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={copyReference}
            disabled={!reference}
            title="Copy reference"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {copied && <span className="text-xs text-muted-foreground">Copied</span>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SummaryCard title="Submitted details" icon={Building2}>
          <Row k="Church" v={profile.churchName} />
          <Row k="Contact email" v={profile.email} />
          <Row k="Modules" v={modules.join(", ") || "None"} />
          <Row k="Import approach" v={formatImportMethod(importMethod)} />
          <Row k="Getting started" v={formatStartTimeline(startTimeline)} />
        </SummaryCard>
        <SummaryCard title="What happens next" icon={ShieldCheck}>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>1. OM staff verifies your church and contact details.</li>
            <li>2. We review your module selections and import preferences.</li>
            <li>3. You receive a follow-up email to schedule onboarding.</li>
            <li>4. Your workspace is provisioned when you're ready to begin.</li>
          </ul>
        </SummaryCard>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button variant="outline" onClick={onHome}>Return Home</Button>
        <Button asChild className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium">
          <a href="/auth/login">Sign in when your account is ready</a>
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
