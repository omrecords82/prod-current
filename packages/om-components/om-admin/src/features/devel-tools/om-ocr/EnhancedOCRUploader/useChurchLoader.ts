import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import type { Church } from './types';

interface UseChurchLoaderOptions {
  urlChurchId: number | null;
}

function getValidChurchId(churchId: any): number | null {
  if (churchId === null || churchId === undefined || churchId === '') return null;
  const num = typeof churchId === 'string' ? parseInt(churchId, 10) : Number(churchId);
  return !isNaN(num) && num > 0 ? num : null;
}

export function useChurchLoader({ urlChurchId }: UseChurchLoaderOptions) {
  const { user, isSuperAdmin } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(urlChurchId);

  useEffect(() => {
    const loadChurches = async () => {
      try {
        let churchList: Church[] = [];
        let useMyChurches = false;

        try {
          const myChurchesResponse: any = await apiClient.get('/api/my/churches');
          const myChurchesData = myChurchesResponse.data;
          churchList = myChurchesData?.churches || myChurchesData || [];
          useMyChurches = true;

          if (churchList.length > 0) {
            console.log(`✅ Loaded ${churchList.length} churches from /api/my/churches`);
            setChurches(churchList);

            if (urlChurchId) {
              setSelectedChurchId(urlChurchId);
            } else if (user?.church_id) {
              setSelectedChurchId(getValidChurchId(user.church_id) || churchList[0].id);
            } else if (churchList.length > 0) {
              setSelectedChurchId(churchList[0].id);
            }
            return;
          }
        } catch (myChurchesError: any) {
          const status = myChurchesError.response?.status;
          if (status === 404 || status === 400) {
            console.log(`⚠️ /api/my/churches returned ${status}, trying fallback`);
          } else {
            console.warn('⚠️ /api/my/churches error:', status || myChurchesError.message);
          }
        }

        if (!useMyChurches || churchList.length === 0) {
          const isAdminRole = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin' || isSuperAdmin;

          if (isAdminRole) {
            try {
              const response: any = await apiClient.get('/api/churches');
              const data = response.data;
              churchList = data?.churches || data || [];

              if (churchList.length > 0) {
                console.log(`✅ Loaded ${churchList.length} churches from /api/churches (admin fallback)`);
                setChurches(churchList);

                if (urlChurchId) {
                  setSelectedChurchId(urlChurchId);
                } else if (user?.church_id) {
                  setSelectedChurchId(getValidChurchId(user.church_id) || churchList[0].id);
                } else if (churchList.length > 0) {
                  setSelectedChurchId(churchList[0].id);
                }
                return;
              }
            } catch (churchesError: any) {
              if (churchesError.response?.status === 403) {
                console.warn('⚠️ /api/churches returned 403, using user church_id');

                const fallbackChurchId = urlChurchId || getValidChurchId(user?.church_id);
                if (fallbackChurchId) {
                  setChurches([{
                    id: fallbackChurchId,
                    name: `Church ${fallbackChurchId}`,
                    database_name: `om_church_${fallbackChurchId}`
                  }]);
                  setSelectedChurchId(fallbackChurchId);
                  return;
                }
              }
              throw churchesError;
            }
          }
        }

        const fallbackChurchId = urlChurchId || getValidChurchId(user?.church_id);
        if (churchList.length === 0 && fallbackChurchId) {
          console.log(`⚠️ No churches loaded, using church_id: ${fallbackChurchId}`);
          setChurches([{
            id: fallbackChurchId,
            name: `Church ${fallbackChurchId}`,
            database_name: `om_church_${fallbackChurchId}`
          }]);
          setSelectedChurchId(fallbackChurchId);
          return;
        }

        if (churchList.length === 0) {
          console.error('❌ No churches available for user');
          setChurches([]);
        }

      } catch (error: any) {
        console.error('❌ Failed to load churches:', error);

        const fallbackChurchId = urlChurchId || getValidChurchId(user?.church_id);
        if (fallbackChurchId) {
          console.log(`⚠️ Using church_id as fallback: ${fallbackChurchId}`);
          setChurches([{
            id: fallbackChurchId,
            name: `Church ${fallbackChurchId}`,
            database_name: `om_church_${fallbackChurchId}`
          }]);
          setSelectedChurchId(fallbackChurchId);
        } else {
          setChurches([]);
        }
      }
    };

    loadChurches();
  }, [user, isSuperAdmin, urlChurchId]);

  return { churches, selectedChurchId, setSelectedChurchId, getValidChurchId };
}
