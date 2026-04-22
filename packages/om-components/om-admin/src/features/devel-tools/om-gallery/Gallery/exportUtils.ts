/**
 * exportUtils.ts — Export functions for Gallery.
 */

import { apiClient } from '@/api/utils/axiosInstance';
import type { GalleryImage } from './types';

export function exportCSV(images: GalleryImage[]): void {
  if (images.length === 0) {
    alert('No images to export');
    return;
  }

  const headers = ['Name', 'Path', 'Created', 'Type', 'Size'];
  const rows = images.map(img => [
    img.name,
    img.path,
    img.created || 'Unknown',
    img.type || 'Unknown',
    img.size ? `${(img.size / 1024).toFixed(2)} KB` : 'Unknown'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `gallery-images-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportUsedImages(
  setExportingUsedImages: (v: boolean) => void,
  setUploadError: ((v: string | null) => void) | null,
): Promise<void> {
  try {
    setExportingUsedImages(true);
    if (setUploadError) setUploadError(null);

    let allUsedImages: any[] = [];
    let offset = 0;
    const limit = 200;
    let hasMore = true;
    let totalImages = 0;
    let checkedImages = 0;
    let limited = false;

    while (hasMore) {
      const data = await apiClient.get<any>(`/gallery/used-images?format=json&offset=${offset}&limit=${limit}`);

      if (data.success && data.used) {
        allUsedImages = [...allUsedImages, ...data.used];
        totalImages = data.total_images || totalImages;
        checkedImages = data.checked_images || checkedImages;
        limited = data.limited || limited;

        if (data.used.length < limit || offset + limit >= checkedImages) {
          hasMore = false;
        } else {
          offset += limit;
        }
      } else {
        hasMore = false;
      }
    }

    let output = `# Images Actively Used in Production\n\n`;
    output += `Generated: ${new Date().toISOString()}\n`;
    output += `Total Images: ${totalImages}\n`;
    output += `Checked Images: ${checkedImages}\n`;
    output += `Used Images: ${allUsedImages.length}\n`;
    if (limited) {
      output += `Note: Scanning was limited due to performance constraints\n`;
    }
    output += `\n## Used Images (${allUsedImages.length})\n\n`;

    allUsedImages.forEach((img, index) => {
      output += `${index + 1}. **${img.name}**\n`;
      output += `   - Path: ${img.path}\n`;
      output += `   - Size: ${img.size ? (img.size / 1024).toFixed(2) + ' KB' : 'Unknown'}\n`;
      output += `   - Type: ${img.type ? img.type.toUpperCase() : 'Unknown'}\n`;
      output += `   - Modified: ${img.modified ? new Date(img.modified).toLocaleString() : 'Unknown'}\n`;
      if (img.referencedIn && img.referencedIn.length > 0) {
        output += `   - Referenced in:\n`;
        img.referencedIn.forEach((ref: string) => {
          output += `     - ${ref}\n`;
        });
      }
      output += `\n`;
    });

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `used-images-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert(`Used images list exported successfully!\nTotal: ${totalImages}, Checked: ${checkedImages}, Used: ${allUsedImages.length}${limited ? ' (limited)' : ''}`);
  } catch (error: any) {
    console.error('Error exporting used images:', error);
    const errorMsg = error.message || 'Failed to export used images list. Please check the browser console for details.';
    alert(`Error: ${errorMsg}`);
    if (setUploadError) setUploadError(errorMsg);
  } finally {
    setExportingUsedImages(false);
  }
}
