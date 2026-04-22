/**
 * Menu Template Transformer
 * 
 * Transforms static menu templates (MenuItems-*.ts) into normalized payloads
 * suitable for seeding into the database.
 * 
 * Key Features:
 * - Flattens nested tree structure into flat array
 * - Generates stable parent_key_name references
 * - Maps icon components to string names
 * - Skips section headers (navlabel items)
 * - Preserves sort order via order_index
 */

import { MenuTemplateItem } from '@/layouts/full/vertical/sidebar/MenuItems-default-superadmin';

/**
 * Normalized menu item for backend API
 */
export interface NormalizedMenuItem {
  key_name: string;
  label: string;
  path: string | null;
  icon: string | null;
  order_index: number;
  is_active: number;
  parent_key_name: string | null;
  meta: Record<string, any> | null;
}

/**
 * Icon component to string name mapping
 * Maps React icon components to their string names for database storage
 */
const getIconName = (iconComponent: any): string | null => {
  if (!iconComponent) return null;
  
  // Handle component function/object
  const iconString = iconComponent.toString?.() || String(iconComponent);
  
  // Extract icon name from various formats
  if (iconString.includes('IconShield')) return 'IconShield';
  if (iconString.includes('IconLayoutDashboard')) return 'IconLayoutDashboard';
  if (iconString.includes('IconSettings')) return 'IconSettings';
  if (iconString.includes('IconUsers')) return 'IconUsers';
  if (iconString.includes('IconLayout')) return 'IconLayout';
  if (iconString.includes('IconFileDescription')) return 'IconFileDescription';
  if (iconString.includes('IconWriting')) return 'IconWriting';
  if (iconString.includes('IconNotes')) return 'IconNotes';
  if (iconString.includes('IconMessage')) return 'IconMessage';
  if (iconString.includes('IconUserPlus')) return 'IconUserPlus';
  if (iconString.includes('IconBell')) return 'IconBell';
  if (iconString.includes('IconActivity')) return 'IconActivity';
  if (iconString.includes('IconPoint')) return 'IconPoint';
  if (iconString.includes('IconDatabase')) return 'IconDatabase';
  if (iconString.includes('IconRocket')) return 'IconRocket';
  if (iconString.includes('IconEdit')) return 'IconEdit';
  if (iconString.includes('IconPalette')) return 'IconPalette';
  if (iconString.includes('IconBug')) return 'IconBug';
  if (iconString.includes('IconTerminal')) return 'IconTerminal';
  if (iconString.includes('IconSitemap')) return 'IconSitemap';
  if (iconString.includes('IconTool')) return 'IconTool';
  if (iconString.includes('IconCheckbox')) return 'IconCheckbox';
  if (iconString.includes('IconBorderAll')) return 'IconBorderAll';
  if (iconString.includes('IconComponents')) return 'IconComponents';
  if (iconString.includes('IconGitBranch')) return 'IconGitBranch';
  if (iconString.includes('OrthodoxChurch')) return 'OrthodoxChurchIcon';
  
  // Default fallback
  return 'IconPoint';
};

/**
 * Transform menu template tree into normalized flat array
 * 
 * @param template - Menu template items (tree structure)
 * @param options - Transformation options
 * @returns Normalized flat array of menu items
 */
export function transformMenuTemplate(
  template: MenuTemplateItem[],
  options?: {
    skipValidation?: boolean;
  }
): NormalizedMenuItem[] {
  const normalized: NormalizedMenuItem[] = [];
  let orderIndex = 0;

  /**
   * Recursively process menu items
   * 
   * @param item - Current menu item
   * @param parentKeyName - Parent's key_name (null for top-level)
   */
  const processItem = (item: MenuTemplateItem, parentKeyName: string | null = null) => {
    // Skip section headers (navlabel items)
    if (item.navlabel || item.subheader) {
      return;
    }

    // Validate key_name
    if (!item.id) {
      console.warn(`⚠️ Menu item missing stable ID, skipping:`, item.title);
      return;
    }

    // Create normalized item
    const normalizedItem: NormalizedMenuItem = {
      key_name: item.id,
      label: item.title || 'Untitled',
      path: item.href === '#' ? '#' : (item.href || null),
      icon: getIconName(item.icon),
      order_index: orderIndex++,
      is_active: 1,
      parent_key_name: parentKeyName,
      meta: null,
    };

    // Add metadata if chip/chipColor present
    if (item.chip || item.chipColor) {
      normalizedItem.meta = {
        ...(item.chip && { chip: item.chip }),
        ...(item.chipColor && { chipColor: item.chipColor }),
      };
    }

    // Validate path
    if (!options?.skipValidation) {
      if (normalizedItem.path && normalizedItem.path !== '#') {
        const validPrefixes = [
          '/apps/',
          '/admin/',
          '/devel/',
          '/dashboards/',
          '/tools/',
          '/sandbox/',
          '/social/',
          '/church/',
          '/frontend-pages/',
          '/devel-tools/',
        ];
        
        const isValid = validPrefixes.some(prefix => normalizedItem.path!.startsWith(prefix));
        if (!isValid) {
          console.warn(`⚠️ Invalid path for item "${normalizedItem.label}": ${normalizedItem.path}`);
        }
      }
    }

    // Add to normalized array
    normalized.push(normalizedItem);

    // Process children recursively
    if (item.children && item.children.length > 0) {
      const currentKeyName = item.id;
      item.children.forEach(child => {
        processItem(child, currentKeyName);
      });
    }
  };

  // Process all top-level items
  template.forEach(item => processItem(item));

  return normalized;
}

/**
 * Validate normalized menu items
 * 
 * @param items - Normalized menu items
 * @returns Validation result with errors
 */
export function validateMenuItems(items: NormalizedMenuItem[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const keyNames = new Set<string>();

  items.forEach((item, index) => {
    // Check key_name uniqueness
    if (keyNames.has(item.key_name)) {
      errors.push(`Duplicate key_name at index ${index}: ${item.key_name}`);
    }
    keyNames.add(item.key_name);

    // Check key_name format
    if (!item.key_name || item.key_name.length > 255) {
      errors.push(`Invalid key_name at index ${index}: ${item.key_name}`);
    }

    // Check key_name pattern (namespace.slug)
    const pattern = /^[a-z0-9-]+\.[a-z0-9-]+$/;
    if (!pattern.test(item.key_name)) {
      warnings.push(`key_name doesn't follow namespace.slug pattern at index ${index}: ${item.key_name}`);
    }

    // Check label
    if (!item.label || item.label.trim() === '') {
      errors.push(`Empty label at index ${index} (key: ${item.key_name})`);
    }

    // Check path
    if (item.path && item.path !== '#') {
      const validPrefixes = [
        '/apps/',
        '/admin/',
        '/devel/',
        '/dashboards/',
        '/tools/',
        '/sandbox/',
        '/social/',
        '/church/',
        '/frontend-pages/',
        '/devel-tools/',
      ];
      
      const isValid = validPrefixes.some(prefix => item.path!.startsWith(prefix));
      if (!isValid) {
        warnings.push(`Unusual path at index ${index}: ${item.path} (key: ${item.key_name})`);
      }
    }

    // Check icon
    const allowedIcons = [
      'IconPoint', 'IconShield', 'IconUsers', 'IconLayoutDashboard',
      'IconSettings', 'IconLayout', 'IconSitemap', 'IconTerminal',
      'IconFileDescription', 'IconDatabase', 'IconEdit', 'IconBug',
      'IconRocket', 'IconActivity', 'IconBell', 'IconMessage',
      'IconUserPlus', 'IconComponents', 'IconPalette', 'IconTool',
      'IconCheckbox', 'IconBorderAll', 'IconGitBranch', 'IconNotes',
      'IconWriting', 'OrthodoxChurchIcon'
    ];
    
    if (item.icon && !allowedIcons.includes(item.icon)) {
      warnings.push(`Unknown icon at index ${index}: ${item.icon} (key: ${item.key_name})`);
    }

    // Check parent_key_name reference
    if (item.parent_key_name && !keyNames.has(item.parent_key_name)) {
      // Parent might not be processed yet, so this is just a warning
      warnings.push(`parent_key_name references unknown key at index ${index}: ${item.parent_key_name} (key: ${item.key_name})`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create template payload for backend API
 * 
 * @param templateId - Template identifier (e.g., "default-superadmins")
 * @param role - Target role (e.g., "super_admin")
 * @param items - Normalized menu items
 * @returns Complete payload for POST /api/admin/menus/seed
 */
export function createTemplatePayload(
  templateId: string,
  role: string,
  items: NormalizedMenuItem[]
) {
  return {
    templateId,
    role,
    items,
  };
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { SuperAdminMenuTemplate, SuperAdminMenuMetadata } from '@/layouts/full/vertical/sidebar/MenuItems-default-superadmin';
 * import { transformMenuTemplate, validateMenuItems, createTemplatePayload } from './transformMenuTemplate';
 * 
 * // Transform template
 * const normalized = transformMenuTemplate(SuperAdminMenuTemplate);
 * 
 * // Validate
 * const validation = validateMenuItems(normalized);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 *   return;
 * }
 * 
 * // Create payload
 * const payload = createTemplatePayload(
 *   SuperAdminMenuMetadata.id,
 *   SuperAdminMenuMetadata.role,
 *   normalized
 * );
 * 
 * // Send to backend
 * await fetch('/api/admin/menus/seed', {
 *   method: 'POST',
 *   credentials: 'include',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(payload),
 * });
 * ```
 */
