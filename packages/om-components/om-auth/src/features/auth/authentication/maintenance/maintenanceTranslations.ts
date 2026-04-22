/**
 * Self-contained translations for the maintenance page.
 * These are bundled (not fetched from API) because the backend may be
 * unavailable during maintenance windows.
 */

export type MaintenanceLang = 'en' | 'el' | 'ru' | 'ro' | 'ka';

export interface MaintenanceTranslation {
  brandName: string;
  pageTitle: string;
  description: string;
  whatIsHappening: string;
  deploymentInfo: string;
  contactPrefix: string;
  contactEmail: string;
  languageHint: string;
}

export const MAINTENANCE_LANGUAGES: { code: MaintenanceLang; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'el', nativeName: 'Ελληνικά' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'ro', nativeName: 'Română' },
  { code: 'ka', nativeName: 'ქართული' },
];

export const maintenanceTranslations: Record<MaintenanceLang, MaintenanceTranslation> = {
  en: {
    brandName: 'ORTHODOX METRICS',
    pageTitle: 'Under Maintenance',
    description:
      'Orthodox Metrics is currently being updated with new features and improvements. We\'ll be back online shortly. Thank you for your patience.',
    whatIsHappening: 'WHAT IS HAPPENING',
    deploymentInfo:
      'We are deploying improvements and new features. This typically takes less than two minutes.',
    contactPrefix: 'Questions? Contact us at',
    contactEmail: 'support@orthodoxmetrics.com',
    languageHint: 'This page is available in your preferred language',
  },
  el: {
    brandName: 'ORTHODOX METRICS',
    pageTitle: 'Συντήρηση Συστήματος',
    description:
      'Το Orthodox Metrics ενημερώνεται αυτή τη στιγμή με νέες λειτουργίες και βελτιώσεις. Θα επιστρέψουμε σύντομα. Ευχαριστούμε για την υπομονή σας.',
    whatIsHappening: 'ΤΙ ΣΥΜΒΑΙΝΕΙ',
    deploymentInfo:
      'Εγκαθιστούμε βελτιώσεις και νέες λειτουργίες. Συνήθως διαρκεί λιγότερο από δύο λεπτά.',
    contactPrefix: 'Ερωτήσεις; Επικοινωνήστε μαζί μας στο',
    contactEmail: 'support@orthodoxmetrics.com',
    languageHint: 'Αυτή η σελίδα είναι διαθέσιμη στη γλώσσα που προτιμάτε',
  },
  ru: {
    brandName: 'ORTHODOX METRICS',
    pageTitle: 'Технические Работы',
    description:
      'В данный момент Orthodox Metrics обновляется — добавляются новые функции и улучшения. Мы скоро вернёмся. Спасибо за понимание.',
    whatIsHappening: 'ЧТО ПРОИСХОДИТ',
    deploymentInfo:
      'Мы внедряем улучшения и новые функции. Обычно это занимает менее двух минут.',
    contactPrefix: 'Вопросы? Свяжитесь с нами:',
    contactEmail: 'support@orthodoxmetrics.com',
    languageHint: 'Эта страница доступна на выбранном вами языке',
  },
  ro: {
    brandName: 'ORTHODOX METRICS',
    pageTitle: 'În Mentenanță',
    description:
      'Orthodox Metrics este în prezent actualizat cu funcții noi și îmbunătățiri. Vom reveni în curând. Vă mulțumim pentru răbdare.',
    whatIsHappening: 'CE SE ÎNTÂMPLĂ',
    deploymentInfo:
      'Implementăm îmbunătățiri și funcții noi. De obicei, acest proces durează mai puțin de două minute.',
    contactPrefix: 'Întrebări? Contactați-ne la',
    contactEmail: 'support@orthodoxmetrics.com',
    languageHint: 'Această pagină este disponibilă în limba preferată',
  },
  ka: {
    brandName: 'ORTHODOX METRICS',
    pageTitle: 'ტექნიკური სამუშაოები',
    description:
      'Orthodox Metrics ამჟამად ახლდება ახალი ფუნქციებითა და გაუმჯობესებებით. მალე დავბრუნდებით. გმადლობთ მოთმინებისთვის.',
    whatIsHappening: 'რა ხდება',
    deploymentInfo:
      'ჩვენ ვნერგავთ გაუმჯობესებებს და ახალ ფუნქციებს. ეს ჩვეულებრივ გრძელდება ორ წუთზე ნაკლებ ხანს.',
    contactPrefix: 'კითხვები? დაგვიკავშირდით:',
    contactEmail: 'support@orthodoxmetrics.com',
    languageHint: 'ეს გვერდი ხელმისაწვდომია თქვენს სასურველ ენაზე',
  },
};
