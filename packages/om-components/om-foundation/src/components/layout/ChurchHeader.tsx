import { apiClient } from '@/api/utils/axiosInstance';
import {
    Box,
    Chip,
    FormControl,
    MenuItem,
    Select,
    SelectChangeEvent,
    Skeleton,
    Typography
} from '@mui/material';
import { ChevronDown, Church } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChurch } from '../../context/ChurchContext';
import { useChurchSwitch } from '../../hooks/useChurchSwitch';

interface ChurchData {
  id: number;
  name: string;
  church_name?: string;
  database_name?: string;
  is_active?: boolean;
}

interface ChurchBranding {
  church_id: number;
  church_name: string;
  church_name_display: string;
  logo_url: string | null;
  primary_theme_color: string;
  email: string | null;
  website: string | null;
}

interface ChurchHeaderProps {
  onChurchChange?: (churchId: number) => void;
  currentChurchId?: number;
}

/**
 * ChurchHeader - Displays current church name and Switch Church dropdown for admins
 * Features:
 * - Listens for churchId changes and triggers re-fetch (via ChurchContext)
 * - Forces fresh API call on church switch
 * - Clears church-specific cache to prevent data bleeding
 * - Shows loading skeleton during church switch to prevent "ghosting"
 */
const ChurchHeader: React.FC<ChurchHeaderProps> = ({ onChurchChange, currentChurchId }) => {
  const { user, authenticated } = useAuth();
  const { activeChurchId, churchMetadata, setActiveChurchId, isLoading } = useChurch();
  const { switchChurch } = useChurchSwitch();
  const [churches, setChurches] = useState<ChurchData[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | ''>(currentChurchId || activeChurchId || '');
  const [error, setError] = useState<string | null>(null);

  // Check if user can switch churches (admin or super_admin)
  const canSwitchChurch = user?.role === 'super_admin' || user?.role === 'admin';

  // Fetch church branding for header display
  const fetchChurchBranding = async (churchId: number) => {
    // No longer needed - ChurchContext handles this
    // Kept for backward compatibility if needed
  };

  // Fetch churches list
  useEffect(() => {
    const fetchChurches = async () => {
      if (!authenticated || !canSwitchChurch) {
        return;
      }

      try {
        const data = await apiClient.get<any>('/admin/churches');
        const churchList = data.churches || data.data?.churches || [];
        setChurches(churchList.filter((c: ChurchData) => c.is_active !== false));

        // Auto-select first church if none selected
        if (!selectedChurchId && churchList.length > 0) {
          const firstChurch = churchList[0];
          setSelectedChurchId(firstChurch.id);
          setActiveChurchId(firstChurch.id);
          onChurchChange?.(firstChurch.id);
        }
      } catch (err) {
        console.error('Failed to fetch churches:', err);
        setError(err instanceof Error ? err.message : 'Failed to load churches');
      }
    };

    fetchChurches();
  }, [authenticated, canSwitchChurch]);

  // 🔥 FORCE REFRESH: Listen for activeChurchId changes from ChurchContext
  // State Reset: Clear churchMetadata before fetching to prevent "ghosting"
  useEffect(() => {
    if (activeChurchId && activeChurchId !== selectedChurchId) {
      console.log(`🔄 ChurchHeader: activeChurchId changed from ${selectedChurchId} → ${activeChurchId}`);
      
      // Update selected church to match context
      setSelectedChurchId(activeChurchId);
      
      // Notify parent component
      onChurchChange?.(activeChurchId);
    }
  }, [activeChurchId]);

  // 🔥 SESSION SYNC: Listen for session churchId changes
  // Force re-fetch whenever the user's church_id changes in session
  useEffect(() => {
    if (authenticated && user?.church_id && user.church_id !== selectedChurchId) {
      console.log(`🔄 ChurchHeader: Session churchId changed from ${selectedChurchId} → ${user.church_id}`);
      
      // Update to match session
      setActiveChurchId(user.church_id);
    }
  }, [authenticated, user?.church_id]);

  // Listen for prop changes (from Map of Kingdom or other sources)
  useEffect(() => {
    if (currentChurchId && currentChurchId !== selectedChurchId) {
      console.log(`🔄 ChurchHeader: currentChurchId prop changed from ${selectedChurchId} → ${currentChurchId}`);
      
      // Use ChurchContext to switch (triggers cache clear and re-fetch)
      setActiveChurchId(currentChurchId);
    }
  }, [currentChurchId]);

  const handleChurchChange = (event: SelectChangeEvent<number | ''>) => {
    const churchId = event.target.value as number;
    
    console.log(`👤 User switched church: ${selectedChurchId} → ${churchId}`);
    
    // Update local state immediately
    setSelectedChurchId(churchId);
    
    // Use ChurchContext to switch (handles cache clear and re-fetch)
    // This will trigger the activeChurchId useEffect above
    setActiveChurchId(churchId);
    
    // Notify parent component
    onChurchChange?.(churchId);
  };

  const displayName = churchMetadata?.church_name_display || 
                       churches.find(c => c.id === selectedChurchId)?.church_name || 
                       churches.find(c => c.id === selectedChurchId)?.name || 
                       'No Church Selected';

  if (!authenticated || !canSwitchChurch) {
    return null;
  }

  if (isLoading && !churchMetadata) {
    // Show loading skeleton during initial load or church switch
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
        <Church size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
        <Skeleton 
          variant="rectangular" 
          width={180} 
          height={32}
          sx={{ 
            bgcolor: 'rgba(255,255,255,0.1)',
            borderRadius: 1
          }} 
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Chip
        icon={<Church size={14} />}
        label="Church Error"
        size="small"
        sx={{
          bgcolor: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Church size={18} style={{ color: 'rgba(255,255,255,0.8)' }} />
      
      {churches.length > 1 ? (
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={selectedChurchId}
            onChange={handleChurchChange}
            displayEmpty
            IconComponent={() => <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.7)', marginRight: 8 }} />}
            sx={{
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 500,
              bgcolor: 'rgba(255,255,255,0.1)',
              borderRadius: 1,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.2)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.4)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.5)',
              },
              '& .MuiSelect-select': {
                py: 0.75,
                px: 1.5,
              }
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: '#1e1e2d',
                  color: '#fff',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.875rem',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'rgba(99, 102, 241, 0.2)',
                    }
                  }
                }
              }
            }}
          >
            {churches.map((church) => (
              <MenuItem key={church.id} value={church.id}>
                {church.church_name || church.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 500
          }}
        >
          {displayName}
        </Typography>
      )}
    </Box>
  );
};

export default ChurchHeader;
