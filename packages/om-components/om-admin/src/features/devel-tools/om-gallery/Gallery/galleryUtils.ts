/**
 * galleryUtils — Shared utility functions for the Gallery component.
 * Extracted from Gallery.tsx
 */
import type { GalleryImage } from './types';
import { isCanonicalDirectory } from '../../system-documentation/gallery.config';

export type SortBy = 'date' | 'name' | 'size' | 'type' | 'location';
export type SortOrder = 'asc' | 'desc';
export type UsageFilter = 'all' | 'used' | 'unused' | 'not_checked';

// Sort images function
export const sortImages = (
  imagesToSort: GalleryImage[],
  sortBy: SortBy,
  sortOrder: SortOrder
): GalleryImage[] => {
  const sorted = [...imagesToSort].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        // Use modified date (or created if modified not available)
        const dateA = new Date(a.modified || a.created || 0).getTime();
        const dateB = new Date(b.modified || b.created || 0).getTime();
        comparison = dateA - dateB;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = (a.size || 0) - (b.size || 0);
        break;
      case 'type':
        comparison = (a.type || '').localeCompare(b.type || '');
        break;
      case 'location':
        comparison = (a.path || '').localeCompare(b.path || '');
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};

// Normalize path by removing /images/ prefix
export const normalizePath = (pathStr: string): string => {
  return pathStr.replace(/^\/images\//, '').replace(/^\/+/, '');
};

// Filter images based on usage filter (tri-state: used, not_used, not_checked)
export const getFilteredImages = (images: GalleryImage[], usageFilter: UsageFilter): GalleryImage[] => {
  if (!images || images.length === 0) return [];
  if (usageFilter === 'all') return images;
  if (usageFilter === 'used') {
    // Only show images that are explicitly marked as used (true)
    return images.filter(img => img && img.isUsed === true);
  }
  if (usageFilter === 'unused') {
    // Only show images that are explicitly marked as not used (false)
    return images.filter(img => img && img.isUsed === false);
  }
  if (usageFilter === 'not_checked') {
    // Only show images that haven't been checked yet (undefined)
    return images.filter(img => img && img.isUsed === undefined);
  }
  return images;
};

// Check if directory is a canonical directory
export const isDefaultDirectory = (dirName: string): boolean => {
  return isCanonicalDirectory(dirName);
};
