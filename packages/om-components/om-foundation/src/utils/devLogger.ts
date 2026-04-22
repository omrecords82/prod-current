/**
 * Development-focused debugging utilities
 * Provides data shape validation and logging for development mode only
 */

const isDevelopment = process.env.NODE_ENV === 'development';

interface DataValidationOptions {
  expectedType?: 'array' | 'object' | 'string' | 'number' | 'boolean';
  componentName?: string;
  operation?: string;
  required?: boolean;
}

/**
 * Validates and logs data shape in development mode
 * @param data - The data to validate
 * @param label - Label for the log entry
 * @param options - Validation options
 * @returns The original data (for chaining)
 */
export const devLogDataShape = function<T>(
  data: T,
  label: string,
  options: DataValidationOptions = {}
): T {
  if (!isDevelopment) {
    return data;
  }

  const {
    expectedType,
    componentName = 'Unknown',
    operation = 'data processing',
    required = true
  } = options;

  console.group(`🔍 [${componentName}] Data Shape Validation - ${label}`);
  
  // Log basic data information
  console.log('typeof data:', typeof data);
  console.log('Array.isArray(data):', Array.isArray(data));
  console.log('data === null:', data === null);
  console.log('data === undefined:', data === undefined);
  console.log('data length (if applicable):', Array.isArray(data) ? data.length : 'N/A');
  
  // Log the actual data (truncated if large)
  if (Array.isArray(data) && data.length > 5) {
    console.log('data (first 5 items):', data.slice(0, 5));
    console.log(`... and ${data.length - 5} more items`);
  } else {
    console.log('data:', data);
  }

  // Validation warnings
  const actualType = Array.isArray(data) ? 'array' : typeof data;
  
  if (data === null || data === undefined) {
    if (required) {
      console.warn(`⚠️ WARNING: ${label} is ${data === null ? 'null' : 'undefined'} but required for ${operation}`);
    } else {
      console.info(`ℹ️ INFO: ${label} is ${data === null ? 'null' : 'undefined'} (optional)`);
    }
  }

  if (expectedType && actualType !== expectedType) {
    console.warn(`⚠️ WARNING: Expected ${expectedType} but got ${actualType} for ${label}`);
    console.warn(`This may cause issues in ${operation}`);
  }

  // Array-specific validations
  if (expectedType === 'array' && !Array.isArray(data)) {
    console.error(`❌ ERROR: Expected array but got ${actualType}. This will likely break .map(), .filter(), etc.`);
  }

  // Object-specific validations
  if (expectedType === 'object' && (typeof data !== 'object' || Array.isArray(data) || data === null)) {
    console.error(`❌ ERROR: Expected object but got ${actualType}. This may break property access.`);
  }

  console.groupEnd();
  
  return data;
};

/**
 * Logs API response shape in development mode
 * @param response - API response data
 * @param endpoint - API endpoint name
 * @param expectedShape - Description of expected response shape
 */
export const devLogApiResponse = function<T>(
  response: T,
  endpoint: string,
  expectedShape?: string
): T {
  if (!isDevelopment) {
    return response;
  }

  console.group(`🌐 [API] Response from ${endpoint}`);
  console.log('Response type:', typeof response);
  console.log('Is array:', Array.isArray(response));
  console.log('Response:', response);
  
  if (expectedShape) {
    console.log('Expected shape:', expectedShape);
  }

  // Check for common API response patterns
  if (typeof response === 'object' && response !== null) {
    const obj = response as any;
    if ('data' in obj) {
      console.log('Response has .data property:', typeof obj.data);
    }
    if ('error' in obj) {
      console.log('Response has .error property:', obj.error);
    }
    if ('success' in obj) {
      console.log('Response has .success property:', obj.success);
    }
  }
  
  console.groupEnd();
  
  return response;
};

/**
 * Logs component state changes in development mode
 * @param stateName - Name of the state variable
 * @param oldValue - Previous value
 * @param newValue - New value
 * @param componentName - Component name
 */
export const devLogStateChange = function<T>(
  stateName: string,
  oldValue: T,
  newValue: T,
  componentName: string
): void {
  if (!isDevelopment) {
    return;
  }

  console.group(`📊 [${componentName}] State Change: ${stateName}`);
  console.log('Old value:', oldValue);
  console.log('New value:', newValue);
  console.log('Type changed:', typeof oldValue !== typeof newValue);
  console.groupEnd();
};

/**
 * Logs menu filtering operations in development mode
 * @param menuItems - Menu items before filtering
 * @param filteredItems - Menu items after filtering
 * @param filterType - Type of filter applied
 */
export const devLogMenuFilter = (
  menuItems: any[],
  filteredItems: any[],
  filterType: string
): void => {
  if (!isDevelopment) {
    return;
  }

  console.group(`📋 [Menu] ${filterType} Filter Applied`);
  console.log('Original items count:', Array.isArray(menuItems) ? menuItems.length : 'Not an array');
  console.log('Filtered items count:', Array.isArray(filteredItems) ? filteredItems.length : 'Not an array');
  
  if (Array.isArray(menuItems) && Array.isArray(filteredItems)) {
    const removed = menuItems.length - filteredItems.length;
    console.log('Items removed:', removed);
    
    if (removed > 0) {
      const removedTitles = menuItems
        .filter(item => !filteredItems.find(filtered => filtered.id === item.id))
        .map(item => item.title || item.subheader || 'Unknown')
        .slice(0, 5);
      console.log('Removed items (first 5):', removedTitles);
    }
  }
  
  console.groupEnd();
};

export default {
  devLogDataShape,
  devLogApiResponse,
  devLogStateChange,
  devLogMenuFilter
};
