import { CustomizerContext } from '@/context/CustomizerContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Divider, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLinks } from './Navigations';

const portalMobileLinks = [
  { tKey: 'portal', to: '/portal' },
  { tKey: 'church_records', to: '/portal/records/baptism' },
  { tKey: 'analytics', to: '/portal/charts' },
  { tKey: 'help', to: '/portal/guide' },
  { tKey: 'user', to: '/account/profile' },
];

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
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const toggleMode = () => setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <>
      <Box px={3} py={2}>
        <Box
          component="img"
          src="/images/logos/om-logo.png"
          alt={t('common.brand_name')}
          sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
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
              {NavLinks.map((navlink, i) => (
                <Button
                  color="inherit"
                  key={i}
                  href={navlink.to}
                  sx={{ justifyContent: 'start' }}
                >
                  {t(navlink.tKey)}
                </Button>
              ))}
              <Button color="primary" variant="contained" href="/auth/login">
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
