/**
 * RecordHeaderBanner - Shared header component for records pages
 * Renders the header banner with church name, calendar, logos, etc.
 * Loads settings from API and listens for updates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { fetchWithChurchContext } from '@/shared/lib/fetchWithChurchContext';

interface RecordHeaderBannerProps {
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  churchName?: string;
  recordSettings?: any; // Settings from API or parent component
  interactive?: boolean; // If true, allows double-click configuration (for preview)
  onElementDoubleClick?: (elementType: string) => void; // Callback for double-click events
}

const RecordHeaderBanner: React.FC<RecordHeaderBannerProps> = ({
  churchId,
  recordType,
  churchName,
  recordSettings: externalSettings,
  interactive = false,
  onElementDoubleClick,
}) => {
  const [recordSettings, setRecordSettings] = useState<any>(externalSettings || null);
  const [loading, setLoading] = useState(!externalSettings);

  // Load settings from API if not provided
  useEffect(() => {
    const loadSettings = async (forceReload = false) => {
      // If external settings are provided and we're not forcing a reload, use them
      if (externalSettings && !forceReload) {
        setRecordSettings(externalSettings);
        setLoading(false);
        return;
      }

      try {
        // Add cache-busting parameter to ensure fresh data
        const cacheBuster = forceReload ? `?t=${Date.now()}` : '';
        const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/record-settings${cacheBuster}`, {
          churchId,
          credentials: 'include',
          cache: forceReload ? 'no-cache' : 'default',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setRecordSettings(data.settings);
            console.log('[RecordHeaderBanner] Settings loaded:', data.settings);
            console.log('[RecordHeaderBanner] Logo enabled:', data.settings.logo?.enabled);
            console.log('[RecordHeaderBanner] Calendar enabled:', data.settings.calendar?.enabled);
            console.log('[RecordHeaderBanner] OM Logo enabled:', data.settings.omLogo?.enabled);
          } else {
            console.log('[RecordHeaderBanner] No settings found, using empty object');
            setRecordSettings({});
          }
        } else {
          console.error('[RecordHeaderBanner] Failed to load settings, status:', response.status);
        }
      } catch (err) {
        console.error('[RecordHeaderBanner] Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = (event: CustomEvent) => {
      console.log('[RecordHeaderBanner] Settings update event received:', event.detail);
      if (event.detail?.churchId === churchId) {
        // Force reload when settings are updated
        loadSettings(true);
      }
    };

    window.addEventListener('recordSettingsUpdated', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('recordSettingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, [churchId, externalSettings]);

  const getImagePath = (type: string): string => {
    if (!recordSettings) return '';
    
    switch (type) {
      case 'logo':
        const logoImages = recordSettings?.imageLibrary?.logo || [];
        const logoIndex = recordSettings?.currentImageIndex?.logo ?? 0;
        if (logoImages.length > 0 && logoImages[logoIndex]) {
          return logoImages[logoIndex];
        }
        return `/images/records/${churchId}-logo.png`;
      case 'recordImage':
        const recordImages = recordSettings?.imageLibrary?.[recordType] || [];
        const recordIndex = recordSettings?.currentImageIndex?.[recordType] ?? 0;
        if (recordImages.length > 0 && recordImages[recordIndex]) {
          return recordImages[recordIndex];
        }
        return `/images/records/${recordType}.png`;
      case 'bg':
        const bgImages = recordSettings?.imageLibrary?.bg || [];
        const bgIndex = recordSettings?.currentImageIndex?.bg ?? 0;
        if (bgImages.length > 0 && bgImages[bgIndex]) {
          return bgImages[bgIndex];
        }
        return `/images/records/${churchId}-bg.png`;
      case 'g1':
        const g1Images = recordSettings?.imageLibrary?.g1 || [];
        const g1Index = recordSettings?.currentImageIndex?.g1 ?? 0;
        if (g1Images.length > 0 && g1Images[g1Index]) {
          return g1Images[g1Index];
        }
        return '/images/records/g1.png';
      case 'omLogo':
        const omImages = recordSettings?.imageLibrary?.omLogo || [];
        const omIndex = recordSettings?.currentImageIndex?.omLogo ?? 0;
        if (omImages.length > 0 && omImages[omIndex]) {
          return omImages[omIndex];
        }
        return '/images/records/om-logo.png';
      default:
        return '';
    }
  };

  // Get current date for calendar
  const getCalendarDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        year: date.getFullYear(),
        weekday: date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3),
        day: date.getDate(),
      });
    }
    return dates;
  };

  const calendarDates = useMemo(() => getCalendarDates(), []);

  if (loading) {
    return <Box sx={{ height: 200, bgcolor: 'background.paper' }} />;
  }

  const recordTypeLabel = recordType === 'baptism' ? 'Baptism' : recordType === 'marriage' ? 'Marriage' : 'Funeral';

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        height: 200,
        maxHeight: 200,
        backgroundImage: recordSettings?.backgroundImage?.enabled === true 
          ? `url(${getImagePath('bg')})` 
          : 'none',
        backgroundRepeat: recordSettings?.backgroundImage?.size === 'auto' ? 'repeat' : 'no-repeat',
        backgroundSize: recordSettings?.backgroundImage?.size || 'auto',
        backgroundPosition: recordSettings?.backgroundImage?.position || 'top left',
        opacity: recordSettings?.backgroundImage?.opacity !== undefined 
          ? (recordSettings.backgroundImage.opacity / 100) 
          : 1,
        overflow: 'hidden',
        ...(interactive && {
          cursor: 'pointer',
        }),
      }}
      onDoubleClick={interactive ? () => onElementDoubleClick?.('backgroundImage') : undefined}
    >
      {/* Gradient Overlay using g1.png */}
      {recordSettings?.g1Image?.enabled === true && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${getImagePath('g1')})`,
            backgroundSize: recordSettings?.g1Image?.size || 'cover',
            backgroundPosition: recordSettings?.g1Image?.position || 'center',
            opacity: recordSettings?.g1Image?.opacity !== undefined 
              ? recordSettings.g1Image.opacity 
              : 0.85,
            zIndex: 0,
            ...(interactive && {
              cursor: 'pointer',
            }),
          }}
          onDoubleClick={interactive ? (e) => {
            e.stopPropagation();
            onElementDoubleClick?.('g1Image');
          } : undefined}
        />
      )}
      
      {/* Top Gold Horizontal Border */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '20px',
          backgroundImage: 'url(/images/records/gold-hor.png)',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          zIndex: 10,
        }}
      />
      
      {/* Left Gold Vertical Border */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '20px',
          backgroundImage: 'url(/images/records/gold-vertical.png)',
          backgroundRepeat: 'repeat-y',
          backgroundSize: '100% auto',
          zIndex: 10,
        }}
      />
      
      {/* Right Gold Vertical Border */}
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '20px',
          backgroundImage: 'url(/images/records/gold-vertical.png)',
          backgroundRepeat: 'repeat-y',
          backgroundSize: '100% auto',
          zIndex: 10,
        }}
      />
      
      {/* Bottom Gold Horizontal Border */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '20px',
          backgroundImage: 'url(/images/records/gold-hor.png)',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          zIndex: 10,
        }}
      />

      {/* Main Header Content Area - 4 Column Layout */}
      <Box
        sx={{
          width: '100%',
          ml: '20px',
          mr: '20px',
          mt: '10px',
          mb: '10px',
          pl: 2,
          pr: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: 2,
          alignItems: 'stretch',
          position: 'relative',
          zIndex: 1,
          height: '100%',
        }}
      >
        {/* Record Image */}
        {recordSettings?.recordImages?.enabled !== false && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gridColumn: recordSettings?.recordImages?.column || 1,
              position: 'relative',
              height: '100%',
              zIndex: 2,
              ...(interactive && {
                cursor: 'pointer',
                '&:hover': {
                  outline: '2px dashed #1976d2',
                  outlineOffset: '2px',
                },
              }),
            }}
            onDoubleClick={interactive ? (e) => {
              e.stopPropagation();
              onElementDoubleClick?.('recordImage');
            } : undefined}
          >
            <Box
              component="img"
              src={getImagePath('recordImage')}
              alt="Record Image"
              sx={{
                width: `${recordSettings?.recordImages?.width || 60}px`,
                height: `${recordSettings?.recordImages?.height || 60}px`,
                objectFit: (recordSettings?.recordImages?.objectFit || 'contain') as any,
                border: `${recordSettings?.recordImages?.borderWidth || 3}px solid #4C1D95`,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(76, 29, 149, 0.3)',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `/images/records/${recordType}.png`;
              }}
            />
            {interactive && (
              <Typography variant="caption" sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.8)', px: 0.5, borderRadius: 0.5 }}>
                Record Image
              </Typography>
            )}
          </Box>
        )}

        {/* Calendar Cards */}
        {recordSettings?.calendar?.enabled === true && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gridColumn: recordSettings?.calendar?.column || 2,
              position: 'relative',
              height: '100%',
              zIndex: 2,
              gap: 0.5,
              ...(interactive && {
                cursor: 'pointer',
                '&:hover': {
                  outline: '2px dashed #1976d2',
                  outlineOffset: '2px',
                },
              }),
            }}
            onDoubleClick={interactive ? (e) => {
              e.stopPropagation();
              onElementDoubleClick?.('calendar');
            } : undefined}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
              {calendarDates.map((date, index) => (
                <Box
                  key={index}
                  sx={{
                    width: '50px',
                    height: '55px',
                    background: 'linear-gradient(145deg, #ffffff 0%, #f5f0e6 50%, #e8dcc8 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    border: '2px solid #DAA520',
                    transform: `translateY(${index * -2}px) rotate(${(index - 1) * 1.5}deg)`,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '14px',
                      background: 'linear-gradient(180deg, #8B0000 0%, #5c0000 100%)',
                      borderRadius: '6px 6px 0 0',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '6px', fontWeight: 800, color: '#fff', zIndex: 1, mt: '-1px' }}>
                    {date.month} {date.year}
                  </Typography>
                  <Typography sx={{ fontSize: '7px', fontWeight: 700, color: '#4C1D95', mt: 0.25 }}>
                    {date.weekday}
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>
                    {date.day}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Church Logo */}
        {recordSettings?.logo?.enabled === true && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gridColumn: recordSettings?.logo?.column || 3,
              position: 'relative',
              height: '100%',
              zIndex: 2,
              ...(interactive && {
                cursor: 'pointer',
                '&:hover': {
                  outline: '2px dashed #1976d2',
                  outlineOffset: '2px',
                },
              }),
            }}
            onDoubleClick={interactive ? (e) => {
              e.stopPropagation();
              onElementDoubleClick?.('logo');
            } : undefined}
          >
            <Box
              component="img"
              src={getImagePath('logo')}
              alt="Church Logo"
              sx={{
                width: `${recordSettings?.logo?.width || 120}px`,
                height: recordSettings?.logo?.height === 'auto' ? 'auto' : `${recordSettings?.logo?.height || 120}px`,
                maxHeight: '160px',
                objectFit: (recordSettings?.logo?.objectFit || 'contain') as any,
                opacity: (recordSettings?.logo?.opacity || 100) / 100,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/records/om-logo.png';
              }}
            />
          </Box>
        )}

        {/* OM Logo */}
        {recordSettings?.omLogo?.enabled === true && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gridColumn: recordSettings?.omLogo?.column || 4,
              position: 'relative',
              height: '100%',
              zIndex: 2,
              ...(interactive && {
                cursor: 'pointer',
                '&:hover': {
                  outline: '2px dashed #1976d2',
                  outlineOffset: '2px',
                },
              }),
            }}
            onDoubleClick={interactive ? (e) => {
              e.stopPropagation();
              onElementDoubleClick?.('omLogo');
            } : undefined}
          >
            <Box
              component="img"
              src={getImagePath('omLogo')}
              alt="OM Logo"
              sx={{
                width: `${recordSettings?.omLogo?.width || 68}px`,
                height: recordSettings?.omLogo?.height === 'auto' ? 'auto' : `${recordSettings?.omLogo?.height || 68}px`,
                objectFit: (recordSettings?.omLogo?.objectFit || 'contain') as any,
                opacity: (recordSettings?.omLogo?.opacity || 100) / 100,
              }}
            />
          </Box>
        )}

        {/* Church Name Text - Removed per user request */}
        {/* Text can be re-enabled via recordSettings.headerText.enabled if needed in the future */}
      </Box>
    </Box>
  );
};

export default RecordHeaderBanner;

