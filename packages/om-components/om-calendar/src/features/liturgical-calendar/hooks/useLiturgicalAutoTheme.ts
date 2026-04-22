/**
 * Auto-theme hook that sets the MUI theme based on today's liturgical color.
 *
 * On mount, calls the backend for today's liturgical color, then maps it
 * to the corresponding MUI theme name and applies it via CustomizerContext.
 *
 * Respects manual override: if the user has manually chosen a theme,
 * the auto-theme will not overwrite it.
 */

import { useContext, useEffect } from 'react';
import { CustomizerContext } from '@/context/CustomizerContext';
import { getLiturgicalColorToday } from '../api/liturgicalCalendarApi';
import { useChurch } from '@/context/ChurchContext';

const MANUAL_OVERRIDE_KEY = 'orthodoxmetrics-liturgical-theme-manual';

/**
 * Hook to automatically sync the site theme with today's liturgical color.
 * Must be called inside both CustomizerContextProvider and AuthProvider.
 * Accepts `authenticated` flag to know when the user is logged in.
 */
export function useLiturgicalAutoTheme(authenticated?: boolean) {
  const customizerContext = useContext(CustomizerContext);
  const { churchMetadata } = useChurch();
  const calendarType = churchMetadata?.calendar_type;

  useEffect(() => {
    // Don't run until user is authenticated
    if (!authenticated) return;

    // Don't run if context isn't available
    if (!customizerContext?.setActiveTheme) return;

    // If user has manually overridden the theme, respect that
    try {
      const manualOverride = localStorage.getItem(MANUAL_OVERRIDE_KEY);
      if (manualOverride === 'true') return;
    } catch {
      // localStorage not available — proceed with auto-theme
    }

    getLiturgicalColorToday(calendarType)
      .then(({ themeName }) => {
        if (themeName) {
          customizerContext.setActiveTheme(themeName);
        }
      })
      .catch(() => {
        // Silently fail — keep whatever theme is currently set
      });
  }, [authenticated, calendarType]); // Run when auth state or calendar type changes
}

/**
 * Enable manual theme override (disables auto-theme).
 */
export function setManualThemeOverride(enabled: boolean) {
  try {
    if (enabled) {
      localStorage.setItem(MANUAL_OVERRIDE_KEY, 'true');
    } else {
      localStorage.removeItem(MANUAL_OVERRIDE_KEY);
    }
  } catch {
    // localStorage not available
  }
}
