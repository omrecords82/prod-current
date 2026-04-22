/**
 * Safe Array Utilities for Orthodox Metrics
 * Prevents common runtime errors when working with arrays that might be undefined/null
 */

import React from 'react';

/**
 * Safely ensures a value is an array
 * @param value - The value that should be an array
 * @param fallback - Fallback array to use if value is not an array
 * @returns A guaranteed array
 */
export const ensureArray = <T = any>(value: any, fallback: T[] = []): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  
  console.warn('Expected array but received:', typeof value, value);
  return fallback;
};

/**
 * Safe filter operation that won't throw if data is not an array
 * @param data - Data to filter (might not be an array)
 * @param filterFn - Filter function
 * @param fallback - Fallback array if data is not filterable
 * @returns Filtered array or fallback
 */
export const safeFilter = <T = any>(
  data: any, 
  filterFn: (item: T) => boolean, 
  fallback: T[] = []
): T[] => {
  if (!Array.isArray(data)) {
    console.warn('safeFilter: Expected array but received:', typeof data, data);
    return fallback;
  }
  
  try {
    return data.filter(filterFn);
  } catch (error) {
    console.error('Error during filter operation:', error);
    return fallback;
  }
};

/**
 * Safe map operation that won't throw if data is not an array
 * @param data - Data to map (might not be an array)
 * @param mapFn - Map function
 * @param fallback - Fallback array if data is not mappable
 * @returns Mapped array or fallback
 */
export const safeMap = <T = any, U = any>(
  data: any, 
  mapFn: (item: T, index: number) => U, 
  fallback: U[] = []
): U[] => {
  if (!Array.isArray(data)) {
    console.warn('safeMap: Expected array but received:', typeof data, data);
    return fallback;
  }
  
  try {
    return data.map(mapFn);
  } catch (error) {
    console.error('Error during map operation:', error);
    return fallback;
  }
};

/**
 * Safe reduce operation that won't throw if data is not an array
 * @param data - Data to reduce (might not be an array)
 * @param reduceFn - Reduce function
 * @param initialValue - Initial value for reduce
 * @param fallback - Fallback value if data is not reducible
 * @returns Reduced value or fallback
 */
export const safeReduce = <T = any, U = any>(
  data: any,
  reduceFn: (acc: U, current: T, index: number) => U,
  initialValue: U,
  fallback?: U
): U => {
  if (!Array.isArray(data)) {
    console.warn('safeReduce: Expected array but received:', typeof data, data);
    return fallback !== undefined ? fallback : initialValue;
  }
  
  try {
    return data.reduce(reduceFn, initialValue);
  } catch (error) {
    console.error('Error during reduce operation:', error);
    return fallback !== undefined ? fallback : initialValue;
  }
};

/**
 * Higher-order component wrapper to ensure array props are always arrays
 * @param Component - React component to wrap
 * @param arrayPropNames - Names of props that should be arrays
 */
export const withSafeArrayProps = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  arrayPropNames: (keyof P)[]
) => {
  const WrappedComponent = (props: P) => {
    const safeProps = { ...props };
    
    arrayPropNames.forEach(propName => {
      safeProps[propName] = ensureArray(props[propName]) as P[keyof P];
    });
    
    return React.createElement(Component, safeProps);
  };
  
  WrappedComponent.displayName = `withSafeArrayProps(${Component.displayName || Component.name})`;
  return WrappedComponent;
}; 