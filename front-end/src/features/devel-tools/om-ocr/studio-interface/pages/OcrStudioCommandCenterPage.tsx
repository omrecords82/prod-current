import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CommandCenter } from '../components/CommandCenter';
import { OcrStudioHubPanel } from '../components/OcrStudioHubPanel';
import { useOcrStudioPaths } from '../OcrStudioPathContext';
import type { OcrStudioScreen } from '../ocrStudioPaths';
import { ocrStudioPathWithChurch } from '../../utils/ocrStudioChurch';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import { useOcrStudioJobData } from '../hooks/useOcrStudioJobData';
import { useOcrStudioBatches } from '../hooks/useOcrStudioBatches';

export default function OcrStudioCommandCenterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toScreen, mode } = useOcrStudioPaths();
  const { isSuperAdmin } = useAuth();
  const { churchId, churchLabel } = useOcrStudioChurch();
  const { stats, jobs, loading, refresh } = useOcrStudioJobData(churchId);
  const batches = useOcrStudioBatches(jobs);

  const onNavigate = useCallback((screen: string) => {
    const path = toScreen(screen as OcrStudioScreen);
    navigate(ocrStudioPathWithChurch(path, searchParams));
  }, [navigate, searchParams, toScreen]);

  return (
    <OcrStudioHubPanel churchLabel={churchId ? churchLabel : undefined}>
      <CommandCenter
        onNavigate={onNavigate}
        stats={stats}
        recentBatches={batches}
        loading={loading}
        churchSelected={!!churchId}
        onRefresh={refresh}
        mode={mode}
        isSuperAdmin={isSuperAdmin()}
      />
    </OcrStudioHubPanel>
  );
}
