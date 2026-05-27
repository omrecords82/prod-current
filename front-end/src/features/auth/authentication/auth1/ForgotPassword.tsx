/**
 * ForgotPassword — MUI translation of workshop design.
 *
 * Features:
 * - Multi-language (EN, EL, RU, RO, KA)
 * - Dark/light theme toggle
 * - Two-column layout: brand panel + form card
 * - Gold accent theme matching OM brand
 * - Success state with resend option
 * - Actual API integration via apiClient
 *
 * Replaces: front-end/src/features/auth/authentication/auth1/ForgotPassword.tsx
 */
import apiClient from '@/api/utils/axiosInstance';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  DarkMode as DarkModeIcon,
  ExpandMore as ExpandMoreIcon,
  Language as LanguageIcon,
  LightMode as LightModeIcon,
  Mail as MailIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// ── i18n ──────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'el' | 'ru' | 'ro' | 'ka';

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'ka', label: 'ქართული', flag: '🇬🇪' },
];

interface Translations {
  eyebrow: string;
  titleA: string;
  titleAccent: string;
  subtitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  cardTitle: string;
  cardSubtitle: (email: string) => string;
  cardSubtitleDefault: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  back: string;
  successBody: string;
  resend: string;
  newAccount: string;
  createAccount: string;
  signIn: string;
  getStarted: string;
}

const T: Record<Lang, Translations> = {
  en: {
    eyebrow: 'Orthodox Christian Record Translation + Management',
    titleA: 'Reset your',
    titleAccent: 'password',
    subtitle:
      "Enter the email associated with your parish account and we'll send you a secure link to restore access to your dashboard.",
    feature1Title: 'Secure Recovery',
    feature1Desc: 'Encrypted reset links expire after 30 minutes for your protection.',
    feature2Title: 'Parish Account Support',
    feature2Desc: 'Trouble accessing? Your parish administrator can assist.',
    cardTitle: 'Forgot Password',
    cardSubtitle: (e) => `We've sent a reset link to ${e}`,
    cardSubtitleDefault: "We'll email you a link to reset it",
    emailLabel: 'Email or Username',
    emailPlaceholder: 'you@orthodoxmetrics.com',
    submit: 'Send Reset Link',
    back: 'Back to Sign In',
    successBody:
      "If an account exists for that address, you'll receive an email shortly. The link expires in 30 minutes.",
    resend: 'Resend Email',
    newAccount: 'New to Orthodox Metrics?',
    createAccount: 'Create an account',
    signIn: 'Sign In',
    getStarted: 'Get Started',
  },
  el: {
    eyebrow: 'Ορθόδοξη Χριστιανική Μετάφραση + Διαχείριση Αρχείων',
    titleA: 'Επαναφορά',
    titleAccent: 'κωδικού',
    subtitle:
      'Εισάγετε το email της ενοριακής σας λογαριασμού και θα σας στείλουμε ένα ασφαλές σύνδεσμο.',
    feature1Title: 'Ασφαλής Ανάκτηση',
    feature1Desc: 'Οι κρυπτογραφημένοι σύνδεσμοι λήγουν μετά από 30 λεπτά.',
    feature2Title: 'Υποστήριξη Ενοριακού Λογαριασμού',
    feature2Desc: 'Πρόβλημα πρόσβασης; Ο διαχειριστής ενορίας μπορεί να βοηθήσει.',
    cardTitle: 'Ξεχάσατε τον Κωδικό',
    cardSubtitle: (e) => `Στείλαμε σύνδεσμο στο ${e}`,
    cardSubtitleDefault: 'Θα σας στείλουμε σύνδεσμο επαναφοράς',
    emailLabel: 'Email ή Όνομα Χρήστη',
    emailPlaceholder: 'you@orthodoxmetrics.com',
    submit: 'Αποστολή Συνδέσμου',
    back: 'Πίσω στη Σύνδεση',
    successBody: 'Αν υπάρχει λογαριασμός, θα λάβετε email σύντομα. Ο σύνδεσμος λήγει σε 30 λεπτά.',
    resend: 'Επαναποστολή Email',
    newAccount: 'Νέος στο Orthodox Metrics;',
    createAccount: 'Δημιουργία λογαριασμού',
    signIn: 'Σύνδεση',
    getStarted: 'Ξεκινήστε',
  },
  ru: {
    eyebrow: 'Православный Перевод + Управление Записями',
    titleA: 'Сброс',
    titleAccent: 'пароля',
    subtitle:
      'Введите email вашей приходской учётной записи, и мы отправим безопасную ссылку для восстановления доступа.',
    feature1Title: 'Безопасное Восстановление',
    feature1Desc: 'Зашифрованные ссылки действуют 30 минут для вашей защиты.',
    feature2Title: 'Поддержка Аккаунта',
    feature2Desc: 'Проблемы с доступом? Администратор прихода поможет вам.',
    cardTitle: 'Забыли Пароль',
    cardSubtitle: (e) => `Мы отправили ссылку на ${e}`,
    cardSubtitleDefault: 'Мы отправим вам ссылку для сброса',
    emailLabel: 'Email или Имя пользователя',
    emailPlaceholder: 'you@orthodoxmetrics.com',
    submit: 'Отправить Ссылку',
    back: 'Назад ко Входу',
    successBody: 'Если аккаунт существует, вы получите письмо. Ссылка действует 30 минут.',
    resend: 'Отправить Повторно',
    newAccount: 'Новый в Orthodox Metrics?',
    createAccount: 'Создать аккаунт',
    signIn: 'Войти',
    getStarted: 'Начать',
  },
  ro: {
    eyebrow: 'Traducere + Management Registre Creștin Ortodoxe',
    titleA: 'Resetează',
    titleAccent: 'parola',
    subtitle:
      'Introduceți email-ul asociat contului parohial și vă vom trimite un link securizat pentru recuperare.',
    feature1Title: 'Recuperare Securizată',
    feature1Desc: 'Linkurile criptate expiră după 30 de minute pentru protecție.',
    feature2Title: 'Suport Cont Parohial',
    feature2Desc: 'Probleme cu accesul? Administratorul parohiei vă poate ajuta.',
    cardTitle: 'Parolă Uitată',
    cardSubtitle: (e) => `Am trimis un link de resetare la ${e}`,
    cardSubtitleDefault: 'Vă trimitem un link pentru resetare',
    emailLabel: 'Email sau Nume utilizator',
    emailPlaceholder: 'you@orthodoxmetrics.com',
    submit: 'Trimite Link Resetare',
    back: 'Înapoi la Autentificare',
    successBody:
      'Dacă există un cont, veți primi un email în curând. Linkul expiră în 30 de minute.',
    resend: 'Retrimite Email',
    newAccount: 'Nou la Orthodox Metrics?',
    createAccount: 'Creați un cont',
    signIn: 'Autentificare',
    getStarted: 'Începeți',
  },
  ka: {
    eyebrow: 'მართლმადიდებლური ქრისტიანული ჩანაწერების თარგმანი + მართვა',
    titleA: 'პაროლის',
    titleAccent: 'აღდგენა',
    subtitle:
      'შეიყვანეთ თქვენი სამრევლო ანგარიშის ელფოსტა და გამოგიგზავნით უსაფრთხო ბმულს აღსადგენად.',
    feature1Title: 'უსაფრთხო აღდგენა',
    feature1Desc: 'დაშიფრული ბმულები იშლება 30 წუთის შემდეგ თქვენი დაცვისთვის.',
    feature2Title: 'სამრევლო ანგარიშის მხარდაჭერა',
    feature2Desc: 'წვდომის პრობლემა? სამრევლოს ადმინისტრატორი დაგეხმარებათ.',
    cardTitle: 'დაგავიწყდათ პაროლი',
    cardSubtitle: (e) => `აღდგენის ბმული გაიგზავნა მისამართზე ${e}`,
    cardSubtitleDefault: 'გამოგიგზავნით ბმულს აღსადგენად',
    emailLabel: 'ელფოსტა ან მომხმარებლის სახელი',
    emailPlaceholder: 'you@orthodoxmetrics.com',
    submit: 'ბმულის გაგზავნა',
    back: 'უკან შესვლაზე',
    successBody: 'თუ ანგარიში არსებობს, მალე მიიღებთ ელფოსტას. ბმული იშლება 30 წუთში.',
    resend: 'ხელახლა გაგზავნა',
    newAccount: 'ახალი ხართ Orthodox Metrics-ზე?',
    createAccount: 'შექმენით ანგარიში',
    signIn: 'შესვლა',
    getStarted: 'დაწყება',
  },
};

// ── Theme palettes ────────────────────────────────────────────────────────────

const GOLD = '#e6c074';
const GOLD_SOLID = '#d4a54e';

const palettes = {
  dark: {
    bg: 'linear-gradient(135deg, #0f0a1f 0%, #1a1235 50%, #0f0a1f 100%)',
    cardBg: '#1f1a35',
    cardBorder: 'rgba(255,255,255,0.06)',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.7)',
    textDim: 'rgba(255,255,255,0.55)',
    inputBg: '#2a2348',
    inputText: '#ffffff',
    divider: 'rgba(255,255,255,0.08)',
    navBg: 'rgba(15, 10, 31, 0.6)',
  },
  light: {
    bg: 'linear-gradient(135deg, #2a1a5e 0%, #3b1f7a 50%, #2a1a5e 100%)',
    cardBg: '#ffffff',
    cardBorder: 'rgba(0,0,0,0.05)',
    text: '#1a1530',
    textMuted: '#6b6880',
    textDim: '#6b6880',
    inputBg: '#f3f3f5',
    inputText: '#1a1530',
    divider: '#ececf0',
    navBg: 'rgba(255,255,255,0.08)',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);

  const isMdUp = useMediaQuery('(min-width:900px)');
  const t = T[lang];
  const isDark = theme === 'dark';
  const palette = palettes[theme];
  const currentLang = LANGUAGES.find((l) => l.code === lang)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setSubmitted(false);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: palette.text,
      }}
    >
      {/* ── Header ── */}
      <Box
        component="header"
        sx={{
          width: '100%',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: palette.navBg,
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${palette.divider}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: GOLD,
            letterSpacing: '0.15em',
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        >
          OR✟HODOX
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Language selector */}
          <Button
            size="small"
            onClick={(e) => setLangAnchor(e.currentTarget)}
            sx={{ color: palette.textMuted, textTransform: 'none', minWidth: 'auto', px: 1 }}
            startIcon={<LanguageIcon sx={{ fontSize: 16 }} />}
            endIcon={<ExpandMoreIcon sx={{ fontSize: 14 }} />}
          >
            <Box component="span" sx={{ mr: 0.5 }}>
              {currentLang.flag}
            </Box>
            {isMdUp && currentLang.label}
          </Button>
          <Menu
            anchorEl={langAnchor}
            open={Boolean(langAnchor)}
            onClose={() => setLangAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {LANGUAGES.map((l) => (
              <MenuItem
                key={l.code}
                selected={l.code === lang}
                onClick={() => {
                  setLang(l.code);
                  setLangAnchor(null);
                }}
              >
                <Box component="span" sx={{ mr: 1 }}>
                  {l.flag}
                </Box>
                {l.label}
                {l.code === lang && (
                  <CheckCircleIcon sx={{ ml: 'auto', fontSize: 16, color: GOLD_SOLID }} />
                )}
              </MenuItem>
            ))}
          </Menu>

          {/* Theme toggle */}
          <IconButton
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            sx={{ color: palette.textMuted }}
            size="small"
          >
            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>

          <Button
            component={Link}
            to="/auth/login"
            size="small"
            sx={{ color: palette.textMuted, textTransform: 'none' }}
          >
            {t.signIn}
          </Button>

          <Button
            size="small"
            sx={{
              background: GOLD_SOLID,
              color: '#1a1530',
              fontWeight: 500,
              textTransform: 'none',
              '&:hover': { background: GOLD, color: '#1a1530' },
              borderRadius: 1,
              px: 2,
            }}
          >
            {t.getStarted}
          </Button>
        </Box>
      </Box>

      {/* ── Main ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 6,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1100,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 4, md: 8 },
          }}
        >
          {/* ── Left: Brand panel (desktop only) ── */}
          {isMdUp && (
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  color: GOLD,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  mb: 2,
                }}
              >
                {t.eyebrow}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '2.75rem',
                  fontWeight: 500,
                  lineHeight: 1.2,
                  mb: 2,
                  color: '#ffffff',
                }}
              >
                {t.titleA}{' '}
                <Box component="span" sx={{ color: GOLD }}>
                  {t.titleAccent}
                </Box>
              </Typography>

              <Typography
                sx={{ color: palette.textMuted, lineHeight: 1.6, maxWidth: 420, mb: 4 }}
              >
                {t.subtitle}
              </Typography>

              {/* Feature bullets */}
              {[
                { title: t.feature1Title, desc: t.feature1Desc },
                { title: t.feature2Title, desc: t.feature2Desc },
              ].map((item) => (
                <Box key={item.title} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                  <Box
                    sx={{
                      mt: 0.25,
                      width: 24,
                      height: 24,
                      borderRadius: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: 'rgba(212, 165, 78, 0.15)',
                      color: GOLD,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: palette.text, fontWeight: 500, fontSize: '0.95rem' }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ color: palette.textDim, fontSize: '0.875rem' }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* ── Right: Form card ── */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              px: { xs: 4, md: 5 },
              py: { xs: 5, md: 6 },
              background: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              boxShadow: isDark
                ? '0 25px 60px rgba(0,0,0,0.5)'
                : '0 25px 60px rgba(0,0,0,0.35)',
            }}
          >
            {/* Card header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                sx={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.75rem',
                  fontWeight: 500,
                  color: palette.text,
                }}
              >
                {submitted ? (lang === 'en' ? 'Check your email' : t.cardTitle) : t.cardTitle}
              </Typography>
              <Typography sx={{ color: palette.textMuted, mt: 0.75, fontSize: '0.9rem' }}>
                {submitted ? t.cardSubtitle(email) : t.cardSubtitleDefault}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {!submitted ? (
              <Box component="form" onSubmit={handleSubmit}>
                <Typography
                  component="label"
                  htmlFor="fp-email"
                  sx={{ display: 'block', mb: 0.75, color: palette.text, fontSize: '0.9rem' }}
                >
                  {t.emailLabel}
                </Typography>
                <TextField
                  id="fp-email"
                  type="email"
                  required
                  fullWidth
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailIcon sx={{ fontSize: 18, color: palette.textDim }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      background: palette.inputBg,
                      color: palette.inputText,
                      height: 44,
                      '& fieldset': { border: 'none' },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: palette.textDim,
                      opacity: 1,
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    height: 44,
                    background: GOLD_SOLID,
                    color: '#1a1530',
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    '&:hover': { background: GOLD },
                    '&.Mui-disabled': { background: 'rgba(212,165,78,0.4)', color: '#1a1530' },
                  }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: '#1a1530' }} /> : t.submit}
                </Button>

                <Button
                  component={Link}
                  to="/auth/login"
                  fullWidth
                  startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    mt: 2,
                    color: palette.textMuted,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  {t.back}
                </Button>
              </Box>
            ) : (
              <Box>
                <Alert
                  icon={<CheckCircleIcon sx={{ color: GOLD_SOLID }} />}
                  sx={{
                    mb: 2.5,
                    background: 'rgba(212, 165, 78, 0.1)',
                    border: '1px solid rgba(212, 165, 78, 0.3)',
                    color: palette.text,
                    '& .MuiAlert-icon': { alignItems: 'center' },
                  }}
                >
                  {t.successBody}
                </Alert>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleResend}
                  sx={{
                    height: 44,
                    background: GOLD_SOLID,
                    color: '#1a1530',
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    '&:hover': { background: GOLD },
                  }}
                >
                  {t.resend}
                </Button>

                <Button
                  component={Link}
                  to="/auth/login"
                  fullWidth
                  startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    mt: 2,
                    color: palette.textMuted,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  {t.back}
                </Button>
              </Box>
            )}

            {/* Footer */}
            <Box
              sx={{
                mt: 4,
                pt: 3,
                textAlign: 'center',
                borderTop: `1px solid ${palette.divider}`,
              }}
            >
              <Typography sx={{ color: palette.textMuted, fontSize: '0.875rem' }}>
                {t.newAccount}{' '}
                <Box
                  component={Link}
                  to="/frontend-pages/homepage"
                  sx={{
                    color: GOLD,
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {t.createAccount}
                </Box>
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
