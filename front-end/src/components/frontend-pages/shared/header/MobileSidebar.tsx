import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import { useLanguage } from '@/context/LanguageContext';
import { Divider, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useContext } from 'react';
import { BrandLogo } from '@/layouts/full/shared/logo/Logo';
import { PUBLIC_MAIN_NAV_LINKS, PUBLIC_ROUTES } from '@/config/publicRoutes';
import { Link } from 'react-router-dom';

const portalMobileLinks = [
  { tKey: 'portal', to: '/portal' },
  { tKey: 'church_records', to: '/portal/records/baptism' },
  { tKey: 'analytics', to: '/portal/charts' },
  { tKey: 'help', to: '/portal/guide' },
  { tKey: 'user', to: '/account/profile' },
];

const PUBLIC_MOBILE_NAV_GROUPS = [
  {
    labelKey: 'nav.group_product',
    links: [
      { tKey: 'nav.tour', to: PUBLIC_ROUTES.TOUR },
      { tKey: 'nav.samples', to: PUBLIC_ROUTES.SAMPLES },
    ],
  },
  {
    labelKey: 'nav.group_company',
    links: [
      { tKey: 'nav.about', to: PUBLIC_ROUTES.ABOUT },
      { tKey: 'nav.contact', to: PUBLIC_ROUTES.CONTACT },
    ],
  },
  {
    labelKey: 'nav.group_support',
    links: [
      { tKey: 'footer.faq', to: PUBLIC_ROUTES.FAQ },
    ],
  },
] as const;

const LANG_OPTIONS: { code: string; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'el', flag: '🇬🇷', label: 'Ελληνικά' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'ro', flag: '🇷🇴', label: 'Română' },
  { code: 'ka', flag: '🇬🇪', label: 'ქართული' },
  { code: 'zh', flag: '🇹🇼', label: '繁體中文' },
];

interface MobileSidebarProps {
  isPortal?: boolean;
}

const mobileNavButtonSx = {
  justifyContent: 'start',
  fontSize: '14px',
  fontFamily: "'Inter', sans-serif",
  textTransform: 'none' as const,
};

const MobileSidebar = ({ isPortal = false }: MobileSidebarProps) => {
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const { logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const toggleMode = () => setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <Box px={3} py={2}>
        <BrandLogo
          variant="mark"
          href={PUBLIC_ROUTES.HOME}
          className="h-12 w-auto max-h-12 max-w-[200px] object-contain object-left"
        />
      </Box>
      <Box p={3}>
        <Stack direction="column" spacing={2}>
          {isPortal ? (
            <>
              {portalMobileLinks.map((link, i) => (
                <Button
                  color="inherit"
                  key={i}
                  component={Link}
                  to={link.to}
                  sx={mobileNavButtonSx}
                >
                  {link.tKey === 'portal' ? 'Portal' :
                   link.tKey === 'church_records' ? 'Church Records' :
                   link.tKey === 'analytics' ? 'Analytics' :
                   link.tKey === 'help' ? 'Help' : 'User'}
                </Button>
              ))}
              <Button color="error" variant="outlined" onClick={handleLogout}>
                {t('common.sign_out')}
              </Button>
            </>
          ) : (
            <>
              {PUBLIC_MAIN_NAV_LINKS.map((link) => (
                <Button
                  color="inherit"
                  key={link.to}
                  component={Link}
                  to={link.to}
                  sx={mobileNavButtonSx}
                >
                  {t(link.tKey)}
                </Button>
              ))}
              {PUBLIC_MOBILE_NAV_GROUPS.map((group) => (
                <Box key={group.labelKey}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5, mt: 1 }}>
                    {t(group.labelKey)}
                  </Typography>
                  <Stack spacing={0.5}>
                    {group.links.map((link) => (
                      <Button
                        color="inherit"
                        key={link.to}
                        component={Link}
                        to={link.to}
                        sx={mobileNavButtonSx}
                      >
                        {t(link.tKey)}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              ))}
              <Button
                color="primary"
                variant="contained"
                component={Link}
                to={PUBLIC_ROUTES.ENROLL}
                sx={{
                  mt: 1,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #E6C96A 100%)',
                  color: '#14093A',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  fontSize: '12px',
                  '&:hover': { background: 'linear-gradient(135deg, #c9a030 0%, #d4af37 100%)' },
                }}
              >
                {t('footer.enroll_parish')}
              </Button>
              <Button color="primary" variant="outlined" component={Link} to="/auth/login">
                {t('common.church_login')}
              </Button>
            </>
          )}

          <Divider />

          {/* Language Selector */}
          <Stack direction="column" spacing={0.5}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
              {t('common.language')}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {LANG_OPTIONS.map((opt) => (
                <Button
                  key={opt.code}
                  size="small"
                  variant={opt.code === lang ? 'contained' : 'outlined'}
                  onClick={() => setLang(opt.code)}
                  sx={{
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '13px',
                    textTransform: 'none',
                    ...(opt.code === lang
                      ? { backgroundColor: '#2d1b4e', color: '#fff', '&:hover': { backgroundColor: '#1f1236' } }
                      : { borderColor: 'divider', color: 'text.secondary' }),
                  }}
                >
                  {opt.flag} {opt.label}
                </Button>
              ))}
            </Stack>
          </Stack>

          <Divider />

          {/* Dark/Light mode toggle */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.primary' }}>
              {activeMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {activeMode === 'light' ? t('common.dark_mode') : t('common.light_mode')}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </>
  );
};

export default MobileSidebar;
