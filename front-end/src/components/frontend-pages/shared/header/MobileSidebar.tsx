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
import { PUBLIC_ROUTES } from '@/config/publicRoutes';

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
];

interface MobileSidebarProps {
  isPortal?: boolean;
}

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
          variant="header-svg"
          href={PUBLIC_ROUTES.HOME}
          colorScheme={activeMode === 'dark' ? 'dark' : 'light'}
          className="h-10 w-auto max-h-10 max-w-[280px] object-contain object-left"
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
                  href={link.to}
                  sx={{ justifyContent: 'start' }}
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
              <Button color="inherit" href={PUBLIC_ROUTES.HOME} sx={{ justifyContent: 'start' }}>
                {t('nav.home')}
              </Button>
              <Button color="inherit" href={PUBLIC_ROUTES.PRICING} sx={{ justifyContent: 'start' }}>
                {t('nav.pricing')}
              </Button>
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
                        href={link.to}
                        sx={{ justifyContent: 'start' }}
                      >
                        {t(link.tKey)}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              ))}
              <Button color="primary" variant="outlined" href="/auth/login">
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
