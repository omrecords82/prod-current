import {
    ArrowRight,
    ClipboardCheck,
    Cpu,
    FileSignature,
    Lock,
    Mail,
    Phone,
    ShieldCheck,
    UploadCloud
} from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type Props = {
  onStart: () => void;
  onAdmin: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function Landing({ onStart, onAdmin, theme, onToggleTheme }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/images/misc/enroll-header.png" alt="Orthodox Metrics" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => { window.location.href = '/auth/login'; }}>Sign In</Button>
            <Button onClick={onStart} className="bg-[#3a1d6e] hover:bg-[#2a1450] text-white">
              Start Church Setup
            </Button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #3a1d6e 0, transparent 40%), radial-gradient(circle at 80% 30%, #c9a14a 0, transparent 35%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div className="space-y-7">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#c9a14a]/40 text-[#5a4413] dark:text-[#e3c483]">
                For Orthodox Parishes
              </Badge>
            </div>
            <h1 className="text-4xl lg:text-5xl leading-[1.1]" style={{ fontWeight: 500 }}>
              Digitize and manage your{" "}
              <span className="text-[#3a1d6e] dark:text-[#c9a14a]">Orthodox church records.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Orthodox Metrics helps parishes safely organize baptism, marriage, and funeral
              records — preserving the work of generations in a calm, secure workspace built for
              the Church.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onStart}
                className="bg-[#3a1d6e] hover:bg-[#2a1450] text-white"
              >
                Start Church Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Contact Orthodox Metrics
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground pt-2">
              <TrustItem icon={ShieldCheck} text="Reviewed by Orthodox Metrics staff" />
              <TrustItem icon={Lock} text="Encrypted records storage" />
            </div>
          </div>

          <Card className="border-[#c9a14a]/30 shadow-xl">
            <CardContent className="p-6 space-y-5">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                How onboarding works
              </div>
              {[
                {
                  n: 1,
                  icon: FileSignature,
                  t: "Sign up your parish",
                  d: "Tell us about your church, jurisdiction, and contact.",
                },
                {
                  n: 2,
                  icon: UploadCloud,
                  t: "Upload your records",
                  d: "Scanned books, PDFs, or images — in batches.",
                },
                {
                  n: 3,
                  icon: Cpu,
                  t: "We process them",
                  d: "Orthodox Metrics staff review and structure each batch.",
                },
                {
                  n: 4,
                  icon: ClipboardCheck,
                  t: "Review results",
                  d: "Search, export, or request corrections from your dashboard.",
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div className="shrink-0 h-9 w-9 rounded-md bg-[#f6efdb] dark:bg-[#3a1d6e] text-[#5a4413] dark:text-[#c9a14a] flex items-center justify-center">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Step {step.n}</div>
                    <div>{step.t}</div>
                    <div className="text-sm text-muted-foreground">{step.d}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
          {[
            { t: "Baptism Records", d: "Capture names, sponsors, dates, and clergy across decades of ledgers." },
            { t: "Marriage Records", d: "Preserve sacramental marriages with full witness and clergy details." },
            { t: "Funeral Records", d: "Honor the departed with carefully organized funeral and burial records." },
          ].map((r) => (
            <Card key={r.t} className="border-border">
              <CardContent className="p-6 space-y-2">
                <div className="text-[#3a1d6e] dark:text-[#c9a14a]">{r.t}</div>
                <p className="text-sm text-muted-foreground">{r.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-card/60">
        <div className="max-w-6xl mx-auto px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div className="space-y-2">
            <img src="/images/misc/enroll-header.png" alt="Orthodox Metrics" className="h-8 w-auto object-contain" />
            <p className="text-muted-foreground">
              The church-facing platform of Orthodox Metrics.
            </p>
          </div>
          <FooterCol title="Product" items={["Onboarding", "Records", "Pages", "Pricing"]} />
          <FooterCol title="Company" items={["About", "Mission", "Contact", "Privacy"]} />
          <div className="space-y-2">
            <div>Contact</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> hello@orthodoxmetrics.org
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> +1 (555) 010-1820
            </div>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © 2026 Orthodox Metrics. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function TrustItem({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#3a1d6e] dark:text-[#c9a14a]" />
      <span>{text}</span>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <div>{title}</div>
      <ul className="space-y-1 text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
