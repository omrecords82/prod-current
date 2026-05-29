import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const AMBIENT_KEYFRAMES = `
  @keyframes ambientTravelRight1 {
    0% { transform: translate(-100%, 0) scale(1); }
    50% { transform: translate(calc(100vw + 200px), -40px) scale(1.15); }
    100% { transform: translate(-100%, 0) scale(1); }
  }
  @keyframes ambientTravelLeft1 {
    0% { transform: translate(100%, 0) scale(1); }
    50% { transform: translate(calc(-100vw - 300px), 50px) scale(1.2); }
    100% { transform: translate(100%, 0) scale(1); }
  }
  @keyframes ambientTravelRight2 {
    0% { transform: translate(-80%, 0) scale(1); }
    50% { transform: translate(calc(100vw + 150px), 30px) scale(1.1); }
    100% { transform: translate(-80%, 0) scale(1); }
  }
  @keyframes ambientTravelLeft2 {
    0% { transform: translate(120%, 0) scale(1); }
    50% { transform: translate(calc(-100vw - 200px), -20px) scale(1.12); }
    100% { transform: translate(120%, 0) scale(1); }
  }
`;

const HomepageHero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white">
      {/* Ambient lighting layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Warm golden light — left to right */}
        <div
          className="absolute top-20 -left-40 w-[550px] h-[550px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(218,165,32,0.9) 0%, rgba(218,165,32,0.4) 35%, transparent 65%)',
            filter: 'blur(50px)',
            animation: 'ambientTravelRight1 60s ease-in-out infinite',
          }}
        />
        {/* Soft violet — right to left */}
        <div
          className="absolute top-1/3 -right-60 w-[650px] h-[650px] rounded-full opacity-8"
          style={{
            background: 'radial-gradient(circle, rgba(180,140,220,1) 0%, rgba(180,140,220,0.5) 35%, transparent 65%)',
            filter: 'blur(55px)',
            animation: 'ambientTravelLeft1 75s ease-in-out infinite',
          }}
        />
        {/* Cool blue-white — left to right (slower) */}
        <div
          className="absolute bottom-32 -left-40 w-[500px] h-[500px] rounded-full opacity-7"
          style={{
            background: 'radial-gradient(circle, rgba(230,240,250,0.85) 0%, rgba(230,240,250,0.4) 35%, transparent 65%)',
            filter: 'blur(60px)',
            animation: 'ambientTravelRight2 90s ease-in-out infinite',
          }}
        />
        {/* Secondary golden accent — opposite direction */}
        <div
          className="absolute top-2/3 -right-40 w-[400px] h-[400px] rounded-full opacity-6"
          style={{
            background: 'radial-gradient(circle, rgba(255,200,100,0.8) 0%, rgba(255,200,100,0.3) 40%, transparent 70%)',
            filter: 'blur(55px)',
            animation: 'ambientTravelLeft2 100s ease-in-out infinite',
          }}
        />
      </div>

      <style>{AMBIENT_KEYFRAMES}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col">
            <WelcomeRotator />
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                to={PUBLIC_ROUTES.TOUR}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors no-underline"
              >
                {t('home.hero_cta_tour')}
                <ArrowRight size={20} />
              </Link>
              <Link
                to={PUBLIC_ROUTES.ENROLL}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors no-underline"
              >
                Enroll Now
              </Link>
            </div>
          </div>

          <CanonicalDutyCarousel />
        </div>
      </div>
    </section>
  );
};

// Left-side welcome rotator: cycles through welcome messages
const WELCOME_SLIDES = [
  {
    title: 'WELCOME TO ORTHODOX METRICS',
    desc: 'Preserving Orthodox Christian records across languages, generations, and jurisdictions.',
  },
  {
    title: 'YOUR PARISH HAS A UNIQUE HISTORY.',
    desc: 'Orthodox Metrics helps keep that history alive, secure, and accessible. Parish priests and deacons can manage sacred records, generate certificates, and gain meaningful insights from parish data without relying on scattered spreadsheets or fragile paper archives.',
  },
  {
    title: 'ONE SIGN-UP. LASTING VALUE.',
    desc: 'When a parish joins Orthodox Metrics, it gains a secure records system, multilingual tools, searchable history, and analytics designed specifically for the Orthodox Church. These records are not just administrative data. They are part of the living memory of the parish.',
  },
  {
    title: 'SECURE. AUDITABLE. BUILT FOR ORTHODOX PARISHES.',
    desc: 'Parish records remain protected, organized, and traceable inside a governed system designed around the real needs of Orthodox communities.',
  },
];

const WelcomeRotator = () => {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState(-1);

  const goTo = (i: number) => {
    if (i === active) return;
    setPrev(active);
    setActive(i);
  };

  const slideClass = (i: number) => {
    const base = 'absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-out';
    if (i === active) return `${base} translate-y-0 opacity-100`;
    if (i === prev) return `${base} -translate-y-full opacity-0`;
    return `${base} translate-y-full opacity-0`;
  };

  return (
    <div className="relative h-[220px] md:h-[260px]">
      {WELCOME_SLIDES.map((slide, i) => (
        <div key={i} className={slideClass(i)}>
          <h1 className="font-['Georgia'] text-3xl md:text-5xl leading-tight mb-4 text-white tracking-wide">
            {slide.title}
          </h1>
          <p className="font-['Inter'] text-[16px] md:text-lg text-[rgba(255,255,255,0.85)] leading-relaxed">
            {slide.desc}
          </p>
        </div>
      ))}
      <div className="absolute bottom-0 left-0 flex gap-2">
        {WELCOME_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${
              active === i
                ? 'w-6 bg-[#d4af37]'
                : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Right-side rotating panel: cycles a pull-quote → canonical-duty
// background → modern-jurisdiction guidance, then loops. Each
// transition slides the active slide out the top while the next
// one slides up from below — including the wrap-around from the
// last slide back to the first, which is why we track `prev`
// rather than relying on a simple key remount.
const SLIDE_DURATIONS_MS = [9000, 18000, 18000];

const CanonicalDutyCarousel = () => {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => {
      setPrev(active);
      setActive((a) => (a + 1) % 3);
    }, SLIDE_DURATIONS_MS[active]);
    return () => window.clearTimeout(id);
  }, [active, paused]);

  const slideClass = (i: number) => {
    const base =
      'absolute inset-0 p-6 md:p-8 overflow-y-auto transition-all duration-700 ease-out';
    if (i === active) return `${base} translate-y-0 opacity-100`;
    if (i === prev) return `${base} -translate-y-full opacity-0`;
    return `${base} translate-y-full opacity-0`;
  };

  return (
    <div
      className="relative h-[480px] md:h-[540px] rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Canonical duty rotating panel"
    >
      <div className={slideClass(0)} aria-hidden={active !== 0}>
        <div className="flex h-full flex-col justify-center gap-6">
          <p className="font-['Georgia'] italic text-2xl md:text-3xl leading-snug text-[#f4d77a]">
            &ldquo;He shall personally maintain the metrical book for all marriages, baptisms, chrismations, and funerals that take place at the Parish.&rdquo;
          </p>
          <p className="font-['Inter'] text-[13px] text-white/60">
            &mdash; <a href="https://www.oca.org" target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 hover:text-white">Guidelines for Clergy</a>, Orthodox Church in America (2023)
          </p>
        </div>
      </div>

      <div className={slideClass(1)} aria-hidden={active !== 1}>
        <div className="flex h-full flex-col">
          <p className="font-['Inter'] text-[15px] md:text-[16px] leading-relaxed text-white/90 mb-4">
            The parish priest is responsible for entering into the metrical book the required information for every sacrament served &mdash; an obligation set out across the OCA <em>Guidelines for Clergy</em>.
          </p>
          <ul className="space-y-3 font-['Inter'] text-[14px] md:text-[15px] text-white/85 flex-1">
            <li className="flex gap-2">
              <span className="text-[#d4af37] mt-1">•</span>
              <span><strong className="text-white">Baptism:</strong> The priest must enter the required data in the parish metrical book after carefully ascertaining all necessary information, including facts and spellings. Certificates witnessing that data are available from oca.org.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] mt-1">•</span>
              <span><strong className="text-white">Reception of Converts:</strong> After performing the prescribed rites of reception, the priest must enter the required information in the parish metrical book and issue the appropriate certificate.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] mt-1">•</span>
              <span><strong className="text-white">Marriage:</strong> The priest is responsible for entering into the metrical book the required information for each marriage celebrated in the parish.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] mt-1">•</span>
              <span><strong className="text-white">Burial:</strong> The parish priest is responsible for entering into the metrical book the required information about each burial.</span>
            </li>
          </ul>
          <p className="font-['Inter'] text-[12px] text-white/50 mt-4">
            Source: <a href="https://www.oca.org" target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 hover:text-white">Guidelines for Clergy</a>, Orthodox Church in America (2023).
          </p>
        </div>
      </div>

      <div className={slideClass(2)} aria-hidden={active !== 2}>
        <div className="flex h-full flex-col">
          <p className="font-['Inter'] text-[15px] md:text-[16px] leading-relaxed text-white/90 mb-4">
            <strong className="text-white">Metrical Records &amp; other Ecclesiastical Reports</strong> &mdash; the parish priest&apos;s explicit responsibility under the OCA <em>Guidelines for Clergy</em>.
          </p>
          <ul className="space-y-3 font-['Inter'] text-[14px] md:text-[15px] text-white/85 flex-1">
            <li className="flex gap-2">
              <span className="text-[#d4af37] mt-1">•</span>
              <span><strong className="text-white">Timely Completion:</strong> It is the parish priest&apos;s responsibility to complete in a timely fashion the parish metrical records and all other ecclesiastical forms or reports required by the Central Church Administration and the diocesan chancery.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] mt-1">•</span>
              <span><strong className="text-white">Property of the Parish:</strong> All metrical records are the property of the parish and are not to be taken by the priest in the event he leaves the parish.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] mt-1">•</span>
              <span><strong className="text-white">Transfer of Custody:</strong> When a priest transfers from the parish, he turns the church seal and records over to the district dean, who entrusts them to the newly assigned parish priest.</span>
            </li>
          </ul>
          <p className="font-['Inter'] text-[12px] text-white/50 mt-4">
            Source: <a href="https://www.oca.org" target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 hover:text-white">Guidelines for Clergy</a>, Orthodox Church in America (2023).
          </p>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            onClick={() => {
              setPrev(active);
              setActive(i);
            }}
            className={`h-2 rounded-full transition-all ${
              active === i ? 'w-6 bg-[#d4af37]' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HomepageHero;
