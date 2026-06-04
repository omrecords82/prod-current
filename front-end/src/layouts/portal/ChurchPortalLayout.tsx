import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import { useLanguage } from '@/context/LanguageContext';
import { churchApi } from '@/features/account/accountApi';
import { CustomizerContext } from '@/context/CustomizerContext';
import Customizer from '@/layouts/full/shared/customizer/Customizer';
import { BrandLogo } from '@/layouts/full/shared/logo/Logo';
import { Box, CircularProgress, Container, Divider, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';
import { IconChevronDown, IconLogout, IconMoon, IconSettings, IconSun, IconUser, IconWorld } from '@tabler/icons-react';
import React, { useContext, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

/* ── Portal nav links ── */
const PORTAL_LINKS = [
  { title: 'Portal', to: '/portal', match: (p: string) => p === '/portal' },
  { title: 'Church Records', to: '/portal/records', match: (p: string) => p.startsWith('/portal/records') },
  { title: 'Analytics', to: '/portal/charts', match: (p: string) => p.startsWith('/portal/charts') },
  { title: 'Help', to: '/portal/guide', match: (p: string) => p.startsWith('/portal/guide') },
];

/* ── Page label mapping for footer ── */
function getPageLabel(pathname: string): string {
  if (pathname.startsWith('/portal/records')) return 'Church Records';
  if (pathname.startsWith('/portal/charts')) return 'Analytics';
  if (pathname.startsWith('/portal/guide')) return 'Help';
  if (pathname.startsWith('/portal/certificates')) return 'Certificates';
  if (pathname.startsWith('/account')) return 'Account';
  return 'Portal';
}

/* ── Language options ── */
const LANG_OPTIONS = [
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'el', flag: '🇬🇷', label: 'EL' },
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'ro', flag: '🇷🇴', label: 'RO' },
];

/* ══════════════════════════════════════════════════════════════════
   Portal Header
   ══════════════════════════════════════════════════════════════════ */
const PortalHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { churchMetadata } = useChurch();
  const { lang } = useLanguage();
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [configuredLang, setConfiguredLang] = useState<string>('en');
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  const churchName = churchMetadata?.church_name_display || churchMetadata?.church_name || '';
  const logoUrl = churchMetadata?.logo_url || null;
  const displayName = user?.nick || (user?.first_name ? `${user.first_name.split(' ')[0]}. ${user.last_name || ''}`.trim() : 'User');

  useEffect(() => {
    let cancelled = false;
    churchApi.getSettings<{ preferred_language?: string }>().then((settings) => {
      if (!cancelled && settings?.preferred_language) {
        const code = settings.preferred_language === 'gr' ? 'el' : settings.preferred_language;
        setConfiguredLang(code);
      }
    }).catch(() => { /* keep default */ });
    return () => { cancelled = true; };
  }, [churchMetadata?.church_id]);

  const visibleLangOptions = LANG_OPTIONS.filter(
    (opt) => opt.code === configuredLang || opt.code === lang,
  );
  const activeLang = visibleLangOptions[0] || LANG_OPTIONS[0];

  const handleLogout = async () => {
    setProfileAnchor(null);
    await logout();
  };

  return (
    <header className="bg-white dark:bg-[#1a1a2e] border-b border-[rgba(45,27,78,0.08)] dark:border-[rgba(255,255,255,0.06)] sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Left: Church icon + name */}
        <NavLink to="/portal" className="flex items-center gap-3 no-underline shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-[rgba(45,27,78,0.1)] dark:border-[rgba(255,255,255,0.1)]" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#2d1b4e] dark:bg-[#d4af37] flex items-center justify-center text-white dark:text-[#2d1b4e] font-['Georgia'] text-lg">
              {churchName.charAt(0) || 'C'}
            </div>
          )}
          <div className="hidden sm:block">
            <div className="font-['Georgia'] text-[16px] text-[#2d1b4e] dark:text-white leading-tight">
              {churchName}
            </div>
            <div className="text-[11px] tracking-[0.15em] text-[#c9a14a] font-medium uppercase">
              ✦ Orthodox Church ✦
            </div>
          </div>
        </NavLink>

        {/* Center: Nav links */}
        <nav className="hidden md:flex items-center gap-7">
          {PORTAL_LINKS.map((link) => {
            const isActive = link.match(location.pathname);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`font-['Inter'] text-[14px] no-underline relative py-1 transition-colors ${
                  isActive
                    ? 'text-[#2d1b4e] dark:text-white font-medium border-b-2 border-[#2d1b4e] dark:border-[#d4af37]'
                    : 'text-[#6b7280] dark:text-gray-400 hover:text-[#2d1b4e] dark:hover:text-white border-b-2 border-transparent hover:border-[rgba(45,27,78,0.3)] dark:hover:border-[rgba(212,175,55,0.3)]'
                }`}
              >
                {link.title}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Language, Theme toggle, Profile */}
        <div className="flex items-center gap-2">
          {/* Language — show only the parish-configured language */}
          <div className="flex items-center gap-1 px-2 py-1.5 text-[#6b7280] dark:text-gray-400 text-[13px] font-['Inter']">
            <IconWorld size={16} />
            <span>{activeLang.label}</span>
          </div>

          {/* Dark/Light toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-full px-1 py-0.5">
            <button
              onClick={() => setActiveMode('light')}
              className={`p-1.5 rounded-full border-0 cursor-pointer transition-colors ${
                activeMode === 'light'
                  ? 'bg-[#f5f0e6] text-[#c9a14a]'
                  : 'bg-transparent text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Light mode"
            >
              <IconSun size={15} />
            </button>
            <button
              onClick={() => setActiveMode('dark')}
              className={`p-1.5 rounded-full border-0 cursor-pointer transition-colors ${
                activeMode === 'dark'
                  ? 'bg-[#2d1b4e] text-[#d4af37]'
                  : 'bg-transparent text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Dark mode"
            >
              <IconMoon size={15} />
            </button>
          </div>

          {/* Profile dropdown */}
          <button
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            className="flex items-center gap-2 ml-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <div className="w-8 h-8 rounded-full bg-[rgba(45,27,78,0.08)] dark:bg-[rgba(212,175,55,0.15)] border border-[rgba(45,27,78,0.12)] dark:border-[rgba(212,175,55,0.25)] flex items-center justify-center">
              <span className="text-[12px] font-medium text-[#2d1b4e] dark:text-[#d4af37] font-['Inter']">
                {user ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || '?' : '?'}
              </span>
            </div>
            <span className="hidden sm:inline text-[13px] font-['Inter'] text-[#4a5565] dark:text-gray-300">
              {displayName}
            </span>
            <IconChevronDown size={12} className="text-gray-400" />
          </button>
          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ '& .MuiMenu-paper': { width: 220, mt: 1 } }}
          >
            <MenuItem onClick={() => { setProfileAnchor(null); navigate('/account/profile'); }}>
              <ListItemIcon><IconUser size={18} /></ListItemIcon>
              <Typography variant="body2">My Profile</Typography>
            </MenuItem>
            <MenuItem onClick={() => { setProfileAnchor(null); navigate('/account/parish-management'); }}>
              <ListItemIcon><IconSettings size={18} /></ListItemIcon>
              <Typography variant="body2">Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><IconLogout size={18} /></ListItemIcon>
              <Typography variant="body2">Sign Out</Typography>
            </MenuItem>
          </Menu>
        </div>
      </div>
    </header>
  );
};

/* ══════════════════════════════════════════════════════════════════
   Portal Footer
   ══════════════════════════════════════════════════════════════════ */
const PortalFooter: React.FC = () => {
  const { churchMetadata } = useChurch();
  const location = useLocation();

  const churchName = churchMetadata?.church_name_display || churchMetadata?.church_name || 'Church';
  const logoUrl = churchMetadata?.logo_url || null;
  const pageLabel = getPageLabel(location.pathname);

  // Shorten "Saints Peter and Paul" to "Saints Peter & Paul" for display
  const shortName = churchName.replace(' and ', ' & ');

  return (
    <footer className="mt-auto">
      {/* Decorative top border */}
      <div className="h-[3px] bg-gradient-to-r from-transparent via-[#c9a14a] to-transparent" />
      <div
        className="bg-[#faf8f4] dark:bg-[#1a1a2e] border-t border-[rgba(201,161,74,0.2)] dark:border-[rgba(201,161,74,0.15)]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a14a' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Left: Church icon */}
          <div className="shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-[rgba(201,161,74,0.3)]" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2d1b4e] flex items-center justify-center text-[#d4af37] font-['Georgia'] text-sm">
                {shortName.charAt(0)}
              </div>
            )}
          </div>

          {/* Center: Church name + page */}
          <div className="flex items-center gap-3">
            <span className="text-[#c9a14a] text-sm">✦</span>
            <span className="font-['Georgia'] text-[15px] text-[#2d1b4e] dark:text-[#e8dcc8] tracking-wide">
              {shortName} {pageLabel}
            </span>
            <span className="text-[#c9a14a] text-sm">✦</span>
          </div>

          {/* Right: Powered by OM */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#9ca3af] dark:text-gray-500 font-['Inter']">
              Powered by
            </span>
            <BrandLogo className="h-5 w-auto object-contain" height={20} />
          </div>
        </div>
      </div>
      {/* Decorative bottom border */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c9a14a] to-transparent opacity-50" />
    </footer>
  );
};

/* ══════════════════════════════════════════════════════════════════
   Layout Wrapper
   ══════════════════════════════════════════════════════════════════ */
const ChurchPortalLayout: React.FC = () => {
  const { authenticated, loading } = useAuth();
  const { isLayout } = useContext(CustomizerContext);
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PortalHeader />
      <Container
        sx={{
          pt: '30px',
          pb: '64px',
          maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box sx={{ minHeight: 'calc(100vh - 220px)' }}>
          <Outlet />
        </Box>
      </Container>
      <PortalFooter />
      <ScrollToTop />
      <Customizer />
    </Box>
  );
};

export default ChurchPortalLayout;
