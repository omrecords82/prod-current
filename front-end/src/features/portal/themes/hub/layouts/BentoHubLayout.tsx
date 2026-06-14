import type { PortalHubLayoutProps } from '../portalHubTypes';
import { getRecordTypes, HubActivityFeed, HubHeaderBar, HubOnboarding, HubSearchInput } from '../HubShared';

const BENTO_COLORS = [
  'bg-[#dbeafe] border-[#93c5fd] text-blue-900 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-100',
  'bg-[#ffedd5] border-[#fdba74] text-orange-900 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-100',
  'bg-[#ede9fe] border-[#c4b5fd] text-violet-900 dark:bg-violet-950/40 dark:border-violet-700 dark:text-violet-100',
];

/** #5 Flat Bento Grid — pastel tiles, block activity grid */
export function BentoHubLayout({ hub }: PortalHubLayoutProps) {
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2">
        {recordTypes.map((cfg, i) => {
          const Icon = cfg.icon;
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => hub.onRecordsType(cfg.key)}
              className={`rounded-2xl border-2 p-5 text-left md:col-span-2 ${BENTO_COLORS[i]}`}
            >
              <Icon size={22} className="mb-3" />
              <p className="text-sm font-bold">{cfg.label}</p>
              <p className="mt-2 text-4xl font-black tabular-nums">
                {hub.recordsLoading ? '—' : cfg.count.toLocaleString()}
              </p>
            </button>
          );
        })}

        <div className="rounded-2xl border-2 border-border bg-card p-5 md:col-span-4 md:row-span-2">
          <h2 className="mb-4 text-base font-bold text-foreground">{hub.t('portal.recent_activity')}</h2>
          <HubSearchInput hub={hub} className="mb-4" />
          <HubActivityFeed hub={hub} compact />
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          {hub.quickActions.slice(0, 4).map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-secondary p-3 text-center transition-colors hover:bg-accent"
              >
                <Icon size={22} />
                <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
