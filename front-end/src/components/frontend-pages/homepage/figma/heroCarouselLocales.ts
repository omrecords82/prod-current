export interface Locale {
  code: string;
  flag: string;
  nativeName: string;
  displayFont: string;   // for headlines and labels
  bodyFont: string;      // for body copy
  letterSpacingScale: number; // multiplier for letter-spacing (CJK/Georgian need 0)

  // ── Top bar ─────────────────────────────────
  navPlatform: string;
  navParishes: string;
  navSecurity: string;
  navAbout: string;

  // ── Left: static copy ───────────────────────
  welcomeEyebrow: string;
  mainHeadline: string[];       // split lines
  goldSubheadline: string;
  bodyText: string;
  primaryCta: string;
  secondaryCta: string;
  bullets: string[];

  // ── Left: per-slide focus ───────────────────
  slides: { badge: string; desc: string }[];

  // ── Right: panel headers ────────────────────
  panelParish: string;
  panelCerts: string;
  panelRecords: string;
  panelOcr: string;
  panelBook: string;
  ecosystemLabel: string;

  // ── Book panel ──────────────────────────────
  bookPageTitle: string;
  bookChurchName: string;
  bookCols: string[];           // No. | Name | Sacrament | Date
  bookSacrament: string;

  // ── OCR panel ───────────────────────────────
  ocrDocName: string;
  ocrAccuracy: string;
  ocrTabs: string[];            // Source | Fields | Review | History
  ocrExtraction: string;
  ocrFields: { label: string }[];
  ocrProgress: string;
  ocrProgressOf: string;

  // ── Records panel ────────────────────────────
  recSearch: string;
  recFilters: string[];         // All | Baptism | Marriage | Funeral | Pending
  recCols: string[];            // Record ID | Name | Type | Date | Parish | Status
  recStatuses: string[];        // Verified | Pending | Review
  recShowing: string;

  // ── Certs panel ──────────────────────────────
  certDocTypeLabel: string;
  certTypes: string[];          // Baptism | Marriage | Funeral
  certTitle: string;
  certChurch: string;
  certBody: string;             // "This is to certify that..."
  certOn: string;               // "on the Xth day of..."
  certPriest: string;
  certVerified: string;
  certGenerate: string;
  certFormats: string[];        // PDF | Print | Archive

  // ── Parish ops panel ─────────────────────────
  metricLabels: string[];       // Parishes | Records | Certificates | Users
  metricSubs: string[];
  chartLabel: string;
  activityLabel: string;
  activityItems: { action: string; who: string }[];
  viewingAll: string;
  usersLabel: string;
  manageUsersBtn: string;
}

// ─────────────────────────────────────────────────────────────────
// ENGLISH (master reference)
// ─────────────────────────────────────────────────────────────────
export const EN: Locale = {
  code: "en", flag: "🇬🇧", nativeName: "English",
  displayFont: "Cinzel, serif", bodyFont: "Crimson Pro, serif",
  letterSpacingScale: 1,

  navPlatform: "Platform", navParishes: "Parishes", navSecurity: "Security", navAbout: "About",

  welcomeEyebrow: "WELCOME TO ORTHODOX METRICS",
  mainHeadline: ["The Complete Parish", "Records Platform"],
  goldSubheadline: "for Orthodox Churches",
  bodyText: "Digitize, preserve, search, manage, and generate official documents from baptism, marriage, and funeral records through one secure Orthodox parish platform.",
  primaryCta: "ENROLL YOUR PARISH",
  secondaryCta: "EXPLORE THE PLATFORM",
  bullets: [
    "Baptism • Marriage • Funeral Records",
    "Secure Parish Record Preservation",
    "Built for Orthodox Churches",
  ],

  slides: [
    { badge: "COMPLETE PLATFORM",   desc: "From historic sacramental books to digital certificates — one connected Orthodox parish records system." },
    { badge: "OCR & DIGITIZATION",  desc: "Convert handwritten baptism, marriage, and funeral registers into searchable, structured digital records with intelligent field extraction." },
    { badge: "RECORD MANAGEMENT",   desc: "Search, filter, review, and audit every sacramental record across all your parishes with full permission controls." },
    { badge: "CERTIFICATES & REPORTS", desc: "Generate official Orthodox parish certificates and documentation directly from verified sacramental records." },
    { badge: "PARISH OPERATIONS",   desc: "Onboard parishes, manage users and roles, view analytics, and oversee multi-parish record operations from one dashboard." },
  ],

  panelParish: "PARISH OPERATIONS", panelCerts: "CERTIFICATES & REPORTS",
  panelRecords: "RECORD MANAGEMENT", panelOcr: "OCR STUDIO",
  panelBook: "HISTORIC RECORDS", ecosystemLabel: "PLATFORM ECOSYSTEM",

  bookPageTitle: "BOOK OF BAPTISMS", bookChurchName: "ST. GEORGE ORTHODOX CHURCH",
  bookCols: ["No.", "Full Name", "Sacrament", "Date"], bookSacrament: "Baptism",

  ocrDocName: "Baptism_Register_1985.pdf", ocrAccuracy: "94% ACCURACY",
  ocrTabs: ["Source", "Fields", "Review", "History"],
  ocrExtraction: "FIELD EXTRACTION",
  ocrFields: [{ label: "Full Name" }, { label: "Date" }, { label: "Parish" }, { label: "Godparent" }, { label: "Priest" }],
  ocrProgress: "PROCESSING", ocrProgressOf: "of",

  recSearch: "Search records…",
  recFilters: ["All", "Baptism", "Marriage", "Funeral", "Pending"],
  recCols: ["Record ID", "Name", "Type", "Date", "Parish", "Status"],
  recStatuses: ["Verified", "Pending", "Review"],
  recShowing: "Showing 1–25 of 12,847 records",

  certDocTypeLabel: "DOCUMENT TYPE",
  certTypes: ["Baptism", "Marriage", "Funeral"],
  certTitle: "CERTIFICATE OF BAPTISM",
  certChurch: "ST. GEORGE ORTHODOX CHURCH",
  certBody: "This is to certify that",
  certOn: "was received into the Holy Orthodox Church through the Sacred Sacrament of Baptism on the",
  certPriest: "Presiding Priest",
  certVerified: "VERIFIED SOURCE RECORD",
  certGenerate: "GENERATE DOCUMENT",
  certFormats: ["PDF", "Print", "Archive"],

  metricLabels: ["PARISHES", "RECORDS", "CERTIFICATES", "USERS"],
  metricSubs: ["+3 this year", "All sacraments", "Issued 2024", "Staff & clergy"],
  chartLabel: "RECORD ACTIVITY",
  activityLabel: "RECENT ACTIVITY",
  activityItems: [
    { action: "Certificate issued",        who: "St. George" },
    { action: "New parish enrolled",       who: "St. Nicholas" },
    { action: "Records digitization done", who: "Holy Trinity" },
    { action: "User role updated",         who: "Admin" },
  ],
  viewingAll: "All 48 Parishes ▾",
  usersLabel: "214 active · 18 roles",
  manageUsersBtn: "MANAGE USERS",
};

// ─────────────────────────────────────────────────────────────────
// GREEK
// ─────────────────────────────────────────────────────────────────
export const GR: Locale = {
  code: "gr", flag: "🇬🇷", nativeName: "Ελληνικά",
  displayFont: "Noto Serif, serif", bodyFont: "Noto Serif, serif",
  letterSpacingScale: 0.4,

  navPlatform: "Πλατφόρμα", navParishes: "Ενορίες", navSecurity: "Ασφάλεια", navAbout: "Σχετικά",

  welcomeEyebrow: "ΚΑΛΩΣ ΗΡΘΑΤΕ ΣΤΟ ORTHODOX METRICS",
  mainHeadline: ["Η Πλήρης Πλατφόρμα", "Ενοριακών Αρχείων"],
  goldSubheadline: "για Ορθόδοξες Εκκλησίες",
  bodyText: "Ψηφιοποιήστε, διαφυλάξτε, αναζητήστε, διαχειριστείτε και δημιουργήστε επίσημα έγγραφα από αρχεία βαπτίσεων, γάμων και κηδειών μέσα από μία ασφαλή ορθόδοξη ενοριακή πλατφόρμα.",
  primaryCta: "ΕΓΓΡΑΦΗ ΕΝΟΡΙΑΣ",
  secondaryCta: "ΕΞΕΡΕΥΝΗΣΗ ΠΛΑΤΦΟΡΜΑΣ",
  bullets: [
    "Βάπτιση • Γάμος • Αρχεία Κηδειών",
    "Ασφαλής Διαφύλαξη Ενοριακών Αρχείων",
    "Σχεδιασμένο για Ορθόδοξες Εκκλησίες",
  ],

  slides: [
    { badge: "ΠΛΗΡΗΣ ΠΛΑΤΦΟΡΜΑ",      desc: "Από ιστορικά ιερά βιβλία έως ψηφιακά πιστοποιητικά — ένα ολοκληρωμένο σύστημα ενοριακών αρχείων." },
    { badge: "OCR & ΨΗΦΙΟΠΟΙΗΣΗ",     desc: "Μετατρέψτε χειρόγραφα μητρώα βαπτίσεων, γάμων και κηδειών σε αναζητήσιμα, δομημένα ψηφιακά αρχεία." },
    { badge: "ΔΙΑΧΕΙΡΙΣΗ ΑΡΧΕΙΩΝ",    desc: "Αναζητήστε, φιλτράρετε, ελέγξτε και επιθεωρήστε κάθε ιερό αρχείο από όλες τις ενορίες σας." },
    { badge: "ΠΙΣΤΟΠΟΙΗΤΙΚΑ",         desc: "Δημιουργήστε επίσημα ορθόδοξα ενοριακά πιστοποιητικά από επαληθευμένα ιερά αρχεία." },
    { badge: "ΕΝΟΡΙΑΚΕΣ ΛΕΙΤΟΥΡΓΙΕΣ", desc: "Διαχειριστείτε χρήστες, αναλύστε δεδομένα και επιβλέψτε τις λειτουργίες πολλών ενοριών από έναν πίνακα." },
  ],

  panelParish: "ΕΝΟΡΙΑΚΕΣ ΛΕΙΤΟΥΡΓΙΕΣ", panelCerts: "ΠΙΣΤΟΠΟΙΗΤΙΚΑ & ΑΝΑΦΟΡΕΣ",
  panelRecords: "ΔΙΑΧΕΙΡΙΣΗ ΑΡΧΕΙΩΝ", panelOcr: "OCR STUDIO",
  panelBook: "ΙΣΤΟΡΙΚΑ ΑΡΧΕΙΑ", ecosystemLabel: "ΟΙΚΟΣΥΣΤΗΜΑ ΠΛΑΤΦΟΡΜΑΣ",

  bookPageTitle: "ΒΙΒΛΙΟ ΒΑΠΤΙΣΕΩΝ", bookChurchName: "ΑΓ. ΓΕΩΡΓΙΟΣ ΟΡΘΟΔΟΞΗ ΕΝΟΡΙΑ",
  bookCols: ["Αρ.", "Πλήρες Όνομα", "Μυστήριο", "Ημερομηνία"], bookSacrament: "Βάπτιση",

  ocrDocName: "Mitroο_Baptiseon_1985.pdf", ocrAccuracy: "94% ΑΚΡΙΒΕΙΑ",
  ocrTabs: ["ΠΗΓΗ", "ΠΕΔΙΑ", "ΕΛΕΓΧΟΣ", "ΙΣΤΟΡΙΚΟ"],
  ocrExtraction: "ΕΞΑΓΩΓΗ ΠΕΔΙΩΝ",
  ocrFields: [{ label: "ΠΛΗΡΕΣ ΟΝΟΜΑ" }, { label: "ΗΜΕΡΟΜΗΝΙΑ" }, { label: "ΕΝΟΡΙΑ" }, { label: "ΑΝAΔΟΧΟΣ" }, { label: "ΙΕΡΕΑΣ" }],
  ocrProgress: "ΕΠΕΞΕΡΓΑΣΙΑ", ocrProgressOf: "από",

  recSearch: "Αναζήτηση αρχείων…",
  recFilters: ["ΟΛΑ", "ΒΑΠΤΙΣΗ", "ΓΑΜΟΣ", "ΚΗΔΕΙΑ", "ΕΚΚΡΕΜΗ"],
  recCols: ["Κωδικός", "Όνομα", "Τύπος", "Ημ/νία", "Ενορία", "Κατάσταση"],
  recStatuses: ["Επαληθευμένο", "Εκκρεμεί", "Έλεγχος"],
  recShowing: "Εμφάνιση 1–25 από 12.847 αρχεία",

  certDocTypeLabel: "ΤΥΠΟΣ ΕΓΓΡΑΦΟΥ",
  certTypes: ["Βάπτιση", "Γάμος", "Κηδεία"],
  certTitle: "ΠΙΣΤΟΠΟΙΗΤΙΚΟ ΒΑΠΤΙΣΗΣ",
  certChurch: "ΑΓ. ΓΕΩΡΓΙΟΣ ΟΡΘΟΔΟΞΗ ΕΝΟΡΙΑ",
  certBody: "Βεβαιώνεται ότι",
  certOn: "εντάχθηκε στην Αγία Ορθόδοξη Εκκλησία διά του Ιερού Μυστηρίου της Βαπτίσεως την",
  certPriest: "Εφημέριος",
  certVerified: "ΕΠΑΛΗΘΕΥΜΕΝΟ ΑΡΧΕΙΟ ΠΗΓΗΣ",
  certGenerate: "ΔΗΜΙΟΥΡΓΙΑ ΕΓΓΡΑΦΟΥ",
  certFormats: ["PDF", "Εκτύπωση", "Αρχείο"],

  metricLabels: ["ΕΝΟΡΙΕΣ", "ΑΡΧΕΙΑ", "ΠΙΣΤΟΠΟΙΗΤΙΚΑ", "ΧΡΗΣΤΕΣ"],
  metricSubs: ["+3 φέτος", "Όλα τα μυστήρια", "Εκδόθηκαν 2024", "Προσωπικό & κλήρος"],
  chartLabel: "ΔΡΑΣΤΗΡΙΟΤΗΤΑ ΑΡΧΕΙΩΝ",
  activityLabel: "ΠΡΟΣΦΑΤΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ",
  activityItems: [
    { action: "Εκδόθηκε πιστοποιητικό",    who: "Άγ. Γεώργιος" },
    { action: "Νέα ενορία εντάχθηκε",       who: "Άγ. Νικόλαος" },
    { action: "Ψηφιοποίηση αρχείων ολοκληρώθηκε", who: "Αγία Τριάδα" },
    { action: "Ρόλος χρήστη ενημερώθηκε",  who: "Admin" },
  ],
  viewingAll: "Όλες οι 48 Ενορίες ▾",
  usersLabel: "214 ενεργοί · 18 ρόλοι",
  manageUsersBtn: "ΔΙΑΧΕΙΡΙΣΗ ΧΡΗΣΤΩΝ",
};

// ─────────────────────────────────────────────────────────────────
// RUSSIAN
// ─────────────────────────────────────────────────────────────────
export const RU: Locale = {
  code: "ru", flag: "🇷🇺", nativeName: "Русский",
  displayFont: "Noto Serif, serif", bodyFont: "Noto Serif, serif",
  letterSpacingScale: 0.3,

  navPlatform: "Платформа", navParishes: "Приходы", navSecurity: "Безопасность", navAbout: "О нас",

  welcomeEyebrow: "ДОБРО ПОЖАЛОВАТЬ В ORTHODOX METRICS",
  mainHeadline: ["Полная платформа", "приходских записей"],
  goldSubheadline: "для православных храмов",
  bodyText: "Оцифровывайте, сохраняйте, ищите, управляйте и создавайте официальные документы на основе записей о крещениях, браках и отпеваниях в одной защищённой православной приходской платформе.",
  primaryCta: "ЗАРЕГИСТРИРОВАТЬ ПРИХОД",
  secondaryCta: "ИЗУЧИТЬ ПЛАТФОРМУ",
  bullets: [
    "Крещение • Брак • Записи об отпеваниях",
    "Безопасное сохранение приходских записей",
    "Создано для православных храмов",
  ],

  slides: [
    { badge: "ПОЛНАЯ ПЛАТФОРМА",      desc: "От исторических метрических книг до цифровых свидетельств — единая православная система приходских записей." },
    { badge: "OCR И ОЦИФРОВКА",       desc: "Преобразуйте рукописные метрические книги о крещениях, браках и отпеваниях в структурированные цифровые записи с поиском." },
    { badge: "УПРАВЛЕНИЕ ЗАПИСЯМИ",   desc: "Ищите, фильтруйте, проверяйте и контролируйте каждую запись по всем вашим приходам с полным управлением доступом." },
    { badge: "СВИДЕТЕЛЬСТВА",         desc: "Создавайте официальные православные приходские свидетельства непосредственно из верифицированных записей." },
    { badge: "ПРИХОДСКИЕ ОПЕРАЦИИ",   desc: "Управляйте пользователями, просматривайте аналитику и контролируйте операции нескольких приходов из единой панели." },
  ],

  panelParish: "ПРИХОДСКИЕ ОПЕРАЦИИ", panelCerts: "СВИДЕТЕЛЬСТВА И ОТЧЁТЫ",
  panelRecords: "УПРАВЛЕНИЕ ЗАПИСЯМИ", panelOcr: "OCR STUDIO",
  panelBook: "ИСТОРИЧЕСКИЕ ЗАПИСИ", ecosystemLabel: "ЭКОСИСТЕМА ПЛАТФОРМЫ",

  bookPageTitle: "КНИГА КРЕЩЕНИЙ", bookChurchName: "ХРАМ СВ. ГЕОРГИЯ",
  bookCols: ["№", "Полное имя", "Таинство", "Дата"], bookSacrament: "Крещение",

  ocrDocName: "Metricheskaya_Kniga_1985.pdf", ocrAccuracy: "94% ТОЧНОСТЬ",
  ocrTabs: ["ИСТОЧНИК", "ПОЛЯ", "ПРОВЕРКА", "ИСТОРИЯ"],
  ocrExtraction: "ИЗВЛЕЧЕНИЕ ПОЛЕЙ",
  ocrFields: [{ label: "ПОЛНОЕ ИМЯ" }, { label: "ДАТА" }, { label: "ПРИХОД" }, { label: "КРЁСТНЫЙ" }, { label: "СВЯЩЕННИК" }],
  ocrProgress: "ОБРАБОТКА", ocrProgressOf: "из",

  recSearch: "Поиск записей…",
  recFilters: ["ВСЕ", "КРЕЩЕНИЕ", "БРАК", "ОТПЕВАНИЕ", "В ОЖИДАНИИ"],
  recCols: ["Номер записи", "Имя", "Тип", "Дата", "Приход", "Статус"],
  recStatuses: ["Проверено", "Ожидает", "На проверке"],
  recShowing: "Показано 1–25 из 12 847 записей",

  certDocTypeLabel: "ТИП ДОКУМЕНТА",
  certTypes: ["Крещение", "Брак", "Отпевание"],
  certTitle: "СВИДЕТЕЛЬСТВО О КРЕЩЕНИИ",
  certChurch: "ХРАМ СВ. ГЕОРГИЯ",
  certBody: "Настоящим удостоверяется, что",
  certOn: "был принят в Святую Православную Церковь через Священное Таинство Крещения",
  certPriest: "Настоятель прихода",
  certVerified: "ВЕРИФИЦИРОВАННАЯ ЗАПИСЬ",
  certGenerate: "СОЗДАТЬ ДОКУМЕНТ",
  certFormats: ["PDF", "Печать", "Архив"],

  metricLabels: ["ПРИХОДЫ", "ЗАПИСИ", "СВИДЕТЕЛЬСТВА", "ПОЛЬЗОВАТЕЛИ"],
  metricSubs: ["+3 в этом году", "Все таинства", "Выдано в 2024", "Персонал и клир"],
  chartLabel: "АКТИВНОСТЬ ЗАПИСЕЙ",
  activityLabel: "ПОСЛЕДНИЕ СОБЫТИЯ",
  activityItems: [
    { action: "Свидетельство выдано",      who: "Хр. Св. Георгия" },
    { action: "Новый приход зарегистрирован", who: "Хр. Св. Николая" },
    { action: "Оцифровка завершена",       who: "Свято-Троицкий" },
    { action: "Роль пользователя обновлена", who: "Admin" },
  ],
  viewingAll: "Все 48 приходов ▾",
  usersLabel: "214 активных · 18 ролей",
  manageUsersBtn: "УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ",
};

// ─────────────────────────────────────────────────────────────────
// ROMANIAN
// ─────────────────────────────────────────────────────────────────
export const RO: Locale = {
  code: "ro", flag: "🇷🇴", nativeName: "Română",
  displayFont: "Noto Serif, serif", bodyFont: "Noto Serif, serif",
  letterSpacingScale: 0.5,

  navPlatform: "Platformă", navParishes: "Parohii", navSecurity: "Securitate", navAbout: "Despre",

  welcomeEyebrow: "BINE AȚI VENIT LA ORTHODOX METRICS",
  mainHeadline: ["Platforma completă pentru", "registre parohiale"],
  goldSubheadline: "pentru Biserici Ortodoxe",
  bodyText: "Digitalizați, păstrați, căutați, administrați și generați documente oficiale din registre de botez, cununie și înmormântare printr-o singură platformă ortodoxă parohială securizată.",
  primaryCta: "ÎNSCRIEȚI PAROHIA",
  secondaryCta: "EXPLORAȚI PLATFORMA",
  bullets: [
    "Botez • Cununie • Registre de Înmormântare",
    "Păstrare Securizată a Registrelor Parohiale",
    "Creat pentru Biserici Ortodoxe",
  ],

  slides: [
    { badge: "PLATFORMĂ COMPLETĂ",       desc: "De la cărți sacramentale istorice la certificate digitale — un sistem unitar de registre parohiale ortodoxe." },
    { badge: "OCR & DIGITALIZARE",        desc: "Transformați registrele manuscrise de botez, cununie și înmormântare în înregistrări digitale structurate, căutabile." },
    { badge: "ADMINISTRAREA REGISTRELOR", desc: "Căutați, filtrați, revizuiți și auditați fiecare înregistrare sacramentală din toate parohiile dvs." },
    { badge: "CERTIFICATE",               desc: "Generați certificate parohiale ortodoxe oficiale direct din înregistrările sacramentale verificate." },
    { badge: "OPERAȚIUNI PAROHIALE",      desc: "Gestionați utilizatorii, vizualizați analize și supravegheați operațiunile mai multor parohii dintr-un singur tablou de bord." },
  ],

  panelParish: "OPERAȚIUNI PAROHIALE", panelCerts: "CERTIFICATE & RAPOARTE",
  panelRecords: "ADMINISTRAREA REGISTRELOR", panelOcr: "OCR STUDIO",
  panelBook: "REGISTRE ISTORICE", ecosystemLabel: "ECOSISTEMUL PLATFORMEI",

  bookPageTitle: "REGISTRU DE BOTEZ", bookChurchName: "PAROHIA SF. GHEORGHE",
  bookCols: ["Nr.", "Nume complet", "Taină", "Dată"], bookSacrament: "Botez",

  ocrDocName: "Registru_Botez_1985.pdf", ocrAccuracy: "94% ACURATEȚE",
  ocrTabs: ["SURSĂ", "CÂMPURI", "REVIZUIRE", "ISTORIC"],
  ocrExtraction: "EXTRAGERE CÂMPURI",
  ocrFields: [{ label: "NUME COMPLET" }, { label: "DATĂ" }, { label: "PAROHIE" }, { label: "NAS/NAȘĂ" }, { label: "PREOT" }],
  ocrProgress: "PROCESARE", ocrProgressOf: "din",

  recSearch: "Căutați în registre…",
  recFilters: ["TOATE", "BOTEZ", "CUNUNIE", "ÎNMORMÂNTARE", "ÎN AȘTEPTARE"],
  recCols: ["ID Înregistrare", "Nume", "Tip", "Dată", "Parohie", "Statut"],
  recStatuses: ["Verificat", "În așteptare", "Revizuire"],
  recShowing: "Afișare 1–25 din 12.847 înregistrări",

  certDocTypeLabel: "TIP DOCUMENT",
  certTypes: ["Botez", "Cununie", "Înmormântare"],
  certTitle: "CERTIFICAT DE BOTEZ",
  certChurch: "PAROHIA SF. GHEORGHE",
  certBody: "Se certifică prin prezenta că",
  certOn: "a fost primit în Sfânta Biserică Ortodoxă prin Sfânta Taină a Botezului la data de",
  certPriest: "Preot paroh",
  certVerified: "ÎNREGISTRARE SURSĂ VERIFICATĂ",
  certGenerate: "GENEREAZĂ DOCUMENT",
  certFormats: ["PDF", "Tipărire", "Arhivă"],

  metricLabels: ["PAROHII", "REGISTRE", "CERTIFICATE", "UTILIZATORI"],
  metricSubs: ["+3 în acest an", "Toate tainele", "Emise în 2024", "Personal & cler"],
  chartLabel: "ACTIVITATE REGISTRE",
  activityLabel: "ACTIVITATE RECENTĂ",
  activityItems: [
    { action: "Certificat emis",            who: "Sf. Gheorghe" },
    { action: "Parohie nouă înscrisă",      who: "Sf. Nicolae" },
    { action: "Digitalizare finalizată",    who: "Sfânta Treime" },
    { action: "Rol utilizator actualizat",  who: "Admin" },
  ],
  viewingAll: "Toate cele 48 parohii ▾",
  usersLabel: "214 activi · 18 roluri",
  manageUsersBtn: "GESTIONARE UTILIZATORI",
};

// ─────────────────────────────────────────────────────────────────
// GEORGIAN
// ─────────────────────────────────────────────────────────────────
export const KA: Locale = {
  code: "ka", flag: "🇬🇪", nativeName: "ქართული",
  displayFont: "Noto Serif Georgian, serif", bodyFont: "Noto Serif Georgian, serif",
  letterSpacingScale: 0,

  navPlatform: "პლატფორმა", navParishes: "სამრევლოები", navSecurity: "უსაფრთხოება", navAbout: "ჩვენ შესახებ",

  welcomeEyebrow: "კეთილი იყოს თქვენი მობრძანება ORTHODOX METRICS-ში",
  mainHeadline: ["სრული პლატფორმა", "სამრევლო ჩანაწერებისთვის"],
  goldSubheadline: "მართლმადიდებელი ეკლესიებისთვის",
  bodyText: "გააციფრულეთ, შეინახეთ, მოძებნეთ, მართეთ და შექმენით ოფიციალური დოკუმენტები ნათლობის, ქორწინებისა და დაკრძალვის ჩანაწერებიდან ერთ უსაფრთხო მართლმადიდებლურ სამრევლო პლატფორმაში.",
  primaryCta: "დაარეგისტრირეთ სამრევლო",
  secondaryCta: "დაათვალიერეთ პლატფორმა",
  bullets: [
    "ნათლობა • ქორწინება • დაკრძალვის ჩანაწერები",
    "სამრევლო ჩანაწერების უსაფრთხო დაცვა",
    "შექმნილია მართლმადიდებელი ეკლესიებისთვის",
  ],

  slides: [
    { badge: "სრული პლატფორმა",         desc: "ისტორიული საიდუმლო წიგნებიდან ციფრულ სერტიფიკატებამდე — ერთი დაკავშირებული სამრევლო ჩანაწერების სისტემა." },
    { badge: "OCR და გაციფრულება",      desc: "გადააქციეთ ხელნაწერი ნათლობის, ქორწინებისა და დაკრძალვის რეესტრები საძიებო, სტრუქტურირებულ ციფრულ ჩანაწერებად." },
    { badge: "ჩანაწერების მართვა",      desc: "მოძებნეთ, გაფილტრეთ, გადახედეთ და შეამოწმეთ თითოეული ჩანაწერი ყველა სამრევლოში." },
    { badge: "სერტიფიკატები",           desc: "შექმენით ოფიციალური მართლმადიდებლური სამრევლო სერტიფიკატები დადასტურებული ჩანაწერებიდან." },
    { badge: "სამრევლო ოპერაციები",     desc: "მართეთ მომხმარებლები, ნახეთ ანალიტიკა და მართეთ მრავალი სამრევლოს ოპერაციები ერთი პანელიდან." },
  ],

  panelParish: "სამრევლო ოპერაციები", panelCerts: "სერტიფიკატები და ანგარიშები",
  panelRecords: "ჩანაწერების მართვა", panelOcr: "OCR STUDIO",
  panelBook: "ისტორიული ჩანაწერები", ecosystemLabel: "პლატფორმის ეკოსისტემა",

  bookPageTitle: "ნათლობის წიგნი", bookChurchName: "წმ. გიორგის ეკლესია",
  bookCols: ["№", "სრული სახელი", "საიდუმლო", "თარიღი"], bookSacrament: "ნათლობა",

  ocrDocName: "Natloba_Reestri_1985.pdf", ocrAccuracy: "94% სიზუსტე",
  ocrTabs: ["წყარო", "ველები", "შემოწმება", "ისტორია"],
  ocrExtraction: "ველების ამოღება",
  ocrFields: [{ label: "სრული სახელი" }, { label: "თარიღი" }, { label: "სამრევლო" }, { label: "ნათლიამამა" }, { label: "მღვდელი" }],
  ocrProgress: "დამუშავება", ocrProgressOf: "–დან",

  recSearch: "ჩანაწერების ძიება…",
  recFilters: ["ყველა", "ნათლობა", "ქორწინება", "დაკრძალვა", "მოლოდინში"],
  recCols: ["ID", "სახელი", "ტიპი", "თარიღი", "სამრევლო", "სტატუსი"],
  recStatuses: ["დადასტურებული", "მოლოდინში", "შემოწმება"],
  recShowing: "ნაჩვენებია 1–25, სულ 12 847 ჩანაწერი",

  certDocTypeLabel: "დოკუმენტის ტიპი",
  certTypes: ["ნათლობა", "ქორწინება", "დაკრძალვა"],
  certTitle: "ნათლობის სერტიფიკატი",
  certChurch: "წმ. გიორგის ეკლესია",
  certBody: "დამოწმებულია, რომ",
  certOn: "მიიღო წმინდა მართლმადიდებელ ეკლესიაში ნათლობის წმინდა საიდუმლოს მეშვეობით",
  certPriest: "მრევლის მღვდელი",
  certVerified: "დადასტურებული წყაროს ჩანაწერი",
  certGenerate: "დოკუმენტის გენერირება",
  certFormats: ["PDF", "ბეჭდვა", "არქივი"],

  metricLabels: ["სამრევლოები", "ჩანაწერები", "სერტიფიკატები", "მომხმარებლები"],
  metricSubs: ["+3 წელს", "ყველა საიდუმლო", "გაცემული 2024", "პერსონალი და სამღვდელოება"],
  chartLabel: "ჩანაწერების აქტივობა",
  activityLabel: "ბოლო აქტივობა",
  activityItems: [
    { action: "სერტიფიკატი გაიცა",     who: "წმ. გიორგი" },
    { action: "ახალი სამრევლო დაემატა", who: "წმ. ნიკოლოზი" },
    { action: "გაციფრულება დასრულდა",  who: "სამება" },
    { action: "მომხმარებლის როლი განახლდა", who: "Admin" },
  ],
  viewingAll: "ყველა 48 სამრევლო ▾",
  usersLabel: "214 აქტიური · 18 როლი",
  manageUsersBtn: "მომხმარებლების მართვა",
};

// ─────────────────────────────────────────────────────────────────
// SIMPLIFIED CHINESE
// ─────────────────────────────────────────────────────────────────
export const ZH: Locale = {
  code: "zh", flag: "🇨🇳", nativeName: "简体中文",
  displayFont: "Noto Serif SC, serif", bodyFont: "Noto Serif SC, serif",
  letterSpacingScale: 0,

  navPlatform: "平台", navParishes: "堂区", navSecurity: "安全", navAbout: "关于",

  welcomeEyebrow: "欢迎来到 ORTHODOX METRICS",
  mainHeadline: ["完整的堂区记录平台"],
  goldSubheadline: "专为东正教教会打造",
  bodyText: "通过一个安全的东正教堂区平台，将洗礼、婚配和葬礼记录数字化、保存、检索、管理，并生成正式文件。",
  primaryCta: "登记您的堂区",
  secondaryCta: "探索平台",
  bullets: [
    "洗礼 • 婚配 • 葬礼记录",
    "安全保存堂区记录",
    "专为东正教教会打造",
  ],

  slides: [
    { badge: "完整平台",    desc: "从历史圣礼档案到数字证书——一个互联的东正教堂区记录系统。" },
    { badge: "OCR与数字化", desc: "将手写的洗礼、婚配和葬礼登记册转换为可搜索的结构化数字记录，支持智能字段提取。" },
    { badge: "记录管理",    desc: "跨所有堂区搜索、筛选、审核和审计每一条圣礼记录，具备完整的权限控制。" },
    { badge: "证书与报告",  desc: "直接从经过核实的圣礼记录中生成正式的东正教堂区证书和文件。" },
    { badge: "堂区运营",    desc: "管理用户、查看数据分析，并从统一仪表板监督多堂区记录运营。" },
  ],

  panelParish: "堂区运营", panelCerts: "证书与报告",
  panelRecords: "记录管理", panelOcr: "OCR STUDIO",
  panelBook: "历史记录", ecosystemLabel: "平台生态系统",

  bookPageTitle: "洗礼登记册", bookChurchName: "圣乔治东正教堂",
  bookCols: ["编号", "姓名", "圣礼", "日期"], bookSacrament: "洗礼",

  ocrDocName: "Xili_Dengji_1985.pdf", ocrAccuracy: "准确率 94%",
  ocrTabs: ["来源", "字段", "审核", "历史"],
  ocrExtraction: "字段提取",
  ocrFields: [{ label: "全名" }, { label: "日期" }, { label: "堂区" }, { label: "教父/教母" }, { label: "神父" }],
  ocrProgress: "处理中", ocrProgressOf: "/",

  recSearch: "搜索记录…",
  recFilters: ["全部", "洗礼", "婚配", "葬礼", "待处理"],
  recCols: ["记录编号", "姓名", "类型", "日期", "堂区", "状态"],
  recStatuses: ["已核实", "待处理", "审核中"],
  recShowing: "显示第 1–25 条，共 12,847 条记录",

  certDocTypeLabel: "文件类型",
  certTypes: ["洗礼", "婚配", "葬礼"],
  certTitle: "洗礼证书",
  certChurch: "圣乔治东正教堂",
  certBody: "兹证明",
  certOn: "通过神圣洗礼圣事加入了东正教会",
  certPriest: "主礼神父",
  certVerified: "已核实来源记录",
  certGenerate: "生成文件",
  certFormats: ["PDF", "打印", "归档"],

  metricLabels: ["堂区", "记录", "证书", "用户"],
  metricSubs: ["今年新增 +3", "全部圣礼", "2024年发行", "工作人员及神职"],
  chartLabel: "记录活动",
  activityLabel: "最近活动",
  activityItems: [
    { action: "证书已签发",    who: "圣乔治堂" },
    { action: "新堂区已注册",  who: "圣尼古拉堂" },
    { action: "数字化已完成",  who: "圣三一堂" },
    { action: "用户角色已更新", who: "管理员" },
  ],
  viewingAll: "全部 48 个堂区 ▾",
  usersLabel: "214 名活跃用户 · 18 个角色",
  manageUsersBtn: "管理用户",
};

export const ALL_LOCALES: Locale[] = [EN, GR, RU, RO, KA, ZH];

/** Map site language codes (ISO 639-1) to hero carousel locale bundles. */
const LOCALE_BY_SITE_CODE: Record<string, Locale> = {
  en: EN,
  el: GR,
  ru: RU,
  ro: RO,
  ka: KA,
  zh: ZH,
};

export function getHeroCarouselLocale(siteLang: string): Locale {
  return LOCALE_BY_SITE_CODE[siteLang] ?? EN;
}
