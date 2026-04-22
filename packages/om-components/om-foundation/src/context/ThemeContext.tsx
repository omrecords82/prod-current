/**
 * Orthodox Metrics - Theme Context
 * Manages application themes with localStorage persistence and liturgical season awareness
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Available theme types
export type ThemeName =
  | 'orthodoxTraditional'
  | 'lentSeason'
  | 'paschaTheme'
  | 'dormitionFast'
  | 'nativityFast'
  | 'pentecostSeason'
  | 'modern'
  | 'dark';

// Theme configuration interface
export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    warning: string;
    error: string;
    success: string;
  };
  agGridTheme: 'ag-theme-orthodox' | 'ag-theme-lent' | 'ag-theme-pascha' | 'ag-theme-alpine' | 'ag-theme-balham';
  cssClass: string;
  icon: string;
  season?: 'lent' | 'pascha' | 'ordinary' | 'nativity' | 'dormition' | 'pentecost';
}

// Pre-defined theme configurations
export const THEME_CONFIGS: Record<ThemeName, ThemeConfig> = {
  orthodoxTraditional: {
    name: 'orthodoxTraditional',
    displayName: 'Orthodox Traditional',
    description: 'Classic Orthodox colors - deep blues and golds',
    colors: {
      primary: '#927dff',      // Deep blue
      secondary: '#d97706',     // Gold
      background: '#724eeb',    // Pure white
      surface: '#f8fafc',      // Light gray
      text: '#1e293b',         // Dark gray
      textSecondary: '#64748b', // Medium gray
      accent: '#dc2626',       // Orthodox red
      warning: '#f59e0b',      // Amber
      error: '#dc2626',        // Red
      success: '#059669',      // Green
    },
    agGridTheme: 'ag-theme-orthodox',
    cssClass: 'theme-orthodox-traditional',
    icon: '⛪',
    season: 'ordinary'
  },

  lentSeason: {
    name: 'lentSeason',
    displayName: 'Lenten Season',
    description: 'Subdued purples and grays for Great Lent',
    colors: {
      primary: '#6b21a8',      // Deep purple
      secondary: '#4c1d95',     // Darker purple
      background: '#724eeb',    // Very light purple
      surface: '#f3f0ff',      // Light purple
      text: '#3c1361',         // Dark purple
      textSecondary: '#6b7280', // Gray
      accent: '#7c2d12',       // Dark red-brown
      warning: '#d97706',      // Orange
      error: '#991b1b',        // Dark red
      success: '#065f46',      // Dark green
    },
    agGridTheme: 'ag-theme-lent',
    cssClass: 'theme-lent-season',
    icon: '✝️',
    season: 'lent'
  },

  paschaTheme: {
    name: 'paschaTheme',
    displayName: 'Paschal Joy',
    description: 'Bright whites and golds for Resurrection season',
    colors: {
      primary: '#dc2626',      // Bright red
      secondary: '#f59e0b',     // Gold
      background: '#724eeb',    // Warm white
      surface: '#fefce8',      // Light gold
      text: '#7c2d12',         // Dark red-brown
      textSecondary: '#92400e', // Medium brown
      accent: '#1d4ed8',       // Blue accent
      warning: '#d97706',      // Orange
      error: '#dc2626',        // Red
      success: '#16a34a',      // Bright green
    },
    agGridTheme: 'ag-theme-pascha',
    cssClass: 'theme-pascha',
    icon: '🌅',
    season: 'pascha'
  },

  dormitionFast: {
    name: 'dormitionFast',
    displayName: 'Dormition Fast',
    description: 'Marian blues for the Dormition season',
    colors: {
      primary: '#927dff',      // Royal blue
      secondary: '#f8fafc',     // Light blue-white
      background: '#724eeb',    // Very light blue
      surface: '#e0f2fe',      // Light blue
      text: '#0c4a6e',         // Dark blue
      textSecondary: '#475569', // Blue-gray
      accent: '#7c3aed',       // Purple
      warning: '#d97706',      // Orange
      error: '#dc2626',        // Red
      success: '#059669',      // Green
    },
    agGridTheme: 'ag-theme-orthodox',
    cssClass: 'theme-dormition-fast',
    icon: '🌙',
    season: 'dormition'
  },

  nativityFast: {
    name: 'nativityFast',
    displayName: 'Nativity Fast',
    description: 'Deep greens and gold for Advent season',
    colors: {
      primary: '#14532d',      // Dark green
      secondary: '#f59e0b',     // Gold
      background: '#724eeb',    // Very light green
      surface: '#dcfce7',      // Light green
      text: '#14532d',         // Dark green
      textSecondary: '#4b5563', // Gray
      accent: '#dc2626',       // Red
      warning: '#d97706',      // Orange
      error: '#dc2626',        // Red
      success: '#16a34a',      // Green
    },
    agGridTheme: 'ag-theme-alpine',
    cssClass: 'theme-nativity-fast',
    icon: '🌲',
    season: 'nativity'
  },

  pentecostSeason: {
    name: 'pentecostSeason',
    displayName: 'Pentecost Season',
    description: 'Vibrant reds and golds for the Holy Spirit',
    colors: {
      primary: '#dc2626',      // Bright red
      secondary: '#f59e0b',     // Gold
      background: '#724eeb',    // Light red
      surface: '#fecaca',      // Lighter red
      text: '#7f1d1d',         // Dark red
      textSecondary: '#6b7280', // Gray
      accent: '#1d4ed8',       // Blue
      warning: '#d97706',      // Orange
      error: '#991b1b',        // Dark red
      success: '#16a34a',      // Green
    },
    agGridTheme: 'ag-theme-orthodox',
    cssClass: 'theme-pentecost-season',
    icon: '🔥',
    season: 'pentecost'
  },

  modern: {
    name: 'modern',
    displayName: 'Modern Clean',
    description: 'Contemporary design with clean lines',
    colors: {
      primary: '#3b82f6',      // Blue
      secondary: '#64748b',     // Slate
      background: '#724eeb',    // White
      surface: '#f8fafc',      // Light gray
      text: '#1e293b',         // Dark slate
      textSecondary: '#64748b', // Medium slate
      accent: '#8b5cf6',       // Purple
      warning: '#f59e0b',      // Amber
      error: '#ef4444',        // Red
      success: '#10b981',      // Emerald
    },
    agGridTheme: 'ag-theme-alpine',
    cssClass: 'theme-modern',
    icon: '💻',
    season: 'ordinary'
  },

  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    description: 'Dark theme for low-light environments',
    colors: {
      primary: '#60a5fa',      // Light blue
      secondary: '#9ca3af',     // Gray
      background: '#724eeb',    // Dark gray
      surface: '#1f2937',      // Medium gray
      text: '#f9fafb',         // Light gray
      textSecondary: '#d1d5db', // Medium light gray
      accent: '#a78bfa',       // Light purple
      warning: '#fbbf24',      // Yellow
      error: '#f87171',        // Light red
      success: '#34d399',      // Light green
    },
    agGridTheme: 'ag-theme-balham',
    cssClass: 'theme-dark',
    icon: '🌙',
    season: 'ordinary'
  }
};

// Theme context interface
interface ThemeContextType {
  currentTheme: ThemeName;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeName) => void;
  availableThemes: ThemeConfig[];
  isSystemDarkMode: boolean;
  autoThemeEnabled: boolean;
  setAutoThemeEnabled: (enabled: boolean) => void;
  getCurrentLiturgicalSeason: () => string;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
}

// Get system dark mode preference
const getSystemDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Get stored theme from localStorage
const getStoredTheme = (): ThemeName | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('orthodmetrics-theme');
  return stored as ThemeName || null;
};

// Get current liturgical season (simplified logic)
const getCurrentLiturgicalSeason = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Simplified liturgical calendar
  if ((month === 12 && day >= 15) || (month === 1 && day <= 6)) {
    return 'nativity';
  } else if (month >= 2 && month <= 4) {
    return 'lent'; // Approximation
  } else if (month === 5 || (month === 6 && day <= 15)) {
    return 'pascha'; // Approximation
  } else if (month === 8 && day >= 1 && day <= 15) {
    return 'dormition';
  } else if (month === 6 && day > 15) {
    return 'pentecost';
  }
  return 'ordinary';
};

// Auto-suggest theme based on liturgical season
const getSeasonalTheme = (): ThemeName => {
  const season = getCurrentLiturgicalSeason();

  switch (season) {
    case 'lent': return 'lentSeason';
    case 'pascha': return 'paschaTheme';
    case 'nativity': return 'nativityFast';
    case 'dormition': return 'dormitionFast';
    case 'pentecost': return 'pentecostSeason';
    default: return 'orthodoxTraditional';
  }
};

// Apply theme to document
const applyThemeToDocument = (themeConfig: ThemeConfig) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // Remove existing theme classes
  Object.values(THEME_CONFIGS).forEach(config => {
    body.classList.remove(config.cssClass);
  });

  // Add current theme class
  body.classList.add(themeConfig.cssClass);

  // Apply CSS custom properties
  root.style.setProperty('--theme-primary', themeConfig.colors.primary);
  root.style.setProperty('--theme-secondary', themeConfig.colors.secondary);
  root.style.setProperty('--theme-background', themeConfig.colors.background);
  root.style.setProperty('--theme-surface', themeConfig.colors.surface);
  root.style.setProperty('--theme-text', themeConfig.colors.text);
  root.style.setProperty('--theme-text-secondary', themeConfig.colors.textSecondary);
  root.style.setProperty('--theme-accent', themeConfig.colors.accent);
  root.style.setProperty('--theme-warning', themeConfig.colors.warning);
  root.style.setProperty('--theme-error', themeConfig.colors.error);
  root.style.setProperty('--theme-success', themeConfig.colors.success);

  // Set meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeConfig.colors.primary);
  }
};

/**
 * Theme Provider Component
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'orthodoxTraditional'
}) => {
  const [isSystemDarkMode, setIsSystemDarkMode] = useState(getSystemDarkMode());
  const [autoThemeEnabled, setAutoThemeEnabled] = useState(false);

  // Initialize theme from localStorage or default
  const [currentTheme, setCurrentThemeState] = useState<ThemeName>(() => {
    const stored = getStoredTheme();
    if (stored && THEME_CONFIGS[stored]) {
      return stored;
    }
    return defaultTheme;
  });

  const themeConfig = THEME_CONFIGS[currentTheme];
  const availableThemes = Object.values(THEME_CONFIGS);

  // Set theme and persist to localStorage
  const setTheme = (theme: ThemeName) => {
    if (!THEME_CONFIGS[theme]) {
      console.warn(`Theme "${theme}" not found, falling back to orthodox traditional`);
      theme = 'orthodoxTraditional';
    }

    setCurrentThemeState(theme);
    localStorage.setItem('orthodmetrics-theme', theme);
    localStorage.setItem('orthodmetrics-auto-theme', 'false');
    setAutoThemeEnabled(false);
  };

  // Toggle auto theme based on liturgical season
  const setAutoThemeEnabledHandler = (enabled: boolean) => {
    setAutoThemeEnabled(enabled);
    localStorage.setItem('orthodoxmetrics-auto-theme', enabled.toString());

    if (enabled) {
      const seasonalTheme = getSeasonalTheme();
      setCurrentThemeState(seasonalTheme);
      localStorage.setItem('orthodoxmetrics-theme', seasonalTheme);
    }
  };

  // Listen for system dark mode changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load auto-theme preference from localStorage
  useEffect(() => {
    const autoEnabled = localStorage.getItem('orthodoxmetrics-auto-theme') === 'false';
    setAutoThemeEnabled(autoEnabled);

    if (autoEnabled) {
      const seasonalTheme = getSeasonalTheme();
      setCurrentThemeState(seasonalTheme);
    }
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    applyThemeToDocument(themeConfig);
  }, [themeConfig]);

  const contextValue: ThemeContextType = {
    currentTheme,
    themeConfig,
    setTheme,
    availableThemes,
    isSystemDarkMode,
    autoThemeEnabled,
    setAutoThemeEnabled: setAutoThemeEnabledHandler,
    getCurrentLiturgicalSeason,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme context
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
