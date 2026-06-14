import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Skeleton,
} from '@/components/portal/ui';
import { PortalPageHeader } from '@/features/portal/themes/components/PortalPageHeader';
import RecordPipelineStatus from '@/features/portal/RecordPipelineStatus';
import { ChevronDown, Cross, Droplets, Heart, Plus, Search, Upload, Users, X } from '@/ui/icons';
import type { PortalHubViewModel, RecentRecord, RecordTypeConfig } from './portalHubTypes';

export function getRecordTypes(hub: PortalHubViewModel): RecordTypeConfig[] {
  return [
    {
      key: 'baptism',
      label: hub.t('portal.baptisms'),
      icon: Droplets,
      accent: 'text-blue-600',
      records: hub.recentBaptism.slice(0, 3),
      count: hub.counts.baptism,
    },
    {
      key: 'marriage',
      label: hub.t('portal.marriages'),
      icon: Heart,
      accent: 'text-rose-600',
      records: hub.recentMarriage.slice(0, 3),
      count: hub.counts.marriage,
    },
    {
      key: 'funeral',
      label: hub.t('portal.funerals'),
      icon: Cross,
      accent: 'text-violet-600',
      records: hub.recentFuneral.slice(0, 3),
      count: hub.counts.funeral,
    },
  ];
}

export function HubHeaderBar({ hub }: { hub: PortalHubViewModel }) {
  return (
    <PortalPageHeader
      title={hub.greeting}
      description={hub.pageSubtitle || undefined}
      actions={(
        <>
          <Button variant="outline" size="sm" onClick={hub.onUpload}>
            <Upload size={15} /> {hub.t('portal.upload_records')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus size={15} /> {hub.t('portal.add_record')} <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={hub.onAddBaptism}>
                <Users size={15} className="text-blue-600" /> {hub.t('portal.baptism_record')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={hub.onAddMarriage}>
                <Heart size={15} className="text-rose-600" /> {hub.t('portal.marriage_record')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={hub.onAddFuneral}>
                <Cross size={15} className="text-violet-600" /> {hub.t('portal.funeral_record')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    />
  );
}

export function HubOnboarding({ hub }: { hub: PortalHubViewModel }) {
  return (
    <Card className="py-16 text-center">
      <CardContent className="mx-auto flex max-w-lg flex-col items-center">
        <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Upload className="text-muted-foreground" size={32} />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">{hub.t('portal.upload_historical')}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{hub.t('portal.upload_historical_desc')}</p>
        <Button onClick={hub.onUpload}>
          <Upload size={18} /> {hub.t('portal.upload_records')}
        </Button>
      </CardContent>
    </Card>
  );
}

export function HubFilterPills({ hub, className = '' }: { hub: PortalHubViewModel; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {(['all', 'baptism', 'marriage', 'funeral'] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => hub.setActivityFilter(f)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            hub.activityFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {f === 'all' ? hub.t('portal.all') : f === 'baptism' ? hub.t('portal.baptisms') : f === 'marriage' ? hub.t('portal.marriages') : hub.t('portal.funerals')}
        </button>
      ))}
    </div>
  );
}

export function HubSearchInput({ hub, className = '' }: { hub: PortalHubViewModel; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={hub.searchInputRef}
        type="text"
        value={hub.searchTerm}
        onChange={(e) => hub.setSearchTerm(e.target.value)}
        placeholder={hub.t('portal.search_placeholder')}
        className="h-10 pl-9 pr-9"
      />
      {hub.searchTerm && (
        <button
          type="button"
          onClick={() => { hub.setSearchTerm(''); hub.searchInputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function ActivityRow({
  hub,
  rec,
  onClick,
  showRelative = true,
  highlightQuery,
}: {
  hub: PortalHubViewModel;
  rec: RecentRecord;
  onClick?: () => void;
  showRelative?: boolean;
  highlightQuery?: string;
}) {
  const Icon = hub.typeIcons[rec.type];
  const label = highlightQuery ? hub.highlightMatch(rec.label, highlightQuery) : rec.label;
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 py-3 text-left ${onClick ? 'transition-colors hover:bg-accent/50' : ''}`}
    >
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${hub.typeColors[rec.type]}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {hub.typeLabels[rec.type]} {rec.sub && `· ${rec.sub}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">
        {showRelative ? hub.formatRelativeTime(rec.date) : hub.formatDate(rec.date)}
      </span>
    </Comp>
  );
}

export function HubActivityFeed({ hub, compact = false }: { hub: PortalHubViewModel; compact?: boolean }) {
  if (hub.debouncedSearch.trim()) {
    if (hub.searchLoading) {
      return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
    }
    if (hub.searchResults.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No records found for &ldquo;{hub.debouncedSearch}&rdquo;
        </p>
      );
    }
    return (
      <div className="divide-y divide-border">
        {hub.searchResults.map((result) => (
          <ActivityRow
            key={`${result.type}-${result.id}`}
            hub={hub}
            rec={result}
            showRelative={false}
            highlightQuery={hub.debouncedSearch}
            onClick={() => hub.onSearchResultClick(result)}
          />
        ))}
      </div>
    );
  }

  if (hub.recordsLoading) {
    return <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className={compact ? 'h-8 w-full' : 'h-12 w-full'} />)}</div>;
  }
  if (hub.allActivity.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{hub.t('portal.no_recent_activity')}</p>;
  }
  return (
    <div className="divide-y divide-border">
      {hub.allActivity.map((rec) => (
        <ActivityRow
          key={`${rec.type}-${rec.id}`}
          hub={hub}
          rec={rec}
          onClick={() => hub.onRecordsType(rec.type)}
        />
      ))}
    </div>
  );
}

export function HubToolsStrip({ hub }: { hub: PortalHubViewModel }) {
  return (
    <div className="flex flex-wrap gap-2">
      {hub.quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <Icon size={16} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function HubPipeline({ hub }: { hub: PortalHubViewModel }) {
  if (!hub.showPipeline) return null;
  return <RecordPipelineStatus counts={hub.pipelineCounts} isAdmin={hub.isAdmin} />;
}

export function HubRecordStackCard({
  config,
  hub,
  cardClass = 'rounded-xl border border-border bg-card p-4 shadow-sm',
}: {
  config: RecordTypeConfig;
  hub: PortalHubViewModel;
  cardClass?: string;
}) {
  const Icon = config.icon;
  return (
    <button type="button" onClick={() => hub.onRecordsType(config.key)} className={`${cardClass} w-full text-left transition-colors hover:border-primary/40`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className={config.accent} />
          <span className="text-sm font-semibold text-foreground">{config.label}</span>
        </div>
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {hub.recordsLoading ? '—' : config.count.toLocaleString()}
        </span>
      </div>
      <div className="space-y-1.5">
        {hub.recordsLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-full" />)
        ) : config.records.length === 0 ? (
          <p className="text-xs text-muted-foreground">{hub.t('common.no_records_yet')}</p>
        ) : (
          config.records.map((rec) => (
            <div key={rec.id} className="flex justify-between gap-2 text-xs">
              <span className="truncate text-foreground">{rec.label}</span>
              <span className="shrink-0 text-muted-foreground">{hub.formatDate(rec.date)}</span>
            </div>
          ))
        )}
      </div>
    </button>
  );
}
