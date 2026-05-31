import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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

const heroSlides = [
  {
    image: "/images/home/table-view-records.png",
    title: "Table view for fast record management.",
    description:
      "Search, filter, review, and manage sacramental records from a structured table designed for parish recordkeeping workflows.",
  },
  {
    image: "/images/home/cards-view-records.png",
    title: "Cards view for focused review.",
    description:
      "Review individual records in a clean card layout that makes names, dates, clergy, status, and record details easier to scan.",
  },
  {
    image: "/images/home/timeline-view-records.png",
    title: "Timeline view for historical context.",
    description:
      "See parish records in chronological order so sacramental history becomes easier to trace, review, and understand over time.",
  },
  {
    image: "/images/home/analytics-view-records.png",
    title: "Analytics built from parish records.",
    description:
      "Turn sacramental record data into meaningful parish insights, including trends, completeness, clergy activity, and historical patterns.",
  },
  {
    image: "/images/home/baptism-certificate.png",
    title: "Certificates generated from verified records.",
    description:
      "Generate polished certificates directly from reviewed parish records, reducing duplicate work and helping clergy respond quickly to requests.",
  },
  {
    image: "/images/home/original-baptism-records.png",
    title: "From paper archives to searchable records.",
    description:
      "Preserve original parish record images while converting their contents into structured, searchable data for long-term use.",
  },
  {
    image: "/images/home/processed-metrical-records.png",
    title: "Real records, carefully processed.",
    description:
      "Actual scanned parish records are processed into Orthodox Metrics so your parish can preserve, verify, and access its sacramental history.",
  },
];

const HomepageHero = () => {
  const { t } = useLanguage();
  const [slideIdx, setSlideIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Auto-advance the hero slideshow, paused while the lightbox is open.
  useEffect(() => {
    if (lightboxOpen) return;
    const id = setInterval(() => {
      setSlideIdx((i) => (i + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(id);
  }, [lightboxOpen, slideIdx]);

  const openLightbox = useCallback((i: number) => { setLightboxIdx(i); setLightboxOpen(true); }, []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const lbPrev = useCallback(() => setLightboxIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length), []);
  const lbNext = useCallback(() => setLightboxIdx((i) => (i + 1) % heroSlides.length), []);

  // Keyboard navigation while the lightbox is open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lbPrev();
      else if (e.key === 'ArrowRight') lbNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, closeLightbox, lbPrev, lbNext]);

  return (
    <>
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
            <div className="relative h-[180px] md:h-[220px]">
              {heroSlides.map((slide, i) => (
                <div
                  key={i}
                  className="absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-out"
                  style={{
                    opacity: i === slideIdx ? 1 : 0,
                    transform: i === slideIdx ? 'translateY(0)' : 'translateY(20px)',
                  }}
                >
                  <h1 className="font-['Georgia'] text-2xl md:text-4xl leading-tight mb-4 text-white tracking-wide">
                    {slide.title}
                  </h1>
                  <p className="font-['Inter'] text-[15px] md:text-[17px] text-[rgba(255,255,255,0.85)] leading-relaxed">
                    {slide.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-4 mt-8">
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

          <div className="flex items-center justify-center">
            <div
              className="relative w-full max-w-[700px] aspect-[16/10] cursor-zoom-in"
              role="button"
              tabIndex={0}
              aria-label="Expand slideshow"
              onClick={() => openLightbox(slideIdx)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(slideIdx); } }}
            >
              {heroSlides.map((slide, i) => (
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
                  style={{ opacity: i === slideIdx ? 1 : 0 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Lightbox */}
    {lightboxOpen && (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={closeLightbox}
      >
        {/* Close button */}
        <button
          onClick={closeLightbox}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-0 cursor-pointer"
          aria-label="Close lightbox"
        >
          <X size={24} />
        </button>

        {/* Prev button */}
        <button
          onClick={(e) => { e.stopPropagation(); lbPrev(); }}
          className="absolute left-4 md:left-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-0 cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Image */}
        <div
          className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={heroSlides[lightboxIdx].image}
            alt={heroSlides[lightboxIdx].title}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Next button */}
        <button
          onClick={(e) => { e.stopPropagation(); lbNext(); }}
          className="absolute right-4 md:right-8 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-0 cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight size={28} />
        </button>

        {/* Dot indicators + counter */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
          <span className="font-['Inter'] text-white/60 text-sm">
            {lightboxIdx + 1} / {heroSlides.length}
          </span>
          <div className="flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                className={`h-2 rounded-full transition-all border-0 cursor-pointer ${
                  lightboxIdx === i
                    ? 'w-6 bg-[#d4af37]'
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
};


export default HomepageHero;
