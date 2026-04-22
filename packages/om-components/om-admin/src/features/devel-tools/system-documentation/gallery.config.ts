/**
 * Gallery Component Configuration
 * 
 * This file contains configuration for the Gallery component at /apps/gallery
 * 
 * Backend API Endpoints Required:
 * - GET /api/gallery/images - List all images
 * - POST /api/gallery/upload - Upload new image
 * - POST /api/gallery/delete - Delete image
 * 
 * File Storage:
 * - Production: /var/www/orthodoxmetrics/prod/front-end/public/images/
 * - Development: front-end/public/images/ (relative to project root)
 * 
 * Allowed File Types: .png, .jpg, .jpeg, .gif, .webp, .svg
 * Max File Size: 10MB
 */

/**
 * The six canonical image directories used by the Gallery feature.
 * These are the standard directories for organizing images across the application.
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for canonical directories.
 * All Gallery code should reference this constant, not define directories elsewhere.
 */
export const CANONICAL_IMAGE_DIRECTORIES = [
  'logos',
  'backgrounds',
  'icons',
  'ui',
  'records',
  'misc',
] as const;

export type CanonicalImageDirectory = typeof CANONICAL_IMAGE_DIRECTORIES[number];

/**
 * Base path for public images (served from front-end/public/images/)
 */
export const IMAGES_BASE_PATH = '/images';

/**
 * Helper function to check if a directory name is one of the canonical directories
 */
export function isCanonicalDirectory(dirName: string): boolean {
  return CANONICAL_IMAGE_DIRECTORIES.includes(dirName.toLowerCase() as CanonicalImageDirectory);
}

/**
 * Helper function to build an image URL from a directory and filename
 * @param directory - Directory name (e.g., 'logos', 'icons')
 * @param filename - Image filename (e.g., 'logo.png')
 * @returns Full URL path (e.g., '/images/logos/logo.png')
 */
export function buildImageUrl(directory: string, filename: string): string {
  // Normalize directory (remove leading/trailing slashes)
  const normalizedDir = directory.replace(/^\/+|\/+$/g, '');
  return `${IMAGES_BASE_PATH}/${normalizedDir}/${filename}`;
}

/**
 * Helper function to extract directory from an image path
 * @param imagePath - Full image path (e.g., '/images/logos/logo.png' or 'logos/logo.png')
 * @returns Directory name (e.g., 'logos') or null if path is invalid
 */
export function extractDirectoryFromPath(imagePath: string): string | null {
  // Remove leading /images/ if present
  const normalized = imagePath.replace(/^\/images\//, '').replace(/^\//, '');
  const parts = normalized.split('/');
  if (parts.length >= 2) {
    return parts[0];
  }
  return null;
}

export const galleryConfig = {
  api: {
    baseUrl: '/api/gallery',
    endpoints: {
      list: '/images',
      upload: '/upload',
      delete: '/delete',
    },
  },
  storage: {
    production: '/var/www/orthodoxmetrics/prod/front-end/public/images',
    development: 'front-end/public/images', // Relative to backend root
  },
  allowedTypes: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  publicPath: IMAGES_BASE_PATH, // Base URL path for accessing images
  canonicalDirectories: CANONICAL_IMAGE_DIRECTORIES,
  table: {
    // MUI DataGrid configuration
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    columns: {
      imageName: { flex: 1, minWidth: 200 },
      imageLocation: { flex: 2, minWidth: 250 },
      imageCreated: { flex: 1, minWidth: 180 },
      fileType: { width: 120 },
      fileSize: { width: 120 },
      actions: { width: 200 },
    },
  },
} as const;

export type GalleryConfig = typeof galleryConfig;

