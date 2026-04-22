import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MenuVisibilityState {
    [key: string]: boolean;
}

interface MenuVisibilityContextType {
    visibleMenus: MenuVisibilityState;
    extrasEnabled: boolean;
    toggleMenuVisibility: (menuId: string) => void;
    toggleExtras: () => void;
    resetToDefaults: () => void;
    hideAll: () => void;
    showAll: () => void;
}

const MenuVisibilityContext = createContext<MenuVisibilityContextType | undefined>(undefined);

// Version for localStorage schema management
const MENU_VISIBILITY_VERSION = '1.0.0';

// Default menu visibility state - simplified for church management
const DEFAULT_MENU_VISIBILITY: MenuVisibilityState = {
    // Dashboards - Keep main dashboard only
    'dashboard-modern': true,
    'dashboard-ecommerce': false,
    'frontend-pages': false,

    // Apps - Only essential productivity apps
    'app-contacts': false,
    'app-blog': false,
    'app-ecommerce': false,
    'app-chats': false,
    'app-church-management': false, // Moved to Administration
    'app-client-management': false, // Moved to Administration
    'app-ocr-upload': true,
    'app-site-clone': false, // Moved to Administration
    'app-notes': true,
    'app-calendar': true,
    'app-email': false,
    'app-tickets': false,
    'app-kanban': true,
    'app-invoice': false,

    // Pages - Keep essential ones only
    'page-pricing': false,
    'page-account-setting': true,
    'page-faq': false,
    'page-landingpage': false,
    'page-widgets': false,

    // Forms - Hide complex forms, but keep rich text editor
    'form-elements': false,
    'form-layout': false,
    'form-horizontal': false,
    'form-vertical': false,
    'form-custom': false,
    'form-wizard': false,
    'form-validation': false,
    'form-tiptap-editor': true,

    // Tables - Hide all table examples
    'table-basic': false,
    'table-collapsible': false,
    'table-enhanced': false,
    'table-fixed-header': false,
    'table-pagination': false,
    'table-search': false,
    'table-react-table': false,

    // Charts - Hide all chart examples
    'chart-bar': false,
    'chart-line': false,
    'chart-pie': false,
    'chart-scatter': false,
    'chart-sparkline': false,
    'chart-gauge': false,

    // Tree View - Hide
    'tree-view-simple': false,

    // UI Components - Hide
    'ui-components': false,

    // Settings
    'settings-menu': true,
    'settings-pricing': true,
    'settings-account-setting': true,
    'settings-faq': true,
    'settings-landingpage': true,
    'settings-logs': true,

    // Admin - Keep essential admin functions
    'admin-users': true,
    'admin-roles': true,
    'admin-settings': true,
    'admin-logs': true,
    'admin-orthodox-metrics': true,
    'admin-ai': true,
    'admin-church-management': true, // Moved from Apps
    'admin-client-management': true, // Moved from Apps
    'admin-site-clone': true, // Moved from Apps

    // Content - Design tools
    'content-table-theme-editor': true,

    // Church Tools - Records Management
    'church-records-management': true,
    'church-baptism-records': true,
    'church-marriage-records': true,
    'church-funeral-records': true,

    // Header Apps
    'header-chat': true,
    'header-calendar': true,
    'header-email': true,

    // Apps Dropdown
    'dropdown-chat': true,
    'dropdown-ecommerce': true,
    'dropdown-notes': true,
    'dropdown-calendar': true,
    'dropdown-contacts': true,
    'dropdown-tickets': true,
    'dropdown-email': true,
    'dropdown-blog': true,
};

interface MenuVisibilityProviderProps {
    children: ReactNode;
}

export const MenuVisibilityProvider: React.FC<MenuVisibilityProviderProps> = ({ children }) => {
    const [visibleMenus, setVisibleMenus] = useState<MenuVisibilityState>(DEFAULT_MENU_VISIBILITY);
    const [extrasEnabled, setExtrasEnabled] = useState<boolean>(false); // Extras disabled by default
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage after component mounts
    useEffect(() => {
        const loadFromStorage = () => {
            try {
                // Check if localStorage is available
                if (typeof window === 'undefined' || !window.localStorage) {
                    setIsLoaded(true);
                    return;
                }

                const saved = localStorage.getItem('menuVisibility');
                if (saved) {
                    const parsedData = JSON.parse(saved);

                    // Handle both old format (direct state) and new format (versioned)
                    let parsedState;
                    let parsedExtras = false;
                    
                    if (parsedData.version && parsedData.data) {
                        // New versioned format
                        parsedState = parsedData.data;
                        parsedExtras = parsedData.extrasEnabled || false;
                    } else {
                        // Old format (direct state)
                        parsedState = parsedData;
                    }

                    // Merge with default state to ensure new menu items are included
                    const mergedState = {
                        ...DEFAULT_MENU_VISIBILITY,
                        ...parsedState
                    };

                    setVisibleMenus(mergedState);
                    setExtrasEnabled(parsedExtras);
                }
            } catch (error) {
                console.error('Error loading menu visibility from localStorage:', error);
                setVisibleMenus(DEFAULT_MENU_VISIBILITY);
            }
            setIsLoaded(true);
        };

        // Add a small delay to ensure localStorage is ready
        setTimeout(loadFromStorage, 0);
    }, []);

    // Save to localStorage whenever visibility changes (but only after initial load)
    useEffect(() => {
        if (isLoaded) {
            try {
                // Check if localStorage is available
                if (typeof window === 'undefined' || !window.localStorage) {
                    return;
                }

                const dataToSave = {
                    version: MENU_VISIBILITY_VERSION,
                    data: visibleMenus,
                    extrasEnabled: extrasEnabled
                };
                localStorage.setItem('menuVisibility', JSON.stringify(dataToSave));
            } catch (error) {
                console.error('Error saving menu visibility to localStorage:', error);
            }
        }
    }, [visibleMenus, extrasEnabled, isLoaded]);

    const toggleMenuVisibility = (menuId: string) => {
        setVisibleMenus(prev => {
            const newState = {
                ...prev,
                [menuId]: !prev[menuId]
            };
            return newState;
        });
    };

    const toggleExtras = () => {
        setExtrasEnabled(prev => !prev);
    };

    const resetToDefaults = () => {
        setVisibleMenus(DEFAULT_MENU_VISIBILITY);
        setExtrasEnabled(false);
    };

    const hideAll = () => {
        const hiddenState = Object.keys(visibleMenus).reduce((acc, key) => {
            acc[key] = false;
            return acc;
        }, {} as MenuVisibilityState);
        setVisibleMenus(hiddenState);
    };

    const showAll = () => {
        const visibleState = Object.keys(visibleMenus).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {} as MenuVisibilityState);
        setVisibleMenus(visibleState);
    };

    return (
        <MenuVisibilityContext.Provider value={{
            visibleMenus,
            extrasEnabled,
            toggleMenuVisibility,
            toggleExtras,
            resetToDefaults,
            hideAll,
            showAll
        }}>
            {children}
        </MenuVisibilityContext.Provider>
    );
};

export const useMenuVisibility = () => {
    const context = useContext(MenuVisibilityContext);
    if (context === undefined) {
        throw new Error('useMenuVisibility must be used within a MenuVisibilityProvider');
    }
    return context;
};