import type { PortalHubLayoutProps } from '../portalHubTypes';
import { getRecordTypes, HubActivityFeed, HubHeaderBar, HubOnboarding, HubSearchInput } from '../HubShared';

/** #4 Minimalist Paper — typography stats, no card chrome */
export function PaperHubLayout({ hub }: PortalHubLayoutProps) {
  if (hub.dashboardState === 'onboarding') {
    return (
      <div className="portal-paper-texture space-y-8">
        <HubHeaderBar hub={hub} />
        <HubOnboarding hub={hub} />
      </div>
    );
  }

  const recordTypes = getRecordTypes(hub);

  return (
    <div className="portal-paper-texture space-y-10">
      <HubHeaderBar hub={hub} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-4">
          {recordTypes.map((cfg) => (
            <button
              key={cfg.key}
              type="button"
              onClick={() => hub.onRecordsType(cfg.key)}
              className="block w-full border-b border-border/60 pb-6 text-left"
            >
              <p className="portal-paper-serif text-sm uppercase tracking-[0.15em] text-muted-foreground">{cfg.label}</p>
              <p className="portal-paper-serif mt-1 text-5xl font-semibold text-foreground">
                {hub.recordsLoading ? '—' : cfg.count.toLocaleString()}
              </p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8">
          <h2 className="portal-paper-serif mb-4 text-lg font-semibold text-foreground">{hub.t('portal.recent_activity')}</h2>
          <HubSearchInput hub={hub} className="mb-6" />
          <HubActivityFeed hub={hub} />
        </div>
      </div>

      <div>
        <h3 className="portal-paper-serif mb-4 text-sm uppercase tracking-wider text-muted-foreground">{hub.t('portal.tools')}</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-3">
          {hub.quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="portal-paper-serif text-left text-sm text-foreground underline-offset-4 hover:underline"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
