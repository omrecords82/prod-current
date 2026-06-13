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
    Home,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Search,
    ShieldCheck,
    X
} from "lucide-react";
import { motion } from "framer-motion";
import { lazy, Suspense, useContext, useEffect, useRef, useState } from "react";
import { CustomizerContext } from "@/context/CustomizerContext";
import type { ParishGeoJSON } from "@/features/devel-tools/us-church-map/ParishDetailMap";
import { apiClient } from "@/api/utils/axiosInstance";
import { inferLocationFields, reconcileInferredLocation } from "../../lib/inferLocationFields";
import {
  useEnrollmentCopy,
  validateContactFields,
  validateModulesFields,
  validateParishFields,
} from "../../enrollmentCopy";
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
type WizardStepKey = "find-parish" | "contact" | "parish" | "location" | "modules";
type StepKey = WizardStepKey | "confirm";
type ImportMethod = "om_full_service" | "self_service" | "";
type StartTimeline = "asap" | "few_weeks" | "month_plus" | "";
type EnrollmentCopy = ReturnType<typeof useEnrollmentCopy>;

type Props = {
  onCancel: () => void;
  onComplete: () => void;
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

const EnrollmentParishMap = lazy(() =>
  import("@/features/devel-tools/us-church-map/ParishDetailMap").then((m) => ({
    default: m.EnrollmentParishMap,
  }))
);

const MODULE_ICONS: Record<string, typeof Droplets> = {
  baptism: Droplets,
  marriage: HeartHandshake,
  funeral: Flame,
  custom: FileText,
};

export function Onboarding({ onCancel, onComplete }: Props) {
  const copy = useEnrollmentCopy();
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

  const stepIndex = copy.wizardSteps.findIndex((s) => s.key === step);

  const findParishComplete =
    parish.selected !== null ||
    (parish.notListed && parish.manualName.trim().length > 0);

  const contactErrors = validateContactFields(profile, copy.t);
  const parishErrors = validateParishFields(profile, copy.t);
  const modulesErrors = validateModulesFields(modules, importMethod, startTimeline, copy.t);
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
        onboarding_request_id?: string;
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
        setSubmitError(data.message || copy.errors.submitFailed);
        return;
      }
      setConfirmation({
        reference: data.onboarding_request_id || data.reference || "",
      });
      setTriedNext(false);
      setStep("confirm");
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : copy.errors.network;
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
    if (stepIndex < copy.wizardSteps.length - 1) {
      setTriedNext(false);
      setStep(copy.wizardSteps[stepIndex + 1].key);
    }
  }
  function goBack() {
    setTriedNext(false);
    if (step === "confirm") {
      setStep("modules");
      return;
    }
    if (stepIndex > 0) setStep(copy.wizardSteps[stepIndex - 1].key);
    else onCancel();
  }

  const selectedModules = Object.entries(modules)
    .filter(([, v]) => v)
    .map(([k]) => copy.moduleLabels[k] ?? k);
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
    <div className="flex-1 w-full bg-background text-foreground flex flex-col om-section-base">
      <div className="max-w-7xl mx-auto px-6 pt-4 w-full flex justify-end shrink-0">
        <Button variant="ghost" onClick={onCancel} className="font-om-body">
          <X className="h-4 w-4 mr-2" /> {copy.nav.cancel}
        </Button>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-6 py-4 lg:py-8 w-full">
        {step === "confirm" ? (
          <ConfirmStep
            copy={copy}
            profile={profile}
            modules={selectedModules}
            importMethod={importMethod}
            startTimeline={startTimeline}
            reference={confirmation?.reference ?? ""}
            onHome={onCancel}
          />
        ) : (
        <>
        {showWizardSteps && (
        <nav
          className="lg:hidden -mx-6 px-4 mb-6 overflow-x-auto overscroll-x-contain"
          aria-label={copy.wizard.progressAria}
        >
          <ol className="flex gap-2 min-w-max pb-1">
            {copy.wizardSteps.map((s, i) => {
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
            {copy.wizard.title}
          </div>
          <p className="font-['Inter'] text-[13px] text-muted-foreground mb-3">
            {copy.wizardProgress(stepIndex + 1, copy.wizardSteps.length)} · {copy.wizard.duration}
          </p>
          <p className="font-['Inter'] text-[12px] text-muted-foreground mb-3">
            <a href="mailto:info@orthodoxmetrics.com" className="text-[#2d1b4e] dark:text-[#d4af37] no-underline hover:underline">
              info@orthodoxmetrics.com
            </a>
          </p>
          <ol className="space-y-1">
            {copy.wizardSteps.map((s, i) => {
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
                      <div className="text-xs opacity-70">{copy.stepLabel(s.n)}</div>
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
            <FindParishStep copy={copy} parish={parish} setParish={setParish} />
          )}
          {step === "contact" && (
            <ContactStep copy={copy} profile={profile} setProfile={setProfile} errors={contactErrors} showErrors={triedNext} />
          )}
          {step === "parish" && (
            <ParishInfoStep copy={copy} profile={profile} setProfile={setProfile} errors={parishErrors} showErrors={triedNext} />
          )}
          {step === "location" && (
            <LocationStep
              copy={copy}
              profile={profile}
              setProfile={setProfile}
              locSource={locSource}
              markLocationUserEdited={markLocationUserEdited}
            />
          )}
          {step === "modules" && (
            <ModulesStep
              copy={copy}
              modules={modules}
              setModules={setModules}
              importMethod={importMethod}
              setImportMethod={setImportMethod}
              startTimeline={startTimeline}
              setStartTimeline={setStartTimeline}
              submitting={submitting}
              onSubmit={() => {
                if (!modulesComplete) {
                  setTriedNext(true);
                  return;
                }
                void submitEnrollment();
              }}
              onBackToWizardStep={goBack}
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
                  <div>{copy.wizard.completeRequired}</div>
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

          {step !== "confirm" && step !== "modules" && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> {copy.nav.back}
              </Button>
              <div className="flex items-center gap-2">
                {step === "location" && (
                  <Button variant="outline" onClick={goNext}>
                    {copy.nav.skip}
                  </Button>
                )}
                <Button
                  onClick={goNext}
                  disabled={!canProceed || submitting}
                  className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium px-6"
                >
                  {step === "location" ? copy.nav.continue : copy.nav.next}{" "}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  number,
  title,
  description,
  stepLabelText,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  stepLabelText?: string;
  children: React.ReactNode;
}) {
  const copy = useEnrollmentCopy();
  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1 border-b border-border pb-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {stepLabelText ?? copy.stepLabel(number)}
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
  copy,
  parish,
  setParish,
}: {
  copy: EnrollmentCopy;
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
  const { activeMode } = useContext(CustomizerContext);
  const theme: "light" | "dark" = activeMode === "dark" ? "dark" : "light";
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
      title={copy.findParish.title}
      description={copy.findParish.description}
      stepLabelText={copy.stepLabel(1)}
    >
      <div className="space-y-5">
        <Field label={copy.location.state} required>
          <Select
            value={state}
            onValueChange={(v) =>
              update({ state: v, query: "", selected: null, notListed: false, manualName: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={copy.findParish.statePlaceholder} />
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
              {copy.findParish.mapLabel}
              <span className="text-destructive ml-0.5">*</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {copy.findParish.mapHint}
            </p>
            <div className="rounded-md border border-border overflow-hidden bg-muted/30">
              {geoLoading ? (
                <div className="flex items-center justify-center gap-2 h-[340px] text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> {copy.findParish.loadingMap}
                </div>
              ) : geoData ? (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-[340px] text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> {copy.findParish.loadingMap}
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
                  {copy.findParish.mapUnavailable}
                </div>
              )}
            </div>
          </div>
        )}

        {state && !notListed && (
          <Field
            label={copy.findParish.parishName}
            required
            hint={copy.findParish.parishHint}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={selected ? selected.name : query}
                onChange={(e) => update({ query: e.target.value, selected: null })}
                placeholder={copy.findParish.parishPlaceholder}
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
                    {copy.findParish.noResults}
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
              {copy.findParish.selected}
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
              {notListed ? copy.findParish.cancelSearch : copy.findParish.notListed}
            </Button>
            {notListed && (
              <div className="mt-3">
                <Field
                  label={copy.findParish.manualLabel}
                  required
                  hint={copy.findParish.manualHint}
                >
                  <Input
                    value={manualName}
                    onChange={(e) => update({ manualName: e.target.value })}
                    placeholder={copy.findParish.manualPlaceholder}
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
          {copy.findParish.crmTip}
        </div>
      </div>
    </SectionCard>
  );
}

function ContactStep({
  copy,
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
      title={copy.contact.title}
      description={copy.contact.description}
      stepLabelText={copy.stepLabel(2)}
    >
      <div className="grid md:grid-cols-2 gap-5 max-w-xl">
        <Field label={copy.contact.firstName} required error={err("firstName")}>
          <Input value={profile.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
        </Field>
        <Field label={copy.contact.lastName} required error={err("lastName")}>
          <Input value={profile.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
        </Field>
        <div className="md:col-span-2">
          <Field label={copy.contact.email} required hint={copy.contact.emailHint} error={err("email")}>
            <Input type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}

function ParishInfoStep({
  copy,
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
      title={copy.parishInfo.title}
      description={copy.parishInfo.description}
      stepLabelText={copy.stepLabel(3)}
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label={copy.parishInfo.churchName} required error={err("churchName")}>
          <Input value={profile.churchName} onChange={(e) => set("churchName", e.target.value)} />
        </Field>
        <Field label={copy.parishInfo.jurisdiction} hint={copy.parishInfo.jurisdictionHint}>
          <Select value={profile.jurisdiction} onValueChange={(v) => set("jurisdiction", v)}>
            <SelectTrigger><SelectValue placeholder={copy.parishInfo.jurisdictionPlaceholder} /></SelectTrigger>
            <SelectContent>
              {copy.jurisdictions.map((j) => (
                <SelectItem key={j.slug} value={j.value}>{j.value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={copy.parishInfo.phone} hint={copy.parishInfo.optional}>
          <Input value={profile.phone} onChange={(e) => set("phone", e.target.value)} type="tel" />
        </Field>
        <Field label={copy.parishInfo.website} hint={copy.parishInfo.optional}>
          <Input value={profile.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Field label={copy.parishInfo.size} hint={copy.parishInfo.optional}>
          <Select value={profile.size} onValueChange={(v) => set("size", v)}>
            <SelectTrigger><SelectValue placeholder={copy.parishInfo.sizePlaceholder} /></SelectTrigger>
            <SelectContent>
              {copy.churchSizes.map((v) => (
                <SelectItem key={v.slug} value={v.value}>{v.value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={copy.parishInfo.referral} hint={copy.parishInfo.optional}>
          <Input value={profile.referral} onChange={(e) => set("referral", e.target.value)} />
        </Field>
      </div>
    </SectionCard>
  );
}

function LocationStep({
  copy,
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
      title={copy.location.title}
      description={copy.location.description}
      stepLabelText={copy.stepLabel(4)}
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label={copy.location.street} hint={copy.parishInfo.optional}>
          <Input value={profile.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label={copy.location.city} hint={copy.parishInfo.optional}>
          <Input value={profile.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label={copy.location.state} hint={copy.parishInfo.optional}>
          <Input value={profile.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field
          label={copy.location.zip}
          hint={zipSuggested ? copy.location.zipSuggested : copy.parishInfo.optional}
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
        <Field label={copy.location.country} hint={copy.parishInfo.optional}>
          <Input value={profile.country} onChange={(e) => setLoc("country", e.target.value)} />
        </Field>
        <Field label={copy.location.timezone} hint={copy.parishInfo.optional}>
          <Select value={profile.timezone} onValueChange={(v) => setLoc("timezone", v)}>
            <SelectTrigger><SelectValue placeholder={copy.location.timezonePlaceholder} /></SelectTrigger>
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

function ModulesSelectionSummary({
  copy,
  modules,
  importMethod,
  showImport,
}: {
  copy: EnrollmentCopy;
  modules: Record<string, boolean>;
  importMethod?: ImportMethod;
  showImport?: boolean;
}) {
  const selected = Object.entries(modules).filter(([, v]) => v);
  if (!selected.length) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/60 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground shrink-0">{copy.modules.selectedModules}</span>
        {selected.map(([k]) => (
          <Badge key={k} variant="outline" className="font-normal">
            {copy.moduleLabels[k] ?? k}
          </Badge>
        ))}
      </div>
      {showImport && importMethod && (
        <p className="text-sm text-muted-foreground">
          <span className="text-[#2d1b4e] dark:text-[#d4af37] font-medium">{copy.modules.importLabel}</span>
          {copy.formatImportMethod(importMethod)}
        </p>
      )}
    </div>
  );
}

function ModulesStep({
  copy,
  modules,
  setModules,
  importMethod,
  setImportMethod,
  startTimeline,
  setStartTimeline,
  onSubmit,
  onBackToWizardStep,
  submitting = false,
}: {
  copy: EnrollmentCopy;
  modules: Record<string, boolean>;
  setModules: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  importMethod: ImportMethod;
  setImportMethod: (v: ImportMethod) => void;
  startTimeline: StartTimeline;
  setStartTimeline: (v: StartTimeline) => void;
  onSubmit: () => void;
  onBackToWizardStep: () => void;
  submitting?: boolean;
}) {
  const [subStage, setSubStage] = useState(1);
  const [triedAdvance, setTriedAdvance] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const stageMeta = copy.moduleSubStages[subStage - 1];
  const moduleCount = Object.values(modules).filter(Boolean).length;
  const hasModules = moduleCount > 0;
  const hasImport = Boolean(importMethod);
  const hasTimeline = Boolean(startTimeline);

  const bumpTransition = () => {
    setTransitioning(true);
    window.setTimeout(() => setTransitioning(false), 200);
  };

  const goSubStage = (next: number) => {
    bumpTransition();
    setTriedAdvance(false);
    setSubStage(next);
  };

  const handleBack = () => {
    if (subStage > 1) {
      goSubStage(subStage - 1);
    } else {
      onBackToWizardStep();
    }
  };

  const handleContinue = () => {
    if (subStage === 1) {
      if (!hasModules) {
        setTriedAdvance(true);
        return;
      }
      goSubStage(2);
      return;
    }
    if (subStage === 2) {
      if (!hasImport) {
        setTriedAdvance(true);
        return;
      }
      goSubStage(3);
    }
  };

  const handleSubmit = () => {
    if (!hasTimeline) {
      setTriedAdvance(true);
      return;
    }
    onSubmit();
  };

  const stageError =
    triedAdvance && subStage === 1 && !hasModules
      ? copy.errors.modules
      : triedAdvance && subStage === 2 && !hasImport
        ? copy.errors.importMethod
        : triedAdvance && subStage === 3 && !hasTimeline
          ? copy.errors.startTimeline
          : undefined;

  const primaryDisabled =
    submitting ||
    (subStage === 1 && !hasModules) ||
    (subStage === 2 && !hasImport) ||
    (subStage === 3 && !hasTimeline);

  return (
    <SectionCard
      number={5}
      title={copy.modules.title}
      description={copy.modules.description}
      stepLabelText={copy.stepLabel(5)}
    >
      <p className="font-['Inter'] text-sm text-muted-foreground mb-4" aria-live="polite">
        {copy.moduleStageProgress(stageMeta.n, copy.moduleSubStages.length, stageMeta.label)}
      </p>

      <div className="min-h-[280px] md:min-h-[300px]">
        <div
          className={`transition-opacity duration-200 ease-out ${transitioning ? "opacity-0" : "opacity-100"}`}
        >
          {subStage === 1 && (
            <div className="space-y-4">
              <p className="font-['Inter'] text-[15px] text-muted-foreground">
                {copy.modules.selectPrompt}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {copy.moduleCards.map((c) => {
                  const selected = modules[c.key];
                  const Icon = MODULE_ICONS[c.key];
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setModules({ ...modules, [c.key]: !selected })}
                      className={`text-left rounded-lg border p-5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 ${
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
                            {copy.modules.recommended}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div>{c.title}</div>
                        <p className="text-sm text-muted-foreground">{c.desc}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {selected ? copy.modules.selected : copy.modules.tapToSelect}
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
                  <span className="text-muted-foreground">{copy.modules.selectedCount}</span>
                  <strong>{moduleCount}</strong> of {copy.moduleCards.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(modules)
                    .filter(([, v]) => v)
                    .map(([k]) => (
                      <Badge key={k} variant="outline">
                        {copy.moduleLabels[k] ?? k}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          )}

          {subStage === 2 && (
            <div className="space-y-4">
              <ModulesSelectionSummary copy={copy} modules={modules} />
              <fieldset className="border-0 p-0 m-0 min-w-0">
                <legend className="font-['Inter'] text-base font-medium mb-3 block w-full">
                  {copy.modules.importQuestion} <span className="text-destructive">*</span>
                </legend>
                <div className="grid md:grid-cols-2 gap-4" role="radiogroup" aria-label={copy.modules.importAria}>
                  {copy.importMethods.map((opt) => {
                    const selected = importMethod === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setImportMethod(opt.value)}
                        className={`text-left rounded-lg border p-5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 ${
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
              </fieldset>
            </div>
          )}

          {subStage === 3 && (
            <div className="space-y-4">
              <ModulesSelectionSummary copy={copy} modules={modules} importMethod={importMethod} showImport />
              <fieldset className="border-0 p-0 m-0 min-w-0">
                <legend className="font-['Inter'] text-base font-medium mb-3 block w-full">
                  {copy.modules.timelineQuestion} <span className="text-destructive">*</span>
                </legend>
                <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-3" role="radiogroup" aria-label={copy.modules.timelineAria}>
                  {copy.startTimelines.map((opt) => {
                    const selected = startTimeline === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setStartTimeline(opt.value)}
                        className={`rounded-lg border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 ${
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
              </fieldset>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(212,175,55,0.08)] dark:bg-[rgba(30,42,58,0.8)] border border-[#d4af37]/25 dark:border-white/8 text-sm">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-[#2d1b4e] dark:text-[#d4af37] shrink-0" />
                <div>
                  {copy.modules.submitTip}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {stageError && (
        <p className="text-sm text-destructive mt-3" role="alert">
          {stageError}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
        <Button type="button" variant="ghost" onClick={handleBack} disabled={submitting}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {copy.nav.back}
        </Button>
        {subStage < 3 ? (
          <Button
            type="button"
            onClick={handleContinue}
            disabled={primaryDisabled}
            className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium px-6"
          >
            {copy.nav.continue} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={primaryDisabled}
            className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium px-6"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {copy.nav.submitting}
              </>
            ) : (
              <>
                {copy.nav.submit} <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function ConfirmStep({
  copy,
  profile,
  modules,
  importMethod,
  startTimeline,
  reference,
  onHome,
}: {
  copy: EnrollmentCopy;
  profile: any;
  modules: string[];
  importMethod: ImportMethod;
  startTimeline: StartTimeline;
  reference: string;
  onHome: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const requestId = reference || "—";
  const confirmIcons = [Check, Phone, Mail, ArrowRight] as const;

  function copyReference() {
    if (!requestId || requestId === "—") return;
    void navigator.clipboard.writeText(requestId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#fdfcf9] dark:bg-background -mx-2 sm:mx-0">
      <ConfirmManuscriptPattern />
      <ConfirmCandleGlow />

      <motion.div
        className="absolute top-16 left-4 sm:left-10 opacity-5 pointer-events-none"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ConfirmChurchDome className="w-24 h-28 sm:w-32 sm:h-36" />
      </motion.div>

      <motion.div
        className="absolute bottom-32 right-6 sm:right-16 opacity-5 pointer-events-none"
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <ConfirmOrthodoxCross className="w-20 h-28 sm:w-24 sm:h-32" />
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-3 mb-2">
            <ConfirmOrthodoxCross className="w-7 h-9 text-[#d4af37]" />
            <h3 className="text-[#1a2e52] dark:text-[#d4af37] tracking-wide text-sm font-medium">
              {copy.confirm.brand}
            </h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative bg-white dark:bg-card rounded-2xl shadow-xl overflow-hidden mb-12"
        >
          <motion.div
            className="h-1.5 bg-gradient-to-r from-[#1a2e52] via-[#d4af37] to-[#1a2e52]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />

          <div className="p-6 md:p-12 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <ConfirmArchDecoration className="w-48 h-24 md:w-64 md:h-32" />
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.6 }}
              className="w-20 h-20 mx-auto mb-8 relative"
            >
              <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(212, 175, 55, 0.4)",
                      "0 0 0 20px rgba(212, 175, 55, 0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-14 h-14 bg-[#d4af37] rounded-full flex items-center justify-center"
                >
                  <Check className="w-8 h-8 text-white" strokeWidth={3} />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center max-w-2xl mx-auto space-y-4"
            >
              <h1 className="font-['Georgia'] text-2xl md:text-3xl text-[#1a2e52] dark:text-foreground" style={{ fontWeight: 400 }}>
                {copy.confirm.receivedTitle}
              </h1>
              <p className="text-[#1a2e52]/80 dark:text-muted-foreground leading-relaxed">
                {copy.confirmReceivedBody(profile.firstName, profile.churchName)}
              </p>
              {reference && (
                <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#f5f3ef] dark:bg-muted border border-[#1a2e52]/10">
                  <span className="text-sm text-[#1a2e52]/70 dark:text-muted-foreground">{copy.confirm.reference}</span>
                  <code className="text-sm font-medium text-[#1a2e52] dark:text-foreground">{requestId}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={copyReference}
                    title={copy.confirm.copyReference}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {copied && <span className="text-xs text-muted-foreground">{copy.confirm.copied}</span>}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          <h2 className="text-center font-['Georgia'] text-xl text-[#1a2e52] dark:text-foreground mb-8" style={{ fontWeight: 400 }}>
            {copy.confirm.whatNext}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-6 mb-12">
            {copy.confirmNextSteps.map((stepItem, index) => {
              const Icon = confirmIcons[index];
              return (
              <motion.div
                key={`${stepItem.title}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.15 }}
                className="bg-white dark:bg-card rounded-xl p-5 md:p-6 shadow-md hover:shadow-lg transition-shadow border border-[#1a2e52]/5"
              >
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 bg-[#1a2e52]/5 rounded-lg flex items-center justify-center">
                      {Icon ? <Icon className="w-6 h-6 text-[#d4af37]" /> : null}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-[#d4af37]/20 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-sm text-[#1a2e52] dark:text-foreground">{index + 1}</span>
                      </div>
                      <h4 className="text-[#1a2e52] dark:text-foreground font-medium">{stepItem.title}</h4>
                    </div>
                    <p className="text-sm text-[#1a2e52]/70 dark:text-muted-foreground leading-relaxed">
                      {stepItem.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
            })}
          </div>
        </motion.div>

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-white dark:bg-card rounded-xl p-6 mb-8 border border-[#1a2e52]/10 shadow-sm"
          >
            <h3 className="text-[#1a2e52] dark:text-foreground font-medium mb-4">{copy.confirm.submissionTitle}</h3>
            <dl className="space-y-3 text-sm">
              {[
                [copy.confirm.detailChurch, profile.churchName],
                [copy.confirm.detailEmail, profile.email],
                [copy.confirm.detailModules, modules.join(", ") || copy.confirm.none],
                [copy.confirm.detailImport, copy.formatImportMethod(importMethod)],
                [copy.confirm.detailTimeline, copy.formatStartTimeline(startTimeline)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="sm:w-36 shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="text-[#1a2e52] dark:text-foreground break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="bg-[#f5f3ef] dark:bg-muted/40 rounded-xl p-6 md:p-8 mb-10 text-center border border-[#d4af37]/20"
        >
          <h3 className="text-[#1a2e52] dark:text-foreground font-medium mb-3">{copy.confirm.helpTitle}</h3>
          <p className="text-[#1a2e52]/80 dark:text-muted-foreground mb-6 max-w-xl mx-auto">
            {copy.confirm.helpBody}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={onHome}
              className="bg-[#1a2e52] hover:bg-[#0f1a2e] text-white px-6"
            >
              <Home className="w-4 h-4 mr-2" />
              {copy.confirm.returnHome}
            </Button>

            <Button
              variant="outline"
              asChild
              className="border-2 border-[#1a2e52] text-[#1a2e52] dark:text-foreground hover:bg-[#f5f3ef] dark:hover:bg-muted px-6"
            >
              <a href="/contact">
                <Mail className="w-4 h-4 mr-2" />
                {copy.confirm.contactUs}
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowDetails((v) => !v)}
              className="border border-[#1a2e52]/30 text-[#1a2e52] dark:text-foreground hover:bg-[#f5f3ef] dark:hover:bg-muted"
            >
              {showDetails ? copy.confirm.hideDetails : copy.confirm.showDetails}
            </Button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center text-sm text-[#1a2e52]/60 dark:text-muted-foreground"
        >
          {copy.confirm.footer}
        </motion.p>
      </div>
    </div>
  );
}

function ConfirmOrthodoxCross({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="27" y="5" width="6" height="70" fill="#d4af37" />
      <rect x="15" y="18" width="30" height="5" fill="#d4af37" />
      <rect x="10" y="35" width="40" height="6" fill="#d4af37" />
      <rect x="12" y="55" width="36" height="4" fill="#d4af37" transform="rotate(-15 30 57)" />
    </svg>
  );
}

function ConfirmChurchDome({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <g opacity="0.9">
        <rect x="57" y="8" width="6" height="18" fill="#d4af37" />
        <rect x="51" y="14" width="18" height="6" fill="#d4af37" />
      </g>
      <path d="M60 30 C40 30, 30 40, 30 55 L30 70 L90 70 L90 55 C90 40, 80 30, 60 30Z" fill="#1a2e52" opacity="0.15" />
      <rect x="40" y="70" width="40" height="50" fill="#1a2e52" opacity="0.1" />
      <path d="M50 85 L50 105 L70 105 L70 85 C70 77, 50 77, 50 85Z" fill="#d4af37" opacity="0.2" />
    </svg>
  );
}

function ConfirmArchDecoration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M10 120 L10 60 Q10 10, 60 10 L140 10 Q190 10, 190 60 L190 120" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.3" />
      <path d="M20 120 L20 65 Q20 20, 65 20 L135 20 Q180 20, 180 65 L180 120" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.2" />
    </svg>
  );
}

function ConfirmCandleGlow() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.7, 0.5, 0.6, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#ffd89b] opacity-10 blur-3xl" />
    </motion.div>
  );
}

function ConfirmManuscriptPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <pattern id="confirm-manuscript" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <path
            d="M20 20 Q30 10, 40 20 T60 20 M20 40 L60 40 M20 50 L50 50 M20 60 L55 60"
            stroke="#1a2e52"
            strokeWidth="0.5"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#confirm-manuscript)" />
    </svg>
  );
}
