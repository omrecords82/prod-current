import { listAllMenus, addMenuItem, removeMenuItem } from '../core/menuManager.js';
import type { CLIOptions } from '../cli/types.js';

/**
 * Handle menu commands
 */
export async function handleMenuCommand(
  command: string,
  feRoot: string,
  options: CLIOptions
): Promise<void> {
  switch (command) {
    case 'list':
      listAllMenus(feRoot);
      break;

    case 'add':
      if (!options.menuLabel || !options.menuPath) {
        throw new Error('Menu add requires --menu-label and --menu-path');
      }

      const success = addMenuItem(feRoot, {
        label: options.menuLabel,
        path: options.menuPath,
        role: options.menuRole,
        section: options.menuSection || 'tools',
        hidden: options.menuHidden,
      });

      if (success) {
        console.log('✅ Menu item added successfully');
      } else {
        console.log('❌ Failed to add menu item');
      }
      break;

    case 'remove':
      if (!options.menuPath) {
        throw new Error('Menu remove requires --menu-path');
      }

      const removeSuccess = removeMenuItem(feRoot, {
        path: options.menuPath,
        preserve: !options.force,
        delete: options.force,
      });

      if (removeSuccess) {
        console.log('✅ Menu item removed successfully');
      } else {
        console.log('❌ Failed to remove menu item');
      }
      break;

    default:
      throw new Error(`Unknown menu command: ${command}`);
  }
}
