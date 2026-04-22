import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import { useLanguage } from '@/context/LanguageContext';
import { PUBLIC_NAV_LINKS } from '@/config/publicRoutes';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { IconMenu2, IconMoon, IconSun, IconWorld } from '@tabler/icons-react';
import React, { useContext, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import MobileSidebar from './MobileSidebar';
import PortalNavigations from './PortalNavigations';
import Profile from '@/layouts/full/vertical/header/Profile';
import Stack from '@mui/material/Stack';

const LANG_OPTIONS: { code: string; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'el', flag: '🇬🇷', label: 'Ελληνικά' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'ro', flag: '🇷🇴', label: 'Română' },
  { code: 'ka', flag: '🇬🇪', label: 'ქართული' },
];

const HpHeader = () => {
  const { authenticated, user } = useAuth();
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const { t, lang, setLang } = useLanguage();
  const toggleMode = () => setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  const mdUp = useMediaQuery((theme: any) => theme.breakpoints.up('md'));
  const location = useLocation();

  const isChurchStaff = authenticated && user && !['super_admin', 'admin'].includes(user.role);
  const isAccountHub = location.pathname.startsWith('/account');
  const showPortalNav = isChurchStaff || (authenticated && isAccountHub);

  const [open, setOpen] = React.useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = LANG_OPTIONS.find((l) => l.code === lang) || LANG_OPTIONS[0];

  // Close dropdown on outside click
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

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-[rgba(45,27,78,0.1)] dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/frontend-pages/homepage" className="flex items-center gap-2 no-underline">
            <svg viewBox="0 0 40 40" fill="currentColor" className="w-10 h-10 text-[#2d1b4e] dark:text-[#d4af37]">
              <rect x="18.75" y="0" width="2.5" height="40" rx="0.5" />
              <rect x="13" y="5" width="14" height="2.2" rx="0.5" />
              <rect x="8" y="14" width="24" height="2.5" rx="0.5" />
              <rect x="12" y="30" width="16" height="2.2" rx="0.5" transform="rotate(-20 20 31)" />
            </svg>
            <div className="w-10 h-10 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-lg flex items-center justify-center">
              <span className="text-[#d4af37] dark:text-[#2d1b4e] font-['Georgia'] text-xl">OM</span>
            </div>
            <span className="font-['Georgia'] text-xl text-[#2d1b4e] dark:text-white">{t('common.brand_name')}</span>
          </a>

          {/* Desktop Navigation */}
          {mdUp ? (
            showPortalNav ? (
              <div className="flex items-center">
                <Stack spacing={1} direction="row" alignItems="center">
                  <PortalNavigations />
                </Stack>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                {PUBLIC_NAV_LINKS.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={`font-['Inter'] text-[15px] transition-colors no-underline ${
                        isActive
                          ? 'text-[#2d1b4e] dark:text-white font-medium'
                          : 'text-[#4a5565] dark:text-gray-400 hover:text-[#2d1b4e] dark:hover:text-white'
                      }`}
                    >
                      {t(link.tKey)}
                    </NavLink>
                  );
                })}
              </div>
            )
          ) : null}

          {/* CTA Button & Theme Toggle & Language */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                aria-label={t('common.language')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[#2d1b4e] dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-0 bg-transparent font-['Inter'] text-[13px]"
              >
                <IconWorld size={18} />
                <span className="hidden sm:inline">{currentLang.flag}</span>
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[60]">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        setLang(opt.code);
                        setLangOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 font-['Inter'] text-[14px] transition-colors cursor-pointer border-0 ${
                        opt.code === lang
                          ? 'bg-[rgba(45,27,78,0.08)] dark:bg-[rgba(212,175,55,0.15)] text-[#2d1b4e] dark:text-[#d4af37] font-medium'
                          : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-[16px]">{opt.flag}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleMode}
              aria-label={activeMode === 'light' ? t('common.dark_mode') : t('common.light_mode')}
              className="p-2 text-[#2d1b4e] dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-0 bg-transparent"
            >
              {activeMode === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
            </button>

            {/* Mobile hamburger */}
            {!mdUp && (
              <button
                onClick={() => setOpen(true)}
                aria-label="menu"
                className="p-2 text-[#2d1b4e] dark:text-white cursor-pointer border-0 bg-transparent"
              >
                <IconMenu2 size={24} />
              </button>
            )}

            {/* Auth CTA — desktop only */}
            {mdUp && !showPortalNav && (
              authenticated ? (
                <Profile />
              ) : (
                <a
                  href="/auth/login"
                  className="px-6 py-2.5 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] text-[15px] font-medium hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors no-underline"
                >
                  {t('common.sign_in')}
                </a>
              )
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
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
