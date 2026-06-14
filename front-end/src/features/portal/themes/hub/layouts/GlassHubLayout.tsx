import type { PortalHubLayoutProps } from '../portalHubTypes';
import { getRecordTypes, HubActivityFeed, HubHeaderBar, HubOnboarding, HubSearchInput } from '../HubShared';

/** #6 Glassmorphism — frosted cards, radial tools orbit */
export function GlassHubLayout({ hub }: PortalHubLayoutProps) {
  if (hub.dashboardState === 'onboarding') {
    return (
      <div className="space-y-6">
        <HubHeaderBar hub={hub} />
        <HubOnboarding hub={hub} />
      </div>
    );
  }

  const recordTypes = getRecordTypes(hub);
  const orbitActions = hub.quickActions.slice(0, 5);

  return (
    <div className="space-y-6">
      <HubHeaderBar hub={hub} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {recordTypes.map((cfg) => {
          const Icon = cfg.icon;
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => hub.onRecordsType(cfg.key)}
              className="portal-glass-card rounded-2xl p-5 text-left"
            >
              <Icon size={20} className="mb-3 text-primary" />
              <p className="text-sm font-medium text-foreground">{cfg.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                {hub.recordsLoading ? '—' : cfg.count.toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="portal-glass-card rounded-2xl lg:col-span-7">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">{hub.t('portal.recent_activity')}</h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            <HubSearchInput hub={hub} />
            <HubActivityFeed hub={hub} />
          </div>
        </div>

        <div className="flex items-center justify-center lg:col-span-5">
          <div className="portal-glass-orbit relative size-64">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{hub.t('portal.tools')}</span>
            </div>
            {orbitActions.map((action, i) => {
              const Icon = action.icon;
              const angle = (i / orbitActions.length) * 2 * Math.PI - Math.PI / 2;
              const r = 100;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  title={action.label}
                  className="portal-glass-card absolute flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                >
                  <Icon size={20} className="text-primary" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
