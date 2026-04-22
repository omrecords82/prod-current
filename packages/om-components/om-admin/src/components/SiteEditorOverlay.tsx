import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Fab, Tooltip, IconButton, Chip } from '@mui/material';
import {
  Edit as EditIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  BugReport as BugIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext.tsx';
import { useComponentRegistry, ComponentInfo, generateComponentId, extractComponentInfo } from '../hooks/useComponentRegistry.ts';
import { useInspectorState } from '../hooks/useInspectorState.ts';
import { editorBridge } from '../services/om-ai/editorBridge.ts';
import ComponentInspector from './ComponentInspector.tsx';
import '../styles/inspector.css';
import VRTSettingsPanel from './VRTSettingsPanel.tsx';

interface SiteEditorOverlayProps {
  children?: React.ReactNode;
}

const SiteEditorOverlay: React.FC<SiteEditorOverlayProps> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<ComponentInfo | null>(null);
  const [omaiStatus, setOmaiStatus] = useState({ isAvailable: false });
  const [vrtSettingsOpen, setVrtSettingsOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const componentRegistry = useComponentRegistry();
  const inspectorState = useInspectorState();

  // Check if user has permission to use site editor
  const canUseSiteEditor = isSuperAdmin;

  // Check OMAI status on mount
  useEffect(() => {
    const checkOmaiStatus = async () => {
      const status = await editorBridge.checkStatus();
      setOmaiStatus(status);
    };
    
    checkOmaiStatus();
  }, []);

  // Handle mouse movement to detect components
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isEditMode || !overlayRef.current) return;

    const target = event.target as HTMLElement;
    if (!target || target === overlayRef.current) {
      setHoveredComponent(null);
      return;
    }

    // Find the closest React component
    const reactComponent = findReactComponent(target);
    if (reactComponent) {
      const componentInfo = createComponentInfo(reactComponent, target);
      setHoveredComponent(componentInfo);
    } else {
      setHoveredComponent(null);
    }
  }, [isEditMode]);

  // Handle component click
  const handleComponentClick = useCallback((event: MouseEvent) => {
    if (!isEditMode || !hoveredComponent) return;

    event.preventDefault();
    event.stopPropagation();
    
    inspectorState.openInspector(hoveredComponent);
  }, [isEditMode, hoveredComponent, inspectorState]);

  // Find React component from DOM element
  const findReactComponent = (element: HTMLElement): HTMLElement | null => {
    let current = element;
    
    // Look for React component markers (data attributes, specific classes, etc.)
    while (current && current !== document.body) {
      if (
        current.getAttribute('data-react-component') ||
        current.getAttribute('data-testid') ||
        current.className.includes('Mui') ||
        current.tagName === 'BUTTON' ||
        current.tagName === 'INPUT' ||
        current.tagName === 'SELECT' ||
        current.tagName === 'TEXTAREA' ||
        current.role === 'button' ||
        current.role === 'link' ||
        current.role === 'tab' ||
        current.onclick ||
        current.getAttribute('onclick')
      ) {
        return current;
      }
      current = current.parentElement as HTMLElement;
    }
    
    return null;
  };

  // Create component info from DOM element
  const createComponentInfo = (reactComponent: HTMLElement, target: HTMLElement): ComponentInfo => {
    const componentName = getComponentName(reactComponent);
    const props = extractPropsFromElement(reactComponent);
    
    const componentInfo: ComponentInfo = {
      id: generateComponentId(componentName, props),
      name: componentName,
      type: reactComponent.tagName.toLowerCase(),
      props,
      element: reactComponent,
      position: {
        x: reactComponent.getBoundingClientRect().left + window.scrollX,
        y: reactComponent.getBoundingClientRect().top + window.scrollY,
        width: reactComponent.getBoundingClientRect().width,
        height: reactComponent.getBoundingClientRect().height
      },
      ...extractComponentInfo(reactComponent, componentName, props)
    };

    // Register component in registry
    componentRegistry.registerComponent(componentInfo);
    
    return componentInfo;
  };

  // Extract component name
  const getComponentName = (element: HTMLElement): string => {
    // Try to get component name from various sources
    const testId = element.getAttribute('data-testid');
    if (testId) return testId;

    const reactComponent = element.getAttribute('data-react-component');
    if (reactComponent) return reactComponent;

    // Extract from class names
    const className = element.className;
    if (className.includes('Mui')) {
      const muiMatch = className.match(/Mui([A-Z][a-zA-Z]+)/);
      if (muiMatch) return muiMatch[1];
    }

    // Extract from role
    const role = element.getAttribute('role');
    if (role) return role.charAt(0).toUpperCase() + role.slice(1);

    // Use tag name as fallback
    return element.tagName.charAt(0).toUpperCase() + element.tagName.slice(1).toLowerCase();
  };

  // Extract props from DOM element
  const extractPropsFromElement = (element: HTMLElement): Record<string, any> => {
    const props: Record<string, any> = {};

    // Extract common attributes
    const attributes = ['value', 'placeholder', 'title', 'alt', 'href', 'src', 'type', 'role'];
    attributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) props[attr] = value;
    });

    // Extract data attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.replace('data-', '');
        props[key] = attr.value;
      }
    });

    // Extract style properties
    const computedStyle = window.getComputedStyle(element);
    const styleProps = ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'padding', 'margin'];
    styleProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'normal' && value !== '0px') {
        props[`style_${prop}`] = value;
      }
    });

    // Extract class-based props
    const className = element.className;
    if (className.includes('Mui-disabled')) props.disabled = true;
    if (className.includes('Mui-focused')) props.focused = true;
    if (className.includes('Mui-selected')) props.selected = true;
    if (className.includes('Mui-error')) props.error = true;
    if (className.includes('Mui-loading')) props.loading = true;

    return props;
  };

  // Set up event listeners when edit mode is enabled
  useEffect(() => {
    if (!isEditMode) {
      setHoveredComponent(null);
      return;
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleComponentClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleComponentClick);
    };
  }, [isEditMode, handleMouseMove, handleComponentClick]);

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      inspectorState.closeInspector();
    }
  };

  // Log component data to console
  const logComponentData = () => {
    if (hoveredComponent) {
      console.group('🔍 Site Editor - Component Data');
      console.log('Component:', hoveredComponent);
      console.log('Props:', hoveredComponent.props);
      console.log('Position:', hoveredComponent.position);
      console.log('API Routes:', hoveredComponent.apiRoutes);
      console.log('DB Tables:', hoveredComponent.dbTables);
      console.log('CSS Classes:', hoveredComponent.cssClasses);
      console.log('Tailwind Classes:', hoveredComponent.tailwindClasses);
      console.groupEnd();
    }
  };

  if (!canUseSiteEditor) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Site Editor Overlay */}
      <div
        ref={overlayRef}
        className={`site-editor-overlay ${isEditMode ? 'active' : ''}`}
        style={{ pointerEvents: isEditMode ? 'auto' : 'none' }}
      >
        {/* Hovered Component Indicator */}
        {isEditMode && hoveredComponent && (
          <div
            className="component-hover-indicator clickable"
            style={{
              left: hoveredComponent.position.x,
              top: hoveredComponent.position.y,
              width: hoveredComponent.position.width,
              height: hoveredComponent.position.height
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inspectorState.openInspector(hoveredComponent);
            }}
          >
            <div className="component-label">
              {hoveredComponent.name}
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          {/* OMAI Status Indicator */}
          {isEditMode && (
            <Chip
              icon={omaiStatus.isAvailable ? <BugIcon /> : <SettingsIcon />}
              label={omaiStatus.isAvailable ? 'OMAI Online' : 'OMAI Offline'}
              color={omaiStatus.isAvailable ? 'success' : 'error'}
              size="small"
              sx={{ alignSelf: 'flex-end' }}
            />
          )}

          {/* VRT Settings Button */}
          {isEditMode && (
            <Tooltip title="VRT Settings">
              <Fab
                size="small"
                color="info"
                onClick={() => setVrtSettingsOpen(true)}
                sx={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <SettingsIcon />
              </Fab>
            </Tooltip>
          )}

          {/* Edit Mode Toggle */}
          <Tooltip title={isEditMode ? 'Exit Site Edit Mode' : 'Enter Site Edit Mode'}>
            <Fab
              color={isEditMode ? 'error' : 'primary'}
              onClick={toggleEditMode}
              sx={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
                }
              }}
            >
              {isEditMode ? <CloseIcon /> : <EditIcon />}
            </Fab>
          </Tooltip>

          {/* Debug Button */}
          {isEditMode && hoveredComponent && (
            <Tooltip title="Log Component Data to Console">
              <Fab
                size="small"
                color="secondary"
                onClick={logComponentData}
                sx={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <BugIcon />
              </Fab>
            </Tooltip>
          )}
        </Box>
      </div>

      {/* Component Inspector */}
      <ComponentInspector
        isOpen={inspectorState.isOpen}
        component={inspectorState.selectedComponent}
        onClose={inspectorState.closeInspector}
        onApplyChanges={inspectorState.applyChanges}
        onDiscardChanges={inspectorState.discardChanges}
        onToggleEditMode={inspectorState.toggleEditMode}
        onUpdateChanges={inspectorState.updatePendingChanges}
        isEditMode={inspectorState.isEditMode}
        pendingChanges={inspectorState.pendingChanges}
        omaiStatus={omaiStatus}
      />

      {/* VRT Settings Panel */}
      <VRTSettingsPanel isOpen={vrtSettingsOpen} onClose={() => setVrtSettingsOpen(false)} />
    </>
  );
};

export default SiteEditorOverlay; 