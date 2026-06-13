import {
  isPublicNavActive,
  PUBLIC_MAIN_NAV_LINKS,
  PUBLIC_ROUTES,
} from '@/config/publicRoutes';
import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import { useLanguage } from '@/context/LanguageContext';
import Profile from '@/layouts/full/vertical/header/Profile';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { IconMenu2, IconMoon, IconSun, IconWorld } from '@tabler/icons-react';
import React, { useContext, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BrandLogo } from '@/layouts/full/shared/logo/Logo';
import MobileSidebar from './MobileSidebar';
import PortalNavigations from './PortalNavigations';

const LANG_OPTIONS: { code: string; flag: string; label: string; region: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English', region: 'US' },
  { code: 'el', flag: '🇬🇷', label: 'Ελληνικά', region: 'GR' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', region: 'RU' },
  { code: 'ro', flag: '🇷🇴', label: 'Română', region: 'RO' },
  { code: 'ka', flag: '🇬🇪', label: 'ქართული', region: 'GE' },
  { code: 'zh', flag: '🇹🇼', label: '繁體中文', region: 'TW' },
];

function UtilityDivider() {
  return <span className="om-public-header__utility-sep" aria-hidden>|</span>;
}

const HpHeader = () => {
  const { authenticated, user } = useAuth();
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const { t, lang, setLang } = useLanguage();
  const toggleMode = () => setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  const mdUp = useMediaQuery((theme: any) => theme.breakpoints.up('md'));
  const location = useLocation();
  const isHomeHero = location.pathname === '/';
  const isDarkHero = isHomeHero && activeMode === 'dark';

  const isChurchStaff = authenticated && user && !['super_admin', 'admin'].includes(user.role);
  const isAccountHub = location.pathname.startsWith('/account');
  const showPortalNav = isChurchStaff || (authenticated && isAccountHub);

  const [open, setOpen] = React.useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = LANG_OPTIONS.find((l) => l.code === lang) || LANG_OPTIONS[0];

  React.useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const navLinkClass = (isActive: boolean) => {
    const base = 'om-public-header__nav-link';
    if (isDarkHero) {
      return `${base}${isActive ? ' om-public-header__nav-link--active font-semibold' : ''}`;
    }
    return `${base}${isActive ? ' text-[var(--om-text-primary)] font-semibold' : ' om-text-secondary hover:text-[var(--om-text-primary)]'}`;
  };

  const utilityBar = (
    <div className="om-public-header__utility">
      <div className="max-w-7xl mx-auto px-6 om-public-header__utility-inner">
        <div ref={langRef} className="relative">
          <button
            type="button"
            onClick={() => setLangOpen(!langOpen)}
            aria-label={t('common.language')}
            className="om-public-header__utility-btn"
          >
            <IconWorld size={14} stroke={1.75} />
            <span>{currentLang.region}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 om-public-panel rounded-lg shadow-lg py-1 z-[60]">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setLang(opt.code);
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 font-om-body om-text-small transition-colors cursor-pointer border-0 ${
                    opt.code === lang
                      ? 'bg-[var(--om-input-bg)] text-[var(--om-gold)] font-semibold'
                      : 'bg-transparent om-text-secondary hover:bg-[var(--om-input-bg)]'
                  }`}
                >
                  <span className="text-[16px]">{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <UtilityDivider />

        <button
          type="button"
          onClick={toggleMode}
          aria-label={activeMode === 'light' ? t('common.dark_mode') : t('common.light_mode')}
          className="om-public-header__utility-btn"
        >
          {activeMode === 'light' ? <IconMoon size={14} stroke={1.75} /> : <IconSun size={14} stroke={1.75} />}
        </button>

        {!showPortalNav && (
          <>
            <UtilityDivider />
            {authenticated ? (
              <div className="flex items-center pl-1">
                <Profile />
              </div>
            ) : (
              <a href={PUBLIC_ROUTES.LOGIN} className="om-public-header__utility-btn">
                {t('common.sign_in')}
              </a>
            )}
          </>
        )}

        {showPortalNav && authenticated && (
          <>
            <UtilityDivider />
            <div className="flex items-center pl-1">
              <Profile />
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <nav className={`om-public-header sticky top-0 z-50${isHomeHero ? ' om-public-header--hero' : ''}`}>
      {utilityBar}

      <div className="om-public-header__main">
        <div className="max-w-7xl mx-auto px-6 om-public-header__main-inner">
          <BrandLogo
            variant="mark"
            href={PUBLIC_ROUTES.HOME}
            className="h-14 w-auto max-h-14 max-w-[min(100%,220px)] object-contain object-left shrink-0"
          />

          {mdUp ? (
            showPortalNav ? (
              <div className="flex flex-1 items-center justify-center">
                <Stack spacing={1} direction="row" alignItems="center">
                  <PortalNavigations />
                </Stack>
              </div>
            ) : (
              <nav className="om-public-header__nav" aria-label="Primary">
                {PUBLIC_MAIN_NAV_LINKS.map((link) => {
                  const isActive = isPublicNavActive(location.pathname, link.to);
                  return (
                    <NavLink key={link.to} to={link.to} className={navLinkClass(isActive)}>
                      {t(link.tKey)}
                    </NavLink>
                  );
                })}
              </nav>
            )
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-2 shrink-0">
            {mdUp && !showPortalNav && !authenticated && (
              <Link to={PUBLIC_ROUTES.ENROLL} className="om-public-header__enroll">
                {t('footer.enroll_parish')}
              </Link>
            )}

            {!mdUp && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="menu"
                className="p-2 text-[var(--om-text-primary)] cursor-pointer border-0 bg-transparent rounded-lg hover:bg-[var(--om-input-bg)]"
              >
                <IconMenu2 size={24} />
              </button>
            )}
          </div>
        </div>
      </div>

      <Drawer
        anchor="left"
        open={open}
        variant="temporary"
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: 270,
            border: '0 !important',
            boxShadow: (theme: any) => theme.shadows[8],
          },
        }}
      >
        <MobileSidebar isPortal={!!showPortalNav} />
      </Drawer>
    </nav>
  );
};

export default HpHeader;
