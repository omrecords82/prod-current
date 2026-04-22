/**
 * Orthodox Metrics - Table Style Store
 * React hook-based store for managing table theme state with localStorage persistence
 */
import { useCallback, useEffect, useState } from 'react';

/**
 * Compute relative luminance of a hex colour and return
 * white or dark text for maximum contrast (WCAG 2.x).
 */
export function getContrastText(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const lum =
    0.2126 * (r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4) +
    0.7152 * (g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4) +
    0.0722 * (b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4);
  return lum > 0.35 ? '#222222' : '#ffffff';
}

export interface TableTheme {
  headerColor: string;
  headerTextColor: string;
  cellColor: string;
  cellTextColor: string;
  rowColor: string;
  rowAlternateColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  hoverColor: string;
  selectedColor: string;
  shadowStyle: string;
  fontFamily: string;
  fontSize: number;
}

export interface TableStyleState {
  tableTheme: TableTheme;
  savedThemes: Record<string, TableTheme>;
  currentTheme: string;
  isLiturgicalMode: boolean;
  setHeaderColor: (color: string) => void;
  setHeaderTextColor: (color: string) => void;
  setCellColor: (color: string) => void;
  setCellTextColor: (color: string) => void;
  setRowColor: (color: string) => void;
  setRowAlternateColor: (color: string) => void;
  setBorderStyle: (color: string, width: number, radius: number) => void;
  setHoverColor: (color: string) => void;
  setSelectedColor: (color: string) => void;
  setShadowStyle: (shadow: string) => void;
  setFontSettings: (family: string, size: number) => void;
  resetTheme: () => void;
  saveTheme: (name: string) => void;
  loadTheme: (name: string) => void;
  deleteTheme: (name: string) => void;
  exportTheme: () => TableTheme;
  importTheme: (theme: TableTheme) => void;
  applyThemeToElement: (element: string) => object;
  getTableHeaderStyle: () => object;
  getTableRowStyle: (type: 'even' | 'odd') => object;
  getTableCellStyle: (type: 'header' | 'body') => object;
}

const orthodoxTheme: TableTheme = {
  headerColor: '#bd56fa',
  headerTextColor: '#ffffff',
  cellColor: '#ffffff',
  cellTextColor: '#333333',
  rowColor: '#f9f9f9',
  rowAlternateColor: '#ffffff',
  borderColor: '#e0e0e0',
  borderWidth: 1,
  borderRadius: 4,
  hoverColor: '#f5f5f5',
  selectedColor: '#e3f2fd',
  shadowStyle: '0 2px 4px rgba(0,0,0,0.1)',
  fontFamily: 'Roboto, Arial, sans-serif',
  fontSize: 14,
};

/**
 * Dark mode counterpart of the default orthodox theme.
 * Used automatically when the MUI palette mode is 'dark' and no
 * user-customised theme has been persisted to localStorage.
 */
export const orthodoxThemeDark: TableTheme = {
  headerColor: '#7b1fa2',
  headerTextColor: '#ffffff',
  cellColor: '#1e1e2e',
  cellTextColor: '#e0e0e0',
  rowColor: '#252538',
  rowAlternateColor: '#1e1e2e',
  borderColor: '#424242',
  borderWidth: 1,
  borderRadius: 4,
  hoverColor: '#2a2a3d',
  selectedColor: '#1a3a5c',
  shadowStyle: '0 2px 4px rgba(0,0,0,0.3)',
  fontFamily: 'Roboto, Arial, sans-serif',
  fontSize: 14,
};

/**
 * Returns theme-aware table defaults. When dark mode is active AND the
 * user has never customised their table theme (no localStorage entry),
 * the dark defaults are used instead of the light ones.
 */
export function getThemeAwareDefaults(isDarkMode: boolean): TableTheme {
  return isDarkMode ? orthodoxThemeDark : orthodoxTheme;
}

/**
 * The 6 Orthodox liturgical colour presets.
 * `emphasized` marks Gold, White/Silver, and Light Blue for premium swatch treatment.
 */
export interface OrthodoxPreset {
  label: string;
  hex: string;
  emphasized: boolean;
}

export const ORTHODOX_PRESETS: OrthodoxPreset[] = [
  { label: 'Purple',  hex: '#bd56fa', emphasized: false },
  { label: 'White',   hex: '#E6E8EB', emphasized: true  },
  { label: 'Green',   hex: '#2E7D32', emphasized: false },
  { label: 'Red',     hex: '#C62828', emphasized: false },
  { label: 'Blue',    hex: '#6EC6FF', emphasized: true  },
  { label: 'Gold',    hex: '#E0B84A', emphasized: true  },
];

/**
 * Maps Customizer activeTheme strings (e.g. 'PURPLE_THEME') to their
 * accent hex colour.  Used to keep the records-page table header in
 * sync with the site-wide Settings → Theme Colors selection.
 */
export const THEME_TO_ACCENT_MAP: Record<string, string> = {
  PURPLE_THEME: '#bd56fa',
  AQUA_THEME:   '#E6E8EB',
  GREEN_THEME:  '#2E7D32',
  ORANGE_THEME: '#6E0E1A',
  BLUE_THEME:   '#6EC6FF',
  CYAN_THEME:   '#E0B84A',
};

/** Backward-compat export — maps preset labels to simple theme objects. */
export const liturgicalThemes: Record<string, { colors: string[]; description: string }> =
  Object.fromEntries(
    ORTHODOX_PRESETS.map(p => [
      p.label,
      { colors: [p.hex], description: `${p.label} Orthodox liturgical theme` },
    ])
  );

const STORAGE_KEY = 'om.tableTheme';
const SAVED_THEMES_KEY = 'om.tableTheme.saved';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export const useTableStyleStore = (): TableStyleState => {
  const [tableTheme, setTableTheme] = useState<TableTheme>(() => loadFromStorage(STORAGE_KEY, orthodoxTheme));
  const [savedThemes, setSavedThemes] = useState<Record<string, TableTheme>>(() => loadFromStorage(SAVED_THEMES_KEY, {}));
  const [currentTheme, setCurrentTheme] = useState('Orthodox Traditional');
  const [isLiturgicalMode, setIsLiturgicalMode] = useState(false);

  // Persist theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tableTheme));
  }, [tableTheme]);

  useEffect(() => {
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(savedThemes));
  }, [savedThemes]);

  // Individual property setters
  const setHeaderColor = useCallback((color: string) => {
    const headerTextColor = getContrastText(color);
    setTableTheme(prev => ({ ...prev, headerColor: color, headerTextColor }));
  }, []);

  const setHeaderTextColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, headerTextColor: color }));
  }, []);

  const setCellColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, cellColor: color }));
  }, []);

  const setCellTextColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, cellTextColor: color }));
  }, []);

  const setRowColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, rowColor: color }));
  }, []);

  const setRowAlternateColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, rowAlternateColor: color }));
  }, []);

  const setBorderStyle = useCallback((color: string, width: number, radius: number) => {
    setTableTheme(prev => ({ ...prev, borderColor: color, borderWidth: width, borderRadius: radius }));
  }, []);

  const setHoverColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, hoverColor: color }));
  }, []);

  const setSelectedColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, selectedColor: color }));
  }, []);

  const setShadowStyle = useCallback((shadow: string) => {
    setTableTheme(prev => ({ ...prev, shadowStyle: shadow }));
  }, []);

  const setFontSettings = useCallback((family: string, size: number) => {
    setTableTheme(prev => ({ ...prev, fontFamily: family, fontSize: size }));
  }, []);

  const resetTheme = useCallback(() => {
    setTableTheme(orthodoxTheme);
    setCurrentTheme('Orthodox Traditional');
  }, []);

  const saveTheme = useCallback((name: string) => {
    setSavedThemes(prev => ({ ...prev, [name]: { ...tableTheme } }));
  }, [tableTheme]);

  const loadTheme = useCallback((name: string) => {
    const theme = savedThemes[name];
    if (theme) {
      setTableTheme(theme);
      setCurrentTheme(name);
    }
  }, [savedThemes]);

  const deleteTheme = useCallback((name: string) => {
    setSavedThemes(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const exportTheme = useCallback(() => {
    return { ...tableTheme };
  }, [tableTheme]);

  const importTheme = useCallback((theme: TableTheme) => {
    setTableTheme(theme);
  }, []);

  const applyThemeToElement = useCallback((_element: string) => {
    return {};
  }, []);

  const getTableHeaderStyle = useCallback(() => ({
    backgroundColor: tableTheme.headerColor,
    color: tableTheme.headerTextColor,
    borderColor: tableTheme.borderColor,
    borderWidth: `${tableTheme.borderWidth}px`,
    borderRadius: `${tableTheme.borderRadius}px`,
    fontFamily: tableTheme.fontFamily,
    fontSize: `${tableTheme.fontSize}px`,
    boxShadow: tableTheme.shadowStyle,
    fontWeight: 'bold',
  }), [tableTheme]);

  const getTableRowStyle = useCallback((type: 'even' | 'odd') => ({
    backgroundColor: type === 'even' ? tableTheme.rowColor : tableTheme.rowAlternateColor,
    borderColor: tableTheme.borderColor,
    borderWidth: `${tableTheme.borderWidth}px`,
    '&:hover': {
      backgroundColor: tableTheme.hoverColor,
    },
  }), [tableTheme]);

  const getTableCellStyle = useCallback((type: 'header' | 'body') => {
    if (type === 'header') {
      return {
        backgroundColor: tableTheme.headerColor,
        color: tableTheme.headerTextColor,
        borderColor: tableTheme.borderColor,
        borderWidth: `${tableTheme.borderWidth}px`,
        fontFamily: tableTheme.fontFamily,
        fontSize: `${tableTheme.fontSize}px`,
        fontWeight: 'bold',
        padding: '16px',
      };
    }
    return {
      backgroundColor: tableTheme.cellColor,
      color: tableTheme.cellTextColor,
      borderColor: tableTheme.borderColor,
      borderWidth: `${tableTheme.borderWidth}px`,
      fontFamily: tableTheme.fontFamily,
      fontSize: `${tableTheme.fontSize}px`,
      padding: '16px',
    };
  }, [tableTheme]);

  return {
    tableTheme,
    savedThemes,
    currentTheme,
    isLiturgicalMode,
    setHeaderColor,
    setHeaderTextColor,
    setCellColor,
    setCellTextColor,
    setRowColor,
    setRowAlternateColor,
    setBorderStyle,
    setHoverColor,
    setSelectedColor,
    setShadowStyle,
    setFontSettings,
    resetTheme,
    saveTheme,
    loadTheme,
    deleteTheme,
    exportTheme,
    importTheme,
    applyThemeToElement,
    getTableHeaderStyle,
    getTableRowStyle,
    getTableCellStyle,
  };
};

/**
 * Reusable hook that wraps useTableStyleStore getters with dark-mode
 * awareness. When isDarkMode is true the returned style helpers overlay
 * the dark palette onto the base store theme so tables render correctly
 * in both light and dark modes.
 *
 * Usage:
 *   const { darkHeaderStyle, darkRowStyle, darkCellStyle } =
 *     useDarkAwareTableStyles(isDarkMode);
 */
export const useDarkAwareTableStyles = (isDarkMode: boolean) => {
  const { getTableHeaderStyle, getTableRowStyle, getTableCellStyle } = useTableStyleStore();
  const dk = isDarkMode ? orthodoxThemeDark : null;

  const darkHeaderStyle = useCallback(() => {
    const base = getTableHeaderStyle();
    if (!dk) return base;
    return { ...base, backgroundColor: dk.headerColor, color: dk.headerTextColor, borderColor: dk.borderColor };
  }, [getTableHeaderStyle, dk]);

  const darkRowStyle = useCallback((type: 'even' | 'odd') => {
    const base = getTableRowStyle(type);
    if (!dk) return base;
    return {
      ...base,
      backgroundColor: type === 'even' ? dk.rowColor : dk.rowAlternateColor,
      borderColor: dk.borderColor,
      '&:hover': { backgroundColor: dk.hoverColor },
    };
  }, [getTableRowStyle, dk]);

  const darkCellStyle = useCallback((type: 'header' | 'body') => {
    const base = getTableCellStyle(type);
    if (!dk) return base;
    if (type === 'header') {
      return { ...base, backgroundColor: dk.headerColor, color: dk.headerTextColor, borderColor: dk.borderColor };
    }
    return { ...base, backgroundColor: dk.cellColor, color: dk.cellTextColor, borderColor: dk.borderColor };
  }, [getTableCellStyle, dk]);

  return { darkHeaderStyle, darkRowStyle, darkCellStyle };
};
