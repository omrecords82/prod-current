import type { PortalHubLayoutProps } from '../portalHubTypes';
import { getRecordTypes, HubActivityFeed, HubFilterPills, HubHeaderBar, HubOnboarding, HubSearchInput } from '../HubShared';
import { Droplets, Heart, Cross } from '@/ui/icons';

const ORNAMENT = 'portal-artdeco-ornament';

/** #2 Art Deco — circular gauges, gold frame, right activity column */
export function ArtDecoHubLayout({ hub }: PortalHubLayoutProps) {
  if (hub.dashboardState === 'onboarding') {
    return (
      <div className={`${ORNAMENT} space-y-6`}>
        <HubHeaderBar hub={hub} />
        <HubOnboarding hub={hub} />
      </div>
    );
  }

  const gauges = [
    { cfg: getRecordTypes(hub)[0], icon: Droplets },
    { cfg: getRecordTypes(hub)[1], icon: Heart },
    { cfg: getRecordTypes(hub)[2], icon: Cross },
  ];

  return (
    <div className={`${ORNAMENT} space-y-6`}>
      <HubHeaderBar hub={hub} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {gauges.map(({ cfg, icon: Icon }) => (
          <button
            key={cfg.key}
            type="button"
            onClick={() => hub.onRecordsType(cfg.key)}
            className="portal-artdeco-gauge flex flex-col items-center rounded-2xl border-2 border-[var(--portal-gold)] bg-card/80 px-4 py-6 text-center shadow-md transition-transform hover:scale-[1.02]"
          >
            <div className="mb-3 flex size-20 items-center justify-center rounded-full border-2 border-[var(--portal-gold)] bg-[var(--portal-gold-soft)]">
              <Icon size={28} className="text-[var(--portal-gold-dark)]" />
            </div>
            <p className="portal-artdeco-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">{cfg.label}</p>
            <p className="portal-artdeco-serif mt-1 text-3xl font-semibold text-foreground">
              {hub.recordsLoading ? '—' : cfg.count.toLocaleString()}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h3 className="portal-artdeco-serif mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--portal-gold-dark)]">
            {hub.t('portal.tools')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {hub.quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[var(--portal-gold)] bg-card/60 p-4 transition-colors hover:bg-[var(--portal-gold-soft)]"
                >
                  <Icon size={22} className="text-[var(--portal-gold-dark)]" />
                  <span className="text-center text-xs font-medium text-foreground">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-[var(--portal-gold)] bg-card/90 shadow-lg lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--portal-gold)]/40 px-5 py-4">
            <h3 className="portal-artdeco-serif text-sm font-semibold text-foreground">{hub.t('portal.recent_activity')}</h3>
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
