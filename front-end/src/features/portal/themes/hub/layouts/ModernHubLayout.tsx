import type { PortalHubLayoutProps } from '../portalHubTypes';
import {
  getRecordTypes,
  HubActivityFeed,
  HubFilterPills,
  HubHeaderBar,
  HubOnboarding,
  HubPipeline,
  HubRecordStackCard,
  HubSearchInput,
  HubToolsStrip,
} from '../HubShared';

/** #1 Modern Professional — left stat stack, top tools strip, center activity panel */
export function ModernHubLayout({ hub }: PortalHubLayoutProps) {
  if (hub.dashboardState === 'onboarding') {
    return (
      <div className="space-y-6">
        <HubHeaderBar hub={hub} />
        <HubOnboarding hub={hub} />
      </div>
    );
  }

  const recordTypes = getRecordTypes(hub);

  return (
    <div className="space-y-5">
      <HubHeaderBar hub={hub} />
      <HubToolsStrip hub={hub} />
      {hub.showPipeline && <HubPipeline hub={hub} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-3">
          {recordTypes.map((cfg) => (
            <HubRecordStackCard key={cfg.key} config={cfg} hub={hub} />
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{hub.t('portal.recent_activity')}</h2>
              <p className="text-xs text-muted-foreground">Sacrament entries across your parish</p>
            </div>
            <HubFilterPills hub={hub} />
          </div>
          <div className="space-y-4 px-5 py-4">
            <HubSearchInput hub={hub} />
            <HubActivityFeed hub={hub} />
          </div>
        </div>
      </div>
    </div>
  );
}
