/**
 * Church Context
 * 
 * Global state management for active church selection
 * Provides church switching with cache clearing
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useChurchSwitch } from '../hooks/useChurchSwitch';
import { apiClient } from '@/api/utils/axiosInstance';

interface ChurchMetadata {
  church_id: number;
  church_name: string;
  church_name_display: string;
  logo_url: string | null;
  primary_theme_color: string;
  database_name: string | null;
  calendar_type: 'Julian' | 'Revised Julian';
}

interface ChurchContextType {
  activeChurchId: number | null;
  churchMetadata: ChurchMetadata | null;
  setActiveChurchId: (churchId: number) => void;
  refreshChurchData: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

interface ChurchProviderProps {
  children: ReactNode;
}

export const ChurchProvider: React.FC<ChurchProviderProps> = ({ children }) => {
  const { user, authenticated } = useAuth();
  const { switchChurch } = useChurchSwitch();
  const [activeChurchId, setActiveChurchIdState] = useState<number | null>(null);
  const [churchMetadata, setChurchMetadata] = useState<ChurchMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch church metadata from API
   */
  const fetchChurchData = async (churchId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Force fresh fetch with no cache
      const data = await apiClient.get<any>(`/church-branding/header/${churchId}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (data.success && data.data) {
        setChurchMetadata(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch church data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load church data');
      
      // Set fallback metadata
      setChurchMetadata({
        church_id: churchId,
        church_name: 'System Admin',
        church_name_display: 'System Admin',
        logo_url: null,
        primary_theme_color: '#6200EE',
        database_name: null,
        calendar_type: 'Revised Julian'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set active church and fetch its data
   */
  const setActiveChurchId = (churchId: number) => {
    console.log(`🔄 ChurchContext: Switching to church ${churchId}`);
    
    // Clear metadata immediately to prevent ghosting
    setChurchMetadata(null);
    
    // Clear cache using hook
    switchChurch(churchId);
    
    // Update state
    setActiveChurchIdState(churchId);
    
    // Fetch fresh data
    fetchChurchData(churchId);
  };

  /**
   * Refresh current church data
   */
  const refreshChurchData = async () => {
    if (activeChurchId) {
      // Clear metadata to show loading state
      setChurchMetadata(null);
      await fetchChurchData(activeChurchId);
    }
  };

  /**
   * Initialize with user's church on mount/auth change
   */
  useEffect(() => {
    if (authenticated && user?.church_id && !activeChurchId) {
      console.log(`🏛️ ChurchContext: Initializing with church ${user.church_id}`);
      setActiveChurchId(user.church_id);
    }
  }, [authenticated, user?.church_id]);

  const value: ChurchContextType = {
    activeChurchId,
    churchMetadata,
    setActiveChurchId,
    refreshChurchData,
    isLoading,
    error
  };

  return (
    <ChurchContext.Provider value={value}>
      {children}
    </ChurchContext.Provider>
  );
};

/**
 * Hook to access church context
 */
export const useChurch = (): ChurchContextType => {
  const context = useContext(ChurchContext);
  if (context === undefined) {
    throw new Error('useChurch must be used within a ChurchProvider');
  }
  return context;
};

export default ChurchContext;
