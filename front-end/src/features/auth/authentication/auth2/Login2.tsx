import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import { useLanguage } from '@/context/LanguageContext';
import AuthLogin from '@/features/auth/authentication/authForms/AuthLogin';
import PageContainer from '@/shared/ui/PageContainer';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Right-side rotating panel: cycles a pull-quote → canonical-duty
// background → modern-jurisdiction guidance, then loops.
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

const Login2 = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Login" description="this is Login page">
      <div className="om-page-container">
        <HpHeader />

        {/* Hero Login Section */}
        <section className="om-hero-gradient py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Canonical Duty Carousel */}
              <CanonicalDutyCarousel />

              {/* Right: Login Card */}
              <div className="flex justify-center">
                <div className="w-full max-w-[450px] bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-xl text-[#2d1b4e] dark:text-white">
                  <h2 className="font-['Georgia'] text-2xl text-[#2d1b4e] dark:text-white text-center mb-1">
                    {t('auth.card_heading')}
                  </h2>
                  <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 text-center mb-4">
                    {t('auth.card_subheading')}
                  </p>

                  <AuthLogin
                    subtitle={
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">
                          {t('auth.new_to_om')}
                        </span>
                        <Link
                          to="/get-started"
                          className="font-['Inter'] text-[15px] font-medium text-[#2d1b4e] dark:text-[#d4af37] no-underline hover:underline"
                        >
                          {t('auth.create_account')}
                        </Link>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </PageContainer>
  );
};

export default Login2;
