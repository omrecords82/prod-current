import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

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
          className="absolute top-20 -left-40 w-[550px] h-[550px] rounded-full opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(218,165,32,0.9) 0%, rgba(218,165,32,0.4) 35%, transparent 65%)',
            filter: 'blur(50px)',
            animation: 'ambientTravelRight1 22s ease-in-out infinite',
          }}
        />
        {/* Soft violet — right to left */}
        <div
          className="absolute top-1/3 -right-60 w-[650px] h-[650px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(180,140,220,1) 0%, rgba(180,140,220,0.5) 35%, transparent 65%)',
            filter: 'blur(55px)',
            animation: 'ambientTravelLeft1 28s ease-in-out infinite',
          }}
        />
        {/* Cool blue-white — left to right (slower) */}
        <div
          className="absolute bottom-32 -left-40 w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(230,240,250,0.85) 0%, rgba(230,240,250,0.4) 35%, transparent 65%)',
            filter: 'blur(60px)',
            animation: 'ambientTravelRight2 32s ease-in-out infinite',
          }}
        />
        {/* Secondary golden accent — opposite direction */}
        <div
          className="absolute top-2/3 -right-40 w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,200,100,0.8) 0%, rgba(255,200,100,0.3) 40%, transparent 70%)',
            filter: 'blur(55px)',
            animation: 'ambientTravelLeft2 38s ease-in-out infinite',
          }}
        />
      </div>

      <style>{AMBIENT_KEYFRAMES}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[rgba(212,175,55,0.15)] dark:bg-[rgba(212,175,55,0.2)] px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span>
              <EditableText contentKey="hero.badge" as="span" className="font-['Inter'] text-[14px] text-[#d4af37]">
                {t('home.hero_badge')}
              </EditableText>
            </div>
            <EditableText contentKey="hero.title" as="h1" className="font-['Georgia'] text-5xl md:text-6xl leading-tight mb-6">
              {t('home.hero_title')}
            </EditableText>
            <EditableText contentKey="hero.subtitle" as="p" className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] leading-relaxed mb-8" multiline>
              {t('home.hero_subtitle')}
            </EditableText>
            <div className="flex flex-col sm:flex-row gap-4">
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
        <div className="flex h-full items-center">
          <p className="font-['Georgia'] italic text-2xl md:text-3xl leading-snug text-[#f4d77a]">
            “Fulfill your canonical duty with modern efficiency. From scanning existing paper records to managing your parish&apos;s digital footprint, ensure your Metrical Records are safe, searchable, and compliant with jurisdictional statutes.”
          </p>
        </div>
      </div>

      <div className={slideClass(1)} aria-hidden={active !== 1}>
        <p className="font-['Inter'] text-[15px] md:text-[16px] leading-relaxed text-white/90 mb-4">
          Orthodox parishes are required by canon law and administrative tradition to keep accurate records, specifically Metrical Books (records of baptism, chrismation, marriage, and burial). While no single ancient, universally codified &ldquo;canon&rdquo; exists in the same way modern civil law works, these requirements are enforced through local synodical regulations, episcopal directives, and the general canonical obligation to maintain order in the Church.
        </p>
        <ul className="space-y-3 font-['Inter'] text-[14px] md:text-[15px] text-white/85">
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Metrical Records:</strong> Priests are obliged to keep detailed records of all sacraments performed. These act as proof of membership and standing within the Church.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Purpose:</strong> These registers are considered permanent, historical documents essential for verifying membership, sacramental life, and legal/pastoral accountability.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Authority:</strong> While not always in the oldest ecumenical canons, maintaining accurate records is upheld by the authority of local bishops and synods to regulate parish life.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Parish Responsibility:</strong> Each Orthodox parish is expected to maintain these, often in a safe, fire-proof location.</span>
          </li>
        </ul>
      </div>

      <div className={slideClass(2)} aria-hidden={active !== 2}>
        <p className="font-['Inter'] text-[15px] md:text-[16px] leading-relaxed text-white/90 mb-4">
          Modern Orthodox jurisdictions, such as the Orthodox Church in America (OCA) and the Greek Orthodox Archdiocese of America, have explicit statutes requiring priests to &ldquo;personally maintain&rdquo; Metrical Records for every baptism, chrismation, marriage, and burial.
        </p>
        <ul className="space-y-3 font-['Inter'] text-[14px] md:text-[15px] text-white/85">
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Canonical Custody:</strong> Under the OCA Statute (Article XII), the parish priest is legally &ldquo;entrusted with the care, custody, and maintenance&rdquo; of both sacramental and administrative records.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Permanent Preservation:</strong> Because metrical registers are considered permanent, historical records, churches are increasingly encouraged to create digital duplicates to protect against physical loss from fire, age, or disaster.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Accurate Reporting:</strong> Parishes must provide yearly sacramental statistics to their diocese. A digital tool like ours makes this metadata management significantly more efficient.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#d4af37] mt-1">•</span>
            <span><strong className="text-white">Verification of Status:</strong> Since Ancient Canons (such as Apostolic Canons 17 &amp; 18) prohibit certain roles based on sacramental history, having searchable, accurate records is a theological necessity for ensuring the integrity of the Church&apos;s life.</span>
          </li>
        </ul>
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
