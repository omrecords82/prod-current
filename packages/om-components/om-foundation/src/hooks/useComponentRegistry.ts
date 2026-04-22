import { useState, useEffect, useCallback, useRef } from 'react';

export interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  props: Record<string, any>;
  element: HTMLElement;
  position: { x: number; y: number; width: number; height: number };
  apiRoutes?: string[];
  dbTables?: string[];
  cssClasses?: string[];
  tailwindClasses?: string[];
  parentComponent?: string;
  children?: string[];
}

export interface ComponentRegistry {
  components: Map<string, ComponentInfo>;
  registerComponent: (info: ComponentInfo) => void;
  unregisterComponent: (id: string) => void;
  getComponentById: (id: string) => ComponentInfo | undefined;
  getComponentsInArea: (x: number, y: number, radius?: number) => ComponentInfo[];
  getAllComponents: () => ComponentInfo[];
  clearRegistry: () => void;
}

export const useComponentRegistry = (): ComponentRegistry => {
  const [components] = useState(() => new Map<string, ComponentInfo>());
  const registryRef = useRef<ComponentRegistry>();

  const registerComponent = useCallback((info: ComponentInfo) => {
    components.set(info.id, info);
  }, [components]);

  const unregisterComponent = useCallback((id: string) => {
    components.delete(id);
  }, [components]);

  const getComponentById = useCallback((id: string) => {
    return components.get(id);
  }, [components]);

  const getComponentsInArea = useCallback((x: number, y: number, radius: number = 50) => {
    const nearbyComponents: ComponentInfo[] = [];
    
    components.forEach((component) => {
      const centerX = component.position.x + component.position.width / 2;
      const centerY = component.position.y + component.position.height / 2;
      const distance = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));
      
      if (distance <= radius) {
        nearbyComponents.push(component);
      }
    });
    
    return nearbyComponents.sort((a, b) => {
      const centerAX = a.position.x + a.position.width / 2;
      const centerAY = a.position.y + a.position.height / 2;
      const centerBX = b.position.x + b.position.width / 2;
      const centerBY = b.position.y + b.position.height / 2;
      
      const distanceA = Math.sqrt(Math.pow(centerAX - x, 2) + Math.pow(centerAY - y, 2));
      const distanceB = Math.sqrt(Math.pow(centerBX - x, 2) + Math.pow(centerBY - y, 2));
      
      return distanceA - distanceB;
    });
  }, [components]);

  const getAllComponents = useCallback(() => {
    return Array.from(components.values());
  }, [components]);

  const clearRegistry = useCallback(() => {
    components.clear();
  }, [components]);

  // Update component positions on scroll/resize
  useEffect(() => {
    const updatePositions = () => {
      components.forEach((component) => {
        if (component.element && component.element.getBoundingClientRect) {
          const rect = component.element.getBoundingClientRect();
          component.position = {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
          };
        }
      });
    };

    window.addEventListener('scroll', updatePositions);
    window.addEventListener('resize', updatePositions);

    return () => {
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('resize', updatePositions);
    };
  }, [components]);

  if (!registryRef.current) {
    registryRef.current = {
      components,
      registerComponent,
      unregisterComponent,
      getComponentById,
      getComponentsInArea,
      getAllComponents,
      clearRegistry
    };
  }

  return registryRef.current;
};

// Utility function to generate component ID
export const generateComponentId = (componentName: string, props?: Record<string, any>): string => {
  const timestamp = Date.now();
  const propsHash = props ? JSON.stringify(props).slice(0, 20) : '';
  return `${componentName}_${timestamp}_${propsHash}`.replace(/[^a-zA-Z0-9_-]/g, '_');
};

// Utility function to extract component info from React element
export const extractComponentInfo = (
  element: HTMLElement,
  componentName: string,
  props: Record<string, any> = {}
): Partial<ComponentInfo> => {
  const rect = element.getBoundingClientRect();
  
  // Extract CSS classes
  const cssClasses = Array.from(element.classList);
  const tailwindClasses = cssClasses.filter(cls => 
    cls.includes('bg-') || cls.includes('text-') || cls.includes('p-') || 
    cls.includes('m-') || cls.includes('border-') || cls.includes('rounded-')
  );

  // Try to extract API routes from data attributes or props
  const apiRoutes: string[] = [];
  if (props.apiEndpoint) apiRoutes.push(props.apiEndpoint);
  if (props.route) apiRoutes.push(props.route);
  
  // Try to extract DB tables from data attributes or props
  const dbTables: string[] = [];
  if (props.tableName) dbTables.push(props.tableName);
  if (props.databaseTable) dbTables.push(props.databaseTable);

  return {
    name: componentName,
    type: element.tagName.toLowerCase(),
    props,
    position: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    },
    apiRoutes,
    dbTables,
    cssClasses,
    tailwindClasses
  };
}; 