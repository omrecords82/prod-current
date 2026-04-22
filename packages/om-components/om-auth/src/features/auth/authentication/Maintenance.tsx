import { useState } from 'react';
import { ChevronDown, Globe } from '@/ui/icons';
import {
  type MaintenanceLang,
  MAINTENANCE_LANGUAGES,
  maintenanceTranslations,
} from './maintenance/maintenanceTranslations';

/* ─── Orthodox 3-bar cross SVG ─── */
function OrthodoxCrossIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="14" y="0" width="4" height="48" fill="currentColor" rx="1" />
      <rect x="8" y="6" width="16" height="3.5" fill="currentColor" rx="1" />
      <rect x="4" y="16" width="24" height="4" fill="currentColor" rx="1" />
      <rect x="6" y="36" width="20" height="3.5" fill="currentColor" rx="1" transform="rotate(-18 16 37.75)" />
    </svg>
  );
}

/* ─── Language selector dropdown ─── */
function LanguageSelector({
  current,
  onChange,
}: {
  current: MaintenanceLang;
  onChange: (lang: MaintenanceLang) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentLang = MAINTENANCE_LANGUAGES.find((l) => l.code === current) ?? MAINTENANCE_LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/10 backdrop-blur-sm"
      >
        <Globe className="w-4 h-4 text-purple-300" />
        <span className="text-white/90 text-sm">{currentLang.nativeName}</span>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800/95 backdrop-blur-md border border-white/10 shadow-xl z-20 overflow-hidden">
            {MAINTENANCE_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { onChange(lang.code); setOpen(false); }}
                className={`w-full px-4 py-3 text-left transition-colors duration-150 ${
                  lang.code === current
                    ? 'bg-purple-500/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-sm">{lang.nativeName}</span>
                {lang.code === current && (
                  <span className="block text-xs text-purple-300 mt-0.5">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main maintenance page ─── */
const Maintenance = () => {
  const [lang, setLang] = useState<MaintenanceLang>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('orthodoxmetrics-lang');
    if (stored && ['en', 'el', 'ru', 'ro', 'ka'].includes(stored)) return stored as MaintenanceLang;
    return 'en';
  });

  const t = maintenanceTranslations[lang];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      {/* Language selector */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector current={lang} onChange={setLang} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
        {/* Cross icon */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-lg" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-2xl flex items-center justify-center">
            <OrthodoxCrossIcon className="w-9 h-12 text-white" />
          </div>
        </div>

        {/* Brand */}
        <div className="mb-8">
          <h2 className="text-sm tracking-[0.3em] text-rose-400/90 font-medium">{t.brandName}</h2>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl text-white mb-6 tracking-tight">{t.pageTitle}</h1>

        {/* Description */}
        <p className="text-lg text-white/70 mb-8 max-w-lg leading-relaxed">{t.description}</p>

        {/* Progress bar */}
        <div className="w-full max-w-md mb-12 relative">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        </div>

        {/* Info card */}
        <div className="w-full max-w-md bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl mb-8">
          <h3 className="text-sm tracking-[0.2em] text-rose-400/90 font-medium mb-4">
            {t.whatIsHappening}
          </h3>
          <p className="text-white/80 leading-relaxed">{t.deploymentInfo}</p>
        </div>

        {/* Language hint */}
        <p className="text-xs text-white/40 mb-4 italic">{t.languageHint}</p>

        {/* Contact */}
        <p className="text-white/60">
          {t.contactPrefix}{' '}
          <a
            href={`mailto:${t.contactEmail}`}
            className="text-rose-400 hover:text-rose-300 transition-colors duration-200"
          >
            {t.contactEmail}
          </a>
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
