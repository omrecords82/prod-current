/**
 * useImageUsage.ts — Image usage checking logic for Gallery.
 */

import { useRef, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import type { GalleryImage } from './types';
import { sortImages } from './galleryUtils';

interface UseImageUsageOptions {
  images: GalleryImage[];
  setImages: React.Dispatch<React.SetStateAction<GalleryImage[]>>;
  selectedDirectory: string;
  usageFilter: string;
}

export function useImageUsage({ images, setImages, selectedDirectory, usageFilter }: UseImageUsageOptions) {
  const checkingUsage = useRef(false);
  const hasAutoCheckedUsage = useRef(false);
  const lastCheckedDirectory = useRef<string>('');
  const lastImageCount = useRef<number>(0);
  const isChecking = useRef(false);

  const checkImageUsage = async (imagesToCheck: GalleryImage[], checkAll = false) => {
    if (!imagesToCheck || imagesToCheck.length === 0) return;

    isChecking.current = true;
    checkingUsage.current = true;

    try {
      const imagesToProcess = imagesToCheck.filter(img => img != null);
      const BATCH_SIZE = 500;
      const batches: GalleryImage[][] = [];
      for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
        batches.push(imagesToProcess.slice(i, i + BATCH_SIZE));
      }

      let allUsage: { [key: string]: boolean } = {};

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        try {
          const data = await apiClient.post<any>('/gallery/check-usage', {
            images: batch.map(img => ({ name: img.name || '', path: img.path || '' }))
          });
          if (data.success && data.usage) {
            allUsage = { ...allUsage, ...data.usage };
          }
        } catch (batchErr) {
          console.error(`Usage check failed for batch ${batchIndex + 1}/${batches.length}:`, batchErr);
        }
      }

      setImages(prevImages => {
        if (!prevImages || prevImages.length === 0) return prevImages;
        const updated = prevImages.map(img => {
          if (!img) return img;
          const usageValue = allUsage[img.name];
          return {
            ...img,
            isUsed: usageValue !== undefined ? usageValue : img.isUsed
          };
        });
        return sortImages(updated);
      });
    } catch (error: any) {
      console.error('Error checking image usage:', error);
    } finally {
      isChecking.current = false;
      checkingUsage.current = false;
    }
  };

  // Auto-check usage when filter changes for the first time
  useEffect(() => {
    if (
      !hasAutoCheckedUsage.current &&
      usageFilter !== 'all' &&
      images.length > 0 &&
      !isChecking.current
    ) {
      const hasUncheckedImages = images.some(img => img.isUsed === undefined);
      if (hasUncheckedImages) {
        hasAutoCheckedUsage.current = true;
        console.log(`🔄 Auto-checking usage due to filter change to: ${usageFilter}`);
        checkImageUsage(images, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageFilter]);

  // Reset auto-check flag when directory changes
  useEffect(() => {
    hasAutoCheckedUsage.current = false;
    lastCheckedDirectory.current = '';
    lastImageCount.current = 0;
  }, [selectedDirectory]);

  // Automatically check usage after images are loaded for a directory
  useEffect(() => {
    if (selectedDirectory === '') return;

    hasAutoCheckedUsage.current = false;
    lastImageCount.current = 0;

    const checkTimer = setTimeout(() => {
      const directoryNotChecked = selectedDirectory !== lastCheckedDirectory.current || lastCheckedDirectory.current === '';

      if (
        images.length > 0 &&
        selectedDirectory !== '' &&
        directoryNotChecked &&
        !isChecking.current &&
        !hasAutoCheckedUsage.current
      ) {
        lastCheckedDirectory.current = selectedDirectory;
        lastImageCount.current = images.length;
        hasAutoCheckedUsage.current = true;
        checkImageUsage(images, true);
      }
    }, 800);

    return () => clearTimeout(checkTimer);
  }, [selectedDirectory]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    checkingUsage: checkingUsage.current,
    checkImageUsage,
  };
}
