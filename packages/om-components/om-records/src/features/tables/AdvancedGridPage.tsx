import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AdvancedGridDialog } from '@/components/AdvancedGridDialog';

type GridDatasets = {
  baptism: any[];
  marriage: any[];
  funeral: any[];
};
type GridCounts = { baptism: number; marriage: number; funeral: number };

const AdvancedGridPage: React.FC = () => {
  const { state } = useLocation() as { state?: any };
  const [sp] = useSearchParams();

  const initialTab = (state?.table || sp.get('table') || 'baptism') as string;
  const churchId = Number(state?.churchId || sp.get('churchId') || sp.get('church_id') || 46);
  const search = String(state?.search || sp.get('search') || '');
  const sortField = (state?.sortField || sp.get('sortField') || undefined) as string | undefined;
  const sortDirection = (state?.sortDirection || sp.get('sortDirection') || 'desc') as 'asc' | 'desc';

  const [datasets, setDatasets] = useState<GridDatasets>({ baptism: [], marriage: [], funeral: [] });
  const [counts, setCounts] = useState<GridCounts>({ baptism: 0, marriage: 0, funeral: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Restore recordsApi integration when available
    // For now, set loading to false immediately with empty datasets
    setLoading(false);
  }, [churchId, search, sortField, sortDirection]);

  return (
    <AdvancedGridDialog
      open={true}
      onClose={() => window.history.back()}
      datasets={datasets}
      counts={counts}
      recordType={initialTab}
      loading={loading}
    />
  );
};

export default AdvancedGridPage;
