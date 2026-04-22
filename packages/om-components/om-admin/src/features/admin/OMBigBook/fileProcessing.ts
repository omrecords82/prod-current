/**
 * fileProcessing.ts — Unified file processing logic for OMBigBook.
 * Handles parish map zips, tsx components, centralized ingestion, and encrypted storage fallback.
 */

import { apiClient } from '@/api/utils/axiosInstance';

import type { FileUpload, ConsoleOutput } from './types';
import { getFileTypeFromExtension } from './fileUtils';

interface FileProcessingCallbacks {
  addConsoleMessage: (type: ConsoleOutput['type'], message: string, details?: string) => void;
  setUploadedFiles: React.Dispatch<React.SetStateAction<FileUpload[]>>;
  setTsxFile: (file: File | null) => void;
  setTsxWizardOpen: (open: boolean) => void;
}

/**
 * Process a single file — handles parish map zips, tsx components,
 * centralized ingestion for supported types, and encrypted storage fallback.
 */
async function processSingleFile(file: File, cb: FileProcessingCallbacks): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // --- Parish Map zip files ---
  if (extension === 'zip' && (
    file.name.toLowerCase().includes('parish-map') ||
    file.name.toLowerCase().includes('parishmap') ||
    file.name.toLowerCase() === '_workspace_dist_parish-map.zip'
  )) {
    cb.addConsoleMessage('info', `🗺️ Parish Map zip detected: ${file.name}. Starting auto-installation...`);

    try {
      const formData = new FormData();
      formData.append('parishMapZip', file);

      cb.addConsoleMessage('info', `🔄 Sending request to /api/bigbook/upload-parish-map...`);

      const result = await apiClient.post<any>('/bigbook/upload-parish-map', formData);

      cb.addConsoleMessage('info', `📡 Response received`);

      if (result.success) {
        cb.addConsoleMessage('success', `🎉 Parish Map installed successfully!`);
        cb.addConsoleMessage('info', `📍 Component: ${result.addon.displayName}`);
        cb.addConsoleMessage('info', `🔗 Available at: orthodoxmetrics.com${result.addon.route}`);
        cb.addConsoleMessage('info', `📝 Updated Big Book Components Index`);
        cb.addConsoleMessage('success', `🧩 Added to sidebar navigation under "Components" section`);
        cb.addConsoleMessage('info', `🔄 Refresh the page to see the new menu item in the sidebar`);
        setTimeout(() => {
          cb.addConsoleMessage('info', `Click here to visit: ${window.location.origin}${result.addon.route}`);
        }, 1000);
      } else {
        cb.addConsoleMessage('error', `❌ Parish Map installation failed: ${result.error}`);
        if (result.debug) {
          cb.addConsoleMessage('info', `🔍 Debug info: ${JSON.stringify(result.debug)}`);
        }
      }
    } catch (error) {
      cb.addConsoleMessage('error', `❌ Parish Map installation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return;
  }

  // --- TSX component files ---
  if (extension === 'tsx') {
    cb.addConsoleMessage('info', `🧩 TSX Component detected: ${file.name}. Opening installation wizard...`);
    cb.setTsxFile(file);
    cb.setTsxWizardOpen(true);
    return;
  }

  // --- Unsupported types → encrypted storage fallback ---
  const supportedTypes = ['.zip', '.js', '.json', '.md', '.sh'];
  if (!supportedTypes.includes(`.${extension}`)) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const fileType = getFileTypeFromExtension(extension);

      const tempFile: FileUpload = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: fileType,
        content,
        size: file.size,
        uploaded: new Date(),
        processed: false,
        status: 'pending',
      };

      cb.setUploadedFiles(prev => [...prev, tempFile]);
      cb.addConsoleMessage('info', `Uploading to encrypted storage: ${file.name} (${fileType})`);

      try {
        const result = await apiClient.post<any>('/bigbook/upload', { fileName: file.name, content, fileType });

        if (result.success) {
          cb.setUploadedFiles(prev => prev.map(f =>
            f.id === tempFile.id
              ? { ...f, status: 'completed', result: { success: true, output: 'File uploaded successfully' } }
              : f
          ));
          const fileTypeMessage = result.isQuestionnaire
            ? `questionnaire (${result.questionnaireMetadata?.title || 'Unknown'})`
            : 'file';
          cb.addConsoleMessage('success', `${fileTypeMessage} uploaded to encrypted storage: ${file.name}`);
          if (result.isQuestionnaire) {
            cb.addConsoleMessage('info', `Questionnaire detected: ${result.questionnaireMetadata?.ageGroup || 'Unknown age group'} - ${result.questionnaireMetadata?.estimatedDuration || 0} minutes`);
          }
        } else {
          cb.setUploadedFiles(prev => prev.map(f =>
            f.id === tempFile.id ? { ...f, status: 'error', result: { success: false, error: result.error } } : f
          ));
          cb.addConsoleMessage('error', `Upload failed: ${file.name} - ${result.error}`);
        }
      } catch (error) {
        cb.setUploadedFiles(prev => prev.map(f =>
          f.id === tempFile.id ? { ...f, status: 'error', result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } } : f
        ));
        cb.addConsoleMessage('error', `Upload error: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    return;
  }

  // --- Centralized ingestion for supported types ---
  const fileTypeIcons: Record<string, string> = {
    zip: '📦', js: '⚡', json: '⚙️', md: '📝', sh: '🔧',
  };
  const fileIcon = fileTypeIcons[extension] || '📄';
  cb.addConsoleMessage('info', `${fileIcon} Processing ${extension.toUpperCase()} file: ${file.name}`);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const notifyOMAI = extension === 'md' || extension === 'js';
    if (notifyOMAI) {
      formData.append('notifyOMAI', 'true');
    }

    cb.addConsoleMessage('info', `🔄 Sending to centralized ingestion system...`);

    const result = await apiClient.post<any>('/bigbook/ingest-file', formData);

    cb.addConsoleMessage('info', `📡 Response received`);

    if (result.success) {
      const { result: ingestionResult } = result;
      cb.addConsoleMessage('success', `✅ ${ingestionResult.message}`);
      cb.addConsoleMessage('info', `📂 Type: ${ingestionResult.type}/${ingestionResult.category}`);

      switch (ingestionResult.type) {
        case 'addon':
          cb.addConsoleMessage('info', `🧩 Component available at: ${ingestionResult.item?.route || 'N/A'}`);
          if (ingestionResult.item?.enabled) {
            cb.addConsoleMessage('success', `✅ Component enabled and ready to use`);
          } else {
            cb.addConsoleMessage('warning', `⚠️ Component requires manual enable in registry`);
          }
          break;
        case 'doc':
          cb.addConsoleMessage('info', `📖 Document: ${ingestionResult.item?.title || ingestionResult.item?.name}`);
          if (ingestionResult.item?.webPath) {
            cb.addConsoleMessage('info', `🔗 Web path: ${ingestionResult.item.webPath}`);
          }
          break;
        case 'script':
          cb.addConsoleMessage('info', `🔧 Script stored and made executable`);
          cb.addConsoleMessage('warning', `⚠️ Script requires manual enable for security`);
          break;
        case 'config':
          cb.addConsoleMessage('info', `⚙️ Configuration active and available`);
          break;
        case 'data':
          cb.addConsoleMessage('info', `💾 Data archived for manual processing`);
          break;
      }

      if (result.registries) {
        const registryNames = Object.keys(result.registries);
        cb.addConsoleMessage('info', `📊 Updated registries: ${registryNames.join(', ')}`);
      }

      if (notifyOMAI) {
        cb.addConsoleMessage('info', `🧠 OMAI notified for learning`);
      }
    } else {
      cb.addConsoleMessage('error', `❌ Ingestion failed: ${result.error}`);
      if (result.debug) {
        cb.addConsoleMessage('info', `🔍 Debug info: ${JSON.stringify(result.debug)}`);
      }
    }
  } catch (error) {
    cb.addConsoleMessage('error', `❌ Ingestion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process an array of files (from drop or file input).
 */
export async function processFiles(files: File[], cb: FileProcessingCallbacks): Promise<void> {
  for (const file of files) {
    try {
      await processSingleFile(file, cb);
    } catch (error) {
      cb.addConsoleMessage('error', `File processing error: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
