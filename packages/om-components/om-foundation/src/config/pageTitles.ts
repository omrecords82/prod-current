/**
 * Page Title Mapping Configuration
 * Maps routes to their corresponding page titles
 */

export const PAGE_TITLES: Record<string, string> = {
  // Auth
  '/login': 'Login',
  '/register': 'Register',
  '/forgot-password': 'Forgot Password',
  
  // Dashboard
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  
  // Church
  '/church/om-spec': 'OM-Library',
  '/church/records': 'Church Records',
  '/church/baptism': 'Baptism Records',
  '/church/marriage': 'Marriage Records',
  '/church/funeral': 'Funeral Records',
  
  // Developer Tools
  '/devel-tools': 'Developer Tools',
  // om-tasks, daily-tasks — retired, now on OMAI Operations Hub
  '/devel-tools/om-ocr': 'OCR Tools',
  '/devel-tools/omtrace': 'OM Trace',
  '/devel-tools/refactor-console': 'Refactor Console',
  
  // Admin
  '/admin': 'Admin Panel',
  '/admin/churches': 'Church Management',
  '/admin/users': 'User Management',
  '/admin/settings': 'Settings',
  
  // Profile
  '/profile': 'Profile',
  '/settings': 'Settings',
};

/**
 * Get page title for a given route
 * Supports dynamic routes by matching patterns
 */
export const getPageTitle = (pathname: string): string => {
  // Exact match
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  
  // Try to match dynamic routes
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(route)) {
      return title;
    }
  }
  
  // Default fallback
  return 'OrthodoxMetrics';
};
