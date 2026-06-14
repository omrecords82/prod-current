import type { PortalHubLayoutProps } from '../portalHubTypes';
import {
  getRecordTypes,
  HubActivityFeed,
  HubFilterPills,
  HubHeaderBar,
  HubOnboarding,
  HubPipeline,
  HubSearchInput,
} from '../HubShared';

const NEON = [
  'from-blue-500/30 to-cyan-400/10 border-blue-400/50',
  'from-pink-500/30 to-rose-400/10 border-pink-400/50',
  'from-violet-500/30 to-purple-400/10 border-violet-400/50',
];

/** #3 Neo-Gothic Dark — neon glass cards left, activity center, tools right */
export function NeoGothicHubLayout({ hub }: PortalHubLayoutProps) {
  if (hub.dashboardState === 'onboarding') {
    return (
      <div className="portal-neo-frame space-y-6">
        <HubHeaderBar hub={hub} />
        <HubOnboarding hub={hub} />
      </div>
    );
  }

  const recordTypes = getRecordTypes(hub);

  return (
    <div className="portal-neo-frame space-y-5">
      <HubHeaderBar hub={hub} />
      {hub.showPipeline && <HubPipeline hub={hub} />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-3">
          {recordTypes.map((cfg, i) => {
            const Icon = cfg.icon;
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => hub.onRecordsType(cfg.key)}
                className={`w-full rounded-lg border bg-gradient-to-br p-4 text-left backdrop-blur-sm ${NEON[i]}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Icon size={18} />
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {hub.recordsLoading ? '—' : cfg.count.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 backdrop-blur-md xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
            <h2 className="text-sm font-semibold tracking-wide text-foreground">{hub.t('portal.recent_activity')}</h2>
            <HubFilterPills hub={hub} />
          </div>
          <div className="space-y-4 px-5 py-4">
            <HubSearchInput hub={hub} />
            <HubActivityFeed hub={hub} compact />
          </div>
        </div>

        <div className="xl:col-span-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{hub.t('portal.tools')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {hub.quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card/30 p-3 text-center transition-colors hover:border-primary/50"
                >
                  <Icon size={18} className="text-primary" />
                  <span className="text-[10px] font-medium leading-tight text-foreground">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
