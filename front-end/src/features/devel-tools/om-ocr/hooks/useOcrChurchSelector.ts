/**
 * useOcrChurchSelector — Shared hook for OCR Studio pages that need
 * a church selector.
 *
 * Reads/writes `?church=XX` in URL search params so the selection
 * persists across page navigation via OcrStudioNav.
 */

import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import {
  readOcrStudioChurchId,
  setOcrStudioChurchParam,
} from '../utils/ocrStudioChurch';

export function useOcrChurchSelector() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const userChurchId = user?.church_id ? Number(user.church_id) : null;
  const selectedChurchId = readOcrStudioChurchId(searchParams, userChurchId);

  const setSelectedChurchId = (churchId: number) => {
    setOcrStudioChurchParam(setSearchParams, churchId);
  };

  return { selectedChurchId, setSelectedChurchId, searchParams, setSearchParams };
}
