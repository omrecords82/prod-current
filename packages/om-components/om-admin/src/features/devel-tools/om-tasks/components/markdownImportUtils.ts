/**
 * markdownImportUtils — Utility functions for parsing markdown files
 * during drag-and-drop import in the CreateTaskDialog.
 * Extracted from CreateTaskDialog.tsx
 */

import { normalizeTag } from './createTaskTypes';
import type { TaskFormData, TaskRevision } from './createTaskTypes';

/**
 * Read a File object as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
};

/**
 * Parse markdown file for revision markers (Title: lines with rev numbers)
 * Returns array of revision objects in file order
 */
export const parseRevisions = (content: string): TaskRevision[] => {
  const lines = content.split('\n');
  const revisions: TaskRevision[] = [];
  let currentSection: { title: string; content: string[]; rev_number: number | null } | null = null;
  let rev_index = 0;
  let foundFirstTitle = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match Title: lines (case-insensitive, allow leading whitespace)
    const titleMatch = line.match(/^\s*Title:\s*(.+)\s*$/i);
    
    if (titleMatch) {
      foundFirstTitle = true;
      
      // Save previous section if exists
      if (currentSection) {
        revisions.push({
          rev_index: rev_index++,
          rev_number: currentSection.rev_number,
          title: currentSection.title,
          markdown: currentSection.content.join('\n')
        });
      }

      // Extract title text
      const titleText = titleMatch[1].trim();
      
      // Try to extract rev number: rev1, rev 1, rev-1, – rev1, etc.
      const revMatch = titleText.match(/rev\s*[-(]?\s*(\d+)\s*[)]?/i);
      const rev_number = revMatch ? parseInt(revMatch[1], 10) : null;

      // Start new section
      currentSection = {
        title: titleText,
        content: [],
        rev_number
      };
    } else {
      // Add line to current section content
      if (currentSection) {
        currentSection.content.push(line);
      } else if (!foundFirstTitle) {
        // Content before first Title: line - create intro section
        if (!currentSection) {
          currentSection = {
            title: 'OM-tasks creation and revisions',
            content: [],
            rev_number: null
          };
        }
        currentSection.content.push(line);
      }
    }
  }

  // Save last section
  if (currentSection) {
    revisions.push({
      rev_index: rev_index++,
      rev_number: currentSection.rev_number,
      title: currentSection.title,
      markdown: currentSection.content.join('\n')
    });
  }

  return revisions;
};

/**
 * Get display label for a revision
 */
export const getRevisionLabel = (revision: TaskRevision): string => {
  if (revision.rev_number !== null) {
    return `rev${revision.rev_number}`;
  }
  return revision.title || 'intro';
};

/**
 * Parse first 13 lines of a markdown file for task metadata.
 * Returns partial TaskFormData with any fields found.
 */
export const parseMetadataFromFile = (content: string): Partial<TaskFormData> => {
  const allLines = content.split('\n');
  const parseMetadataLine = (line: string, prefix: string): string => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase() + ':')) {
      return trimmed.substring(prefix.length + 1).trim();
    }
    return '';
  };

  const metadata: Partial<TaskFormData> = {};

  // Line 1: Title
  if (allLines[0]) {
    const title = parseMetadataLine(allLines[0], 'Title');
    if (title) metadata.title = title;
  }

  // Line 2: Category
  if (allLines[1]) {
    const category = parseMetadataLine(allLines[1], 'Category');
    if (category) metadata.category = category;
  }

  // Line 3: Importance (default to "High" if not specified)
  if (allLines[2]) {
    const importance = parseMetadataLine(allLines[2], 'Importance');
    metadata.importance = importance || 'high';
  } else {
    metadata.importance = 'high';
  }

  // Line 4: Details (starts here, may continue)
  if (allLines[3]) {
    const detailsStart = parseMetadataLine(allLines[3], 'Details');
    let details = detailsStart;
    for (let i = 4; i < 13 && i < allLines.length; i++) {
      const line = allLines[i].trim();
      if (line.match(/^(Title|Category|Importance|Type|tags|Attachment|Status|Visibility|Date|Optional|Assigned):/i)) {
        break;
      }
      if (line) {
        details += (details ? '\n' : '') + line;
      }
    }
    if (details) metadata.details = details;
  }

  // Line 5: Type
  if (allLines[4]) {
    const type = parseMetadataLine(allLines[4], 'Type');
    if (type) {
      const normalizedType = type.toLowerCase();
      if (['documentation', 'configuration', 'reference', 'guide'].includes(normalizedType)) {
        metadata.type = normalizedType as any;
      }
    }
  }

  // Line 6: tags (lowercase)
  if (allLines[5]) {
    const tagsStr = parseMetadataLine(allLines[5], 'tags');
    if (tagsStr) {
      const tags = tagsStr.split(',').map(t => normalizeTag(t.trim())).filter(t => t);
      metadata.tags = tags;
    }
  }

  // Line 7: Attachment Link
  if (allLines[6]) {
    const attachment = parseMetadataLine(allLines[6], 'Attachment Link');
    if (attachment) {
      metadata.attachments = [attachment];
    }
  }

  // Line 8: Status (map "Assigned" to status 2)
  if (allLines[7]) {
    const statusStr = parseMetadataLine(allLines[7], 'Status');
    if (statusStr) {
      const statusMap: Record<string, number> = {
        'not started': 1,
        'assigned': 2,
        'in progress': 3,
        'in review': 4,
        'blocked': 5,
        'on hold': 6,
        'task completed': 7,
        'completed': 7
      };
      const normalizedStatus = statusStr.toLowerCase();
      if (statusMap[normalizedStatus] !== undefined) {
        metadata.status = statusMap[normalizedStatus];
      }
    }
  }

  // Line 9: Visibility
  if (allLines[8]) {
    const visibility = parseMetadataLine(allLines[8], 'Visibility');
    if (visibility) {
      const normalized = visibility.toLowerCase();
      if (normalized.includes('admin')) {
        metadata.visibility = 'admin';
      } else if (normalized.includes('public')) {
        metadata.visibility = 'public';
      }
    }
  }

  // Line 10: Date Created (skip, auto-filled)

  // Line 11: Assigned To (default "Nick Parsells")
  if (allLines[10]) {
    const assignedTo = parseMetadataLine(allLines[10], 'Optional Fields: Assigned To');
    metadata.assignedTo = assignedTo || 'Nick Parsells';
  } else {
    metadata.assignedTo = 'Nick Parsells';
  }

  // Line 12: Assigned By (default "system")
  if (allLines[11]) {
    const assignedBy = parseMetadataLine(allLines[11], 'Assigned by');
    metadata.assignedBy = assignedBy || 'system';
  } else {
    metadata.assignedBy = 'system';
  }

  // Line 13: Notes
  if (allLines[12]) {
    const notes = allLines[12].trim();
    if (notes && !notes.toLowerCase().startsWith('notes:')) {
      metadata.notes = notes;
    }
  }

  return metadata;
};
