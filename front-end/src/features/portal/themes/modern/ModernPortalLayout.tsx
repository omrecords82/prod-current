import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import { usePortalTheme } from '@/features/portal/themes/PortalThemeContext';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/portal/ui';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import { useLanguage } from '@/context/LanguageContext';
import { churchApi } from '@/features/account/accountApi';
import { getPortalUserDisplayName, getPortalUserInitials } from '@/features/portal/themes/portalUserDisplay';
import { CustomizerContext } from '@/context/CustomizerContext';
import Customizer from '@/layouts/full/shared/customizer/Customizer';
import { BrandLogo } from '@/layouts/full/shared/logo/Logo';
import {
  ChevronDown,
  Globe,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from '@/ui/icons';
import React, { useContext, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const PORTAL_LINKS = [
  { title: 'Portal', to: '/portal', match: (p: string) => p === '/portal' },
  { title: 'Church Records', to: '/portal/records', match: (p: string) => p.startsWith('/portal/records') },
  { title: 'OCR Studio', to: '/portal/ocr', match: (p: string) => p.startsWith('/portal/ocr') },
  { title: 'Analytics', to: '/portal/charts', match: (p: string) => p.startsWith('/portal/charts') },
  { title: 'Help', to: '/portal/guide', match: (p: string) => p.startsWith('/portal/guide') },
];

const LANG_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'el', label: 'EL' },
  { code: 'ru', label: 'RU' },
  { code: 'ro', label: 'RO' },
];

function getPageLabel(pathname: string): string {
  if (pathname.startsWith('/portal/records')) return 'Church Records';
  if (pathname.startsWith('/portal/ocr')) return 'OCR Studio';
  if (pathname.startsWith('/portal/charts')) return 'Analytics';
  if (pathname.startsWith('/portal/guide')) return 'Help';
  if (pathname.startsWith('/portal/certificates')) return 'Certificates';
  if (pathname.startsWith('/account')) return 'Account';
  return 'Portal';
}

const PortalHeader: React.FC<{ maxWidth: string }> = ({ maxWidth }) => {
  const { user, logout } = useAuth();
  const { churchMetadata } = useChurch();
  const { lang } = useLanguage();
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [configuredLang, setConfiguredLang] = useState('en');

  const churchName = churchMetadata?.church_name_display || churchMetadata?.church_name || '';
  const logoUrl = churchMetadata?.logo_url || null;
  const displayName = getPortalUserDisplayName(user);
  const initials = getPortalUserInitials(user);

  useEffect(() => {
    let cancelled = false;
    churchApi.getSettings<{ preferred_language?: string }>().then((settings) => {
      if (!cancelled && settings?.preferred_language) {
        const code = settings.preferred_language === 'gr' ? 'el' : settings.preferred_language;
        setConfiguredLang(code);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [churchMetadata?.church_id]);

  const visibleLangOptions = LANG_OPTIONS.filter(
    (opt) => opt.code === configuredLang || opt.code === lang,
  );
  const activeLang = visibleLangOptions[0] || LANG_OPTIONS[0];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div
        className="mx-auto flex h-16 max-w-[var(--portal-max-width)] items-center justify-between px-4 sm:px-6"
        style={{ maxWidth }}
      >
        <NavLink to="/portal" className="flex shrink-0 items-center gap-3 no-underline">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="size-10 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              {churchName.charAt(0) || 'C'}
            </div>
          )}
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-foreground leading-tight">{churchName}</div>
            <div className="text-xs text-muted-foreground">Parish workspace</div>
          </div>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {PORTAL_LINKS.map((link) => {
            const isActive = link.match(location.pathname);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`rounded-md px-3 py-2 text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.title}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 px-2 text-xs text-muted-foreground sm:flex">
            <Globe className="size-3.5" />
            <span>{activeLang.label}</span>
          </div>

          <div className="flex items-center rounded-full border border-border p-0.5">
            <button
              type="button"
              onClick={() => setActiveMode('light')}
              className={`rounded-full p-1.5 transition-colors ${
                activeMode === 'light' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              }`}
              aria-label="Light mode"
            >
              <Sun className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('dark')}
              className={`rounded-full p-1.5 transition-colors ${
                activeMode === 'dark' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
              aria-label="Dark mode"
            >
              <Moon className="size-3.5" />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {initials}
                </div>
                <span className="hidden text-sm sm:inline">{displayName}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => navigate('/account/profile')}>
                <User className="size-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/account/parish-management')}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => { void handleLogout(); }}
              >
                <LogOut className="size-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

const PortalFooter: React.FC<{ maxWidth: string }> = ({ maxWidth }) => {
  const { churchMetadata } = useChurch();
  const location = useLocation();

  const churchName = churchMetadata?.church_name_display || churchMetadata?.church_name || 'Church';
  const pageLabel = getPageLabel(location.pathname);

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div
        className="mx-auto flex max-w-[var(--portal-max-width)] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
        style={{ maxWidth }}
      >
        <span className="text-sm text-muted-foreground">
          {churchName} · {pageLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Powered by
          </span>
          <BrandLogo className="h-5 w-auto object-contain" height={20} />
        </div>
      </div>
    </footer>
  );
};

const ModernPortalLayout: React.FC = () => {
  const { authenticated, loading } = useAuth();
  const { isLayout, activeMode } = useContext(CustomizerContext);
  const { bundle } = usePortalTheme();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const isRecordsRoute = location.pathname.startsWith('/portal/records');
  const portalMax = 'min(100%, 96rem)';
  const maxWidth = isRecordsRoute
    ? '100%'
    : isLayout === 'boxed'
      ? '72rem'
      : portalMax;

  const mainPadding = isRecordsRoute ? 'px-3 py-5 sm:px-5 lg:px-6' : 'px-4 py-6 sm:px-6 lg:px-8';

  return (
    <div
      className={`${bundle.scopeClass} flex min-h-screen flex-col bg-background text-foreground`}
      data-theme-mode={activeMode}
      style={{ ['--portal-max-width' as string]: portalMax }}
    >
      <PortalHeader maxWidth={maxWidth} />
      <main
        className={`mx-auto w-full min-w-0 flex-1 ${mainPadding}`}
        style={{
          maxWidth,
          minHeight: 'calc(100vh - 8rem)',
        }}
      >
        <Outlet />
      </main>
      <PortalFooter maxWidth={maxWidth} />
      <ScrollToTop />
      <Customizer />
    </div>
  );
};

export default ModernPortalLayout;
