
import { createContext, useState, ReactNode, useEffect } from 'react';
import config from './config'
import React from "react";

// Define the shape of the context state
interface CustomizerContextState {
    activeDir: string;
    setActiveDir: (dir: string) => void;
    activeMode: string;
    setActiveMode: (mode: string) => void;
    activeTheme: string;
    setActiveTheme: (theme: string) => void;
    activeLayout: string;
    setActiveLayout: (layout: string) => void;
    isCardShadow: boolean;
    setIsCardShadow: (shadow: boolean) => void;
    isLayout: string;
    setIsLayout: (layout: string) => void;
    isBorderRadius: number;
    setIsBorderRadius: (radius: number) => void;
    isCollapse: string;
    setIsCollapse: (collapse: string) => void;
    isSidebarHover: boolean;
    setIsSidebarHover: (isHover: boolean) => void;
    isMobileSidebar: boolean;  // Add this
    setIsMobileSidebar: (isMobileSidebar: boolean) => void;
    headerBackground: number;
    setHeaderBackground: (bg: number) => void;
}

// Create the context with an initial value
export const CustomizerContext = createContext<CustomizerContextState | any>(undefined);

// Define the type for the children prop
interface CustomizerContextProps {
    children: ReactNode;
}

// Helper function to determine if it's between sunset and sunrise (dark mode time)
const isDarkModeTime = (): boolean => {
    if (typeof window === 'undefined') return true; // Default to dark mode on server
    
    const now = new Date();
    const hours = now.getHours();
    
    // Simple logic: dark mode from 6 PM (18:00) to 6 AM (06:00)
    // This can be enhanced with actual sunset/sunrise calculations based on location
    return hours >= 18 || hours < 6;
};

// Helper functions for localStorage
const getStoredValue = (key: string, defaultValue: any): any => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const stored = localStorage.getItem(`orthodoxmetrics-${key}`);
        return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.warn(`Failed to parse stored value for ${key}:`, error);
        return defaultValue;
    }
};

const setStoredValue = (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`orthodoxmetrics-${key}`, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to store value for ${key}:`, error);
    }
};

// Create the provider component
export const CustomizerContextProvider: React.FC<CustomizerContextProps> = ({ children }) => {

    // Initialize state with localStorage values or config defaults
    const [activeDir, setActiveDirState] = useState<string>(() => 
        getStoredValue('activeDir', config.activeDir)
    );
    
    // Initialize activeMode: check if user has manually set it, otherwise use time-based logic
    const [activeMode, setActiveModeState] = useState<string>(() => {
        const stored = getStoredValue('activeMode', null);
        // If user has manually set a preference, use it
        if (stored !== null) {
            return stored;
        }
        // Otherwise, default to dark mode and use time-based logic
        return isDarkModeTime() ? 'dark' : 'light';
    });
    // Theme is initialized from localStorage if available (set by liturgical auto-theme),
    // falling back to config.activeTheme for first-time visitors.
    // This prevents a flash of the wrong theme on page reload.
    const [activeTheme, setActiveThemeState] = useState<string>(() =>
        getStoredValue('activeTheme', config.activeTheme)
    );
    const [activeLayout, setActiveLayoutState] = useState<string>(() => 
        getStoredValue('activeLayout', config.activeLayout)
    );
    const [isCardShadow, setIsCardShadowState] = useState<boolean>(() => 
        getStoredValue('isCardShadow', config.isCardShadow)
    );
    const [isLayout, setIsLayoutState] = useState<string>(() => 
        getStoredValue('isLayout', config.isLayout)
    );
    const [isBorderRadius, setIsBorderRadiusState] = useState<number>(() => 
        getStoredValue('isBorderRadius', config.isBorderRadius)
    );
    const [isCollapse, setIsCollapseState] = useState<string>(() => 
        getStoredValue('isCollapse', config.isCollapse)
    );
    const [isLanguage, setIsLanguage] = useState<string>(config.isLanguage);
    const [isSidebarHover, setIsSidebarHover] = useState<boolean>(false);
    const [isMobileSidebar, setIsMobileSidebar] = useState<boolean>(false);
    const [headerBackground, setHeaderBackgroundState] = useState<number>(() => 
        getStoredValue('headerBackground', 1)
    );

    // Enhanced setter functions that also save to localStorage
    const setActiveDir = (dir: string) => {
        setActiveDirState(dir);
        setStoredValue('activeDir', dir);
    };

    const setActiveMode = (mode: string) => {
        setActiveModeState(mode);
        setStoredValue('activeMode', mode);
    };

    const setActiveTheme = (theme: string) => {
        setActiveThemeState(theme);
        setStoredValue('activeTheme', theme);
    };

    const setActiveLayout = (layout: string) => {
        setActiveLayoutState(layout);
        setStoredValue('activeLayout', layout);
    };

    const setIsCardShadow = (shadow: boolean) => {
        setIsCardShadowState(shadow);
        setStoredValue('isCardShadow', shadow);
    };

    const setIsLayout = (layout: string) => {
        setIsLayoutState(layout);
        setStoredValue('isLayout', layout);
    };

    const setIsBorderRadius = (radius: number) => {
        setIsBorderRadiusState(radius);
        setStoredValue('isBorderRadius', radius);
    };

    const setIsCollapse = (collapse: string) => {
        setIsCollapseState(collapse);
        setStoredValue('isCollapse', collapse);
    };

    const setHeaderBackground = (bg: number) => {
        setHeaderBackgroundState(bg);
        setStoredValue('headerBackground', bg);
    };

    // Set attributes immediately
    useEffect(() => {
        // For Tailwind dark mode: toggle 'dark' class on documentElement
        // This is required for Tailwind's dark: variants to work
        // Use classList.add/remove to preserve other classes
        if (activeMode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // Set data attributes for MUI theme compatibility
        // Note: We don't set the 'class' attribute here to avoid conflicts with Tailwind's dark class
        // The dark class is managed via classList.add/remove above
        document.documentElement.setAttribute("data-theme-mode", activeMode);
        document.documentElement.setAttribute("dir", activeDir);
        document.documentElement.setAttribute('data-color-theme', activeTheme);
        document.documentElement.setAttribute("data-layout", activeLayout);
        document.documentElement.setAttribute("data-boxed-layout", isLayout);
        document.documentElement.setAttribute("data-sidebar-type", isCollapse);

        // Debug: Log dark mode state in development
        if (import.meta.env.DEV) {
            console.log(`[Theme] Dark mode: ${activeMode}, Tailwind class applied: ${document.documentElement.classList.contains('dark')}, Source: ${getStoredValue('activeMode', null) !== null ? 'localStorage' : 'time-based'}`);
        }

    }, [activeMode, activeDir, activeTheme, activeLayout, isLayout, isCollapse]);

    // Auto-update mode based on time of day (sunset to sunrise)
    useEffect(() => {
        // Only auto-update if user hasn't manually set a preference
        const hasManualPreference = getStoredValue('activeMode', null) !== null;
        if (hasManualPreference) {
            return; // Don't auto-update if user has manually set preference
        }

        const updateModeBasedOnTime = () => {
            const shouldBeDark = isDarkModeTime();
            const currentMode = activeMode;
            
            if (shouldBeDark && currentMode !== 'dark') {
                setActiveModeState('dark');
            } else if (!shouldBeDark && currentMode !== 'light') {
                setActiveModeState('light');
            }
        };

        // Update immediately
        updateModeBasedOnTime();

        // Set up interval to check every minute
        const interval = setInterval(updateModeBasedOnTime, 60000);

        return () => clearInterval(interval);
    }, [activeMode]);

    return (
        <CustomizerContext.Provider
            value={{

                activeDir,
                setActiveDir,
                activeMode,
                setActiveMode,
                activeTheme,
                setActiveTheme,
                activeLayout,
                setActiveLayout,
                isCardShadow,
                setIsCardShadow,
                isLayout,
                setIsLayout,
                isBorderRadius,
                setIsBorderRadius,
                isCollapse,
                setIsCollapse,
                isLanguage,
                setIsLanguage,
                isSidebarHover,
                setIsSidebarHover,
                isMobileSidebar,
                setIsMobileSidebar,
                headerBackground,
                setHeaderBackground
            }}
        >
            {children}
        </CustomizerContext.Provider>
    );
};

