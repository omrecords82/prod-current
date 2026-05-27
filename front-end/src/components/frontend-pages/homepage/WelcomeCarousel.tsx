import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// Welcome-message carousel for the OM homepage. Content is fixed (one-off
// marketing copy authored manually, then translated by claude-sonnet-4-6
// for el/ru/ro/ka). Not wired into EditableText/drafts on purpose — this
// is intended to stay stable.
//
// Each slide displays for SLIDE_DURATION_MS; manual dot navigation is also
// available, and hovering pauses the rotation.

type Lang = 'en' | 'el' | 'ru' | 'ro' | 'ka';
type Slide = { title: Record<Lang, string>; desc: Record<Lang, string> };

const SLIDES: Slide[] = [
  {
    title: {
      en: 'WELCOME TO ORTHODOX METRICS',
      el: 'ΚΑΛΩΣ ΟΡΙΣΑΤΕ ΣΤΟ ORTHODOX METRICS',
      ru: 'ДОБРО ПОЖАЛОВАТЬ В ORTHODOX METRICS',
      ro: 'BINE AȚI VENIT LA ORTHODOX METRICS',
      ka: 'მოგესალმებათ ORTHODOX METRICS',
    },
    desc: {
      en: 'Preserving Orthodox Christian records across languages, generations, and jurisdictions.',
      el: 'Διαφύλαξη των ορθόδοξων χριστιανικών αρχείων σε γλώσσες, γενιές και δικαιοδοσίες.',
      ru: 'Сохранение православных христианских записей на разных языках, в разных поколениях и юрисдикциях.',
      ro: 'Păstrarea înregistrărilor creștine ortodoxe în diferite limbi, generații și jurisdicții.',
      ka: 'მართლმადიდებელი ქრისტიანული ჩანაწერების დაცვა სხვადასხვა ენაზე, თაობებსა და იურისდიქციებში.',
    },
  },
  {
    title: {
      en: 'YOUR PARISH HAS A UNIQUE HISTORY.',
      el: 'Η ΕΝΟΡΙΑ ΣΑΣ ΕΧΕΙ ΜΙΑ ΜΟΝΑΔΙΚΗ ΙΣΤΟΡΙΑ.',
      ru: 'ВАШ ПРИХОД ИМЕЕТ УНИКАЛЬНУЮ ИСТОРИЮ.',
      ro: 'PAROHIA DUMNEAVOASTRĂ ARE O ISTORIE UNICĂ.',
      ka: 'თქვენს სამრევლოს უნიკალური ისტორია აქვს.',
    },
    desc: {
      en: 'Orthodox Metrics helps keep that history alive, secure, and accessible. Parish priests and deacons can manage sacred records, generate certificates, and gain meaningful insights from parish data without relying on scattered spreadsheets or fragile paper archives.',
      el: 'Το Orthodox Metrics βοηθά στη διατήρηση αυτής της ιστορίας ζωντανής, ασφαλούς και προσβάσιμης. Οι εφημέριοι και οι διάκονοι μπορούν να διαχειρίζονται ιερά αρχεία, να εκδίδουν πιστοποιητικά και να αντλούν ουσιαστικά στοιχεία από τα δεδομένα της ενορίας, χωρίς να βασίζονται σε διάσπαρτα υπολογιστικά φύλλα ή εύθραυστα έγγραφα αρχεία.',
      ru: 'Orthodox Metrics помогает сохранять эту историю живой, защищённой и доступной. Приходские священники и диаконы могут вести священные записи, выдавать справки и получать значимые аналитические сведения из приходских данных, не прибегая к разрозненным таблицам или ненадёжным бумажным архивам.',
      ro: 'Orthodox Metrics ajută la păstrarea acestei istorii vii, securizate și accesibile. Preoții și diaconii de parohie pot gestiona registrele sfinte, genera certificate și obține informații relevante din datele parohiale, fără a depinde de foi de calcul disparate sau arhive de hârtie fragile.',
      ka: 'Orthodox Metrics ეხმარება ამ ისტორიის ცოცხლად, უსაფრთხოდ და ხელმისაწვდომად შენარჩუნებაში. სამრევლო მღვდლებს და დიაკვნებს შეუძლიათ მართონ საეკლესიო ჩანაწერები, გასცენ სიგელები და მიიღონ მნიშვნელოვანი შეხედულებები სამრევლოს მონაცემებიდან — მიმოფანტულ ცხრილებზე ან მყიფე ქაღალდის არქივებზე დაყრდნობის გარეშე.',
    },
  },
  {
    title: {
      en: 'ONE SIGN-UP. LASTING VALUE.',
      el: 'ΜΙΑ ΕΓΓΡΑΦΗ. ΔΙΑΡΚΗΣ ΑΞΙΑ.',
      ru: 'ОДНА РЕГИСТРАЦИЯ. ДОЛГОСРОЧНАЯ ЦЕННОСТЬ.',
      ro: 'O SINGURĂ ÎNREGISTRARE. VALOARE DURABILĂ.',
      ka: 'ერთი რეგისტრაცია. მდგრადი ღირებულება.',
    },
    desc: {
      en: 'When a parish joins Orthodox Metrics, it gains a secure records system, multilingual tools, searchable history, and analytics designed specifically for the Orthodox Church. These records are not just administrative data. They are part of the living memory of the parish.',
      el: 'Όταν μια ενορία εντάσσεται στο Orthodox Metrics, αποκτά ένα ασφαλές σύστημα αρχείων, πολύγλωσσα εργαλεία, δυνατότητα αναζήτησης στο ιστορικό αρχείο και αναλυτικά στοιχεία σχεδιασμένα ειδικά για την Ορθόδοξη Εκκλησία. Αυτά τα αρχεία δεν αποτελούν απλώς διοικητικά δεδομένα. Είναι μέρος της ζωντανής μνήμης της ενορίας.',
      ru: 'Когда приход присоединяется к Orthodox Metrics, он получает защищённую систему хранения записей, многоязычные инструменты, возможность поиска по архиву и аналитику, разработанную специально для Православной Церкви. Эти записи — не просто административные данные. Они являются частью живой памяти прихода.',
      ro: 'Când o parohie se alătură Orthodox Metrics, dobândește un sistem securizat de evidență a registrelor, instrumente multilingve, un istoric căutabil și analize concepute special pentru Biserica Ortodoxă. Aceste înregistrări nu sunt doar date administrative. Ele fac parte din memoria vie a parohiei.',
      ka: 'როდესაც სამრევლო შემოუერთდება Orthodox Metrics-ს, იგი იძენს უსაფრთხო ჩანაწერების სისტემას, მრავალენოვან ხელსაწყოებს, მოძებნად ისტორიულ არქივს და ანალიტიკას, რომელიც სპეციალურად არის შექმნილი მართლმადიდებელი ეკლესიისთვის. ეს ჩანაწერები მხოლოდ ადმინისტრაციული მონაცემები არ არის. ისინი სამრევლოს ცოცხალი მეხსიერების ნაწილია.',
    },
  },
  {
    title: {
      en: 'SECURE. AUDITABLE. BUILT FOR ORTHODOX PARISHES.',
      el: 'ΑΣΦΑΛΕΣ. ΕΛΕΓΞΙΜΟ. ΣΧΕΔΙΑΣΜΕΝΟ ΓΙΑ ΟΡΘΟΔΟΞΕΣ ΕΝΟΡΙΕΣ.',
      ru: 'ЗАЩИЩЁННО. ПРОЗРАЧНО. СОЗДАНО ДЛЯ ПРАВОСЛАВНЫХ ПРИХОДОВ.',
      ro: 'SECURIZAT. AUDITABIL. CONCEPUT PENTRU PAROHIILE ORTODOXE.',
      ka: 'უსაფრთხო. გადამოწმებადი. შექმნილია მართლმადიდებელი სამრევლოებისთვის.',
    },
    desc: {
      en: 'Parish records remain protected, organized, and traceable inside a governed system designed around the real needs of Orthodox communities.',
      el: 'Τα αρχεία της ενορίας παραμένουν προστατευμένα, οργανωμένα και ανιχνεύσιμα εντός ενός διαχειριζόμενου συστήματος σχεδιασμένου γύρω από τις πραγματικές ανάγκες των ορθόδοξων κοινοτήτων.',
      ru: 'Приходские записи остаются защищёнными, упорядоченными и прослеживаемыми в рамках управляемой системы, созданной с учётом реальных потребностей православных общин.',
      ro: 'Registrele parohiale rămân protejate, organizate și trasabile într-un sistem guvernat, conceput în jurul nevoilor reale ale comunităților ortodoxe.',
      ka: 'სამრევლოს ჩანაწერები დაცული, მოწესრიგებული და თვალსადევნებელი რჩება მართვადი სისტემის ფარგლებში, რომელიც შექმნილია მართლმადიდებელი თემების რეალური საჭიროებების გარშემო.',
    },
  },
];

const SLIDE_DURATION_MS = 8000;
const SUPPORTED: readonly Lang[] = ['en', 'el', 'ru', 'ro', 'ka'];

const WelcomeCarousel = () => {
  const { lang } = useLanguage();
  const activeLang: Lang = (SUPPORTED as readonly string[]).includes(lang) ? (lang as Lang) : 'en';

  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => {
      setPrev(active);
      setActive((a) => (a + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [active, paused]);

  const slideClass = (i: number) => {
    const base =
      'absolute inset-0 px-6 md:px-12 py-10 md:py-12 flex flex-col items-center justify-center text-center transition-all duration-700 ease-out';
    if (i === active) return `${base} translate-y-0 opacity-100`;
    if (i === prev) return `${base} -translate-y-full opacity-0`;
    return `${base} translate-y-full opacity-0`;
  };

  return (
    <section className="bg-gradient-to-b from-white to-[#f9fafb] dark:from-gray-900 dark:to-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div
          className="relative h-[260px] md:h-[220px] rounded-2xl bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 shadow-sm overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-roledescription="carousel"
          aria-label="Welcome to Orthodox Metrics"
        >
          {SLIDES.map((slide, i) => (
            <div key={i} className={slideClass(i)} aria-hidden={active !== i}>
              <h2
                className="font-['Georgia'] text-2xl md:text-3xl text-[#2d1b4e] dark:text-white tracking-wide mb-3"
                lang={activeLang}
              >
                {slide.title[activeLang]}
              </h2>
              <p
                className="font-['Inter'] text-[15px] md:text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed max-w-3xl"
                lang={activeLang}
              >
                {slide.desc[activeLang]}
              </p>
            </div>
          ))}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => {
                  setPrev(active);
                  setActive(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  active === i
                    ? 'w-6 bg-[#d4af37]'
                    : 'w-2 bg-[#2d1b4e]/20 dark:bg-white/30 hover:bg-[#2d1b4e]/40 dark:hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WelcomeCarousel;
