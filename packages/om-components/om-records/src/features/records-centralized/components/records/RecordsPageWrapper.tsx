import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import RecordsUIPage from '@/features/records-centralized/views/apps/records/RecordsUIPage';

/**
 * Wrapper component to extract params and pass to RecordsPage
 * This mimics the Next.js App Router page structure requested
 */
const RecordsPageWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  const churchId = Number(id);
  const initialTable = searchParams.get('table') || undefined;

  if (isNaN(churchId)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Invalid Church ID</h2>
          <p className="text-red-600 mt-1">
            The church ID "{id}" is not valid. Please check the URL.
          </p>
        </div>
      </div>
    );
  }

  return <RecordsPage churchId={churchId} initialTable={initialTable} />;
};

export default RecordsPageWrapper;
