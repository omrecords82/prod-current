/**
 * useTemplateManager — Custom hook for DB-backed template CRUD operations.
 * Manages all template state, loading, saving, overwriting, deleting,
 * importing, exporting, and standard template creation.
 * Extracted from LiveTableBuilderPage.tsx
 */
import { useState, useCallback } from 'react';
import type { TableData } from './types';
import { normalizeTableData } from './utils/normalize';
import { adminAPI } from '../../../api/admin.api';

const DEFAULT_ROWS = 10;

export interface TemplateEntry {
  slug: string;
  name: string;
  record_type: string;
  is_global?: boolean;
}

export interface TemplateManagerState {
  templateName: string;
  selectedTemplate: string;
  templates: TemplateEntry[];
  saveTemplateDialogOpen: boolean;
  overwriteTemplateDialogOpen: boolean;
  deleteTemplateDialogOpen: boolean;
  templateToDelete: string;
  loadTemplateDialogOpen: boolean;
  templateToLoad: string;
  importTemplatesDialogOpen: boolean;
  importTemplatesJson: string;
  templateRecordType: 'baptism' | 'marriage' | 'funeral' | 'custom';
  templateDescription: string;
  templateIsGlobal: boolean;
  loadingTemplates: boolean;
}

export interface UseTemplateManagerReturn extends TemplateManagerState {
  setTemplateName: (v: string) => void;
  setSelectedTemplate: (v: string) => void;
  setSaveTemplateDialogOpen: (v: boolean) => void;
  setOverwriteTemplateDialogOpen: (v: boolean) => void;
  setDeleteTemplateDialogOpen: (v: boolean) => void;
  setLoadTemplateDialogOpen: (v: boolean) => void;
  setImportTemplatesDialogOpen: (v: boolean) => void;
  setImportTemplatesJson: (v: string) => void;
  setTemplateRecordType: (v: 'baptism' | 'marriage' | 'funeral' | 'custom') => void;
  setTemplateDescription: (v: string) => void;
  setTemplateIsGlobal: (v: boolean) => void;
  setTemplateToDelete: (v: string) => void;
  setTemplateToLoad: (v: string) => void;
  loadTemplatesFromDb: () => Promise<void>;
  handleSaveTemplate: () => Promise<void>;
  handleOverwriteTemplate: () => Promise<void>;
  handleLoadTemplate: (slug: string) => Promise<void>;
  handleConfirmLoadTemplate: () => Promise<void>;
  handleDeleteTemplate: (slug: string) => void;
  handleConfirmDeleteTemplate: () => Promise<void>;
  handleExportTemplates: () => Promise<void>;
  handleImportTemplates: () => void;
  handleImportTemplatesFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportTemplatesConfirm: () => Promise<void>;
  handleCreateStandardTemplates: () => Promise<void>;
}

interface UseTemplateManagerOptions {
  tableData: TableData;
  showToast: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
  setTableData: (data: TableData) => void;
  historyManagerRef: React.RefObject<any>;
  setCanUndo: (v: boolean) => void;
  setCanRedo: (v: boolean) => void;
  lastSavedState: string;
  setLastSavedState: (v: string) => void;
}

export function useTemplateManager({
  tableData,
  showToast,
  setTableData,
  historyManagerRef,
  setCanUndo,
  setCanRedo,
  lastSavedState,
  setLastSavedState,
}: UseTemplateManagerOptions): UseTemplateManagerReturn {
  // Template management state (DB-backed)
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [overwriteTemplateDialogOpen, setOverwriteTemplateDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState('');
  const [loadTemplateDialogOpen, setLoadTemplateDialogOpen] = useState(false);
  const [templateToLoad, setTemplateToLoad] = useState('');
  const [importTemplatesDialogOpen, setImportTemplatesDialogOpen] = useState(false);
  const [importTemplatesJson, setImportTemplatesJson] = useState('');
  const [templateRecordType, setTemplateRecordType] = useState<'baptism' | 'marriage' | 'funeral' | 'custom'>('custom');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIsGlobal, setTemplateIsGlobal] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Check if current table is dirty (different from last saved state)
  const isDirty = useCallback((): boolean => {
    if (!tableData) return false;
    const normalized = normalizeTableData(
      tableData,
      tableData.rows.length,
      tableData.columns.length
    );
    const currentState = JSON.stringify(normalized);
    return currentState !== lastSavedState;
  }, [tableData, lastSavedState]);

  // Convert table state to database template format
  const convertTableToDbTemplate = useCallback((data: TableData) => {
    const fields = data.columns.map((col, colIdx) => {
      // Try to infer type from column name or default to string
      let type = 'string';
      const colName = col.label.toLowerCase();
      if (colName.includes('date') || colName.includes('time')) {
        type = 'date';
      } else if (colName.includes('id') || colName.includes('number') || colName.includes('count')) {
        type = 'number';
      } else if (colName.includes('email')) {
        type = 'email';
      } else if (colName.includes('phone')) {
        type = 'tel';
      }

      return {
        column: col.id, // Use stable column ID
        label: col.label || `Column ${colIdx + 1}`,
        type: type,
        required: false, // Default to optional
      };
    });

    return fields;
  }, []);

  // Load templates from database
  const loadTemplatesFromDb = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await adminAPI.templates.getAll();
      if (response.success) {
        setTemplates(response.templates.map((t: any) => ({
          slug: t.slug,
          name: t.name,
          record_type: t.record_type,
          is_global: t.is_global,
        })));
      }
    } catch (error) {
      console.error('Failed to load templates from database:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setLoadingTemplates(false);
    }
  }, [showToast]);

  // Helper to parse template fields from DB format
  const parseTemplateFields = (template: any): any[] => {
    let fieldsArray: any[] = [];
    
    if (Array.isArray(template.fields)) {
      // Format 1: Already an array
      fieldsArray = template.fields;
    } else if (template.fields && typeof template.fields === 'object') {
      // Format 2: Versioned structure - extract columns array
      if (template.fields.columns && Array.isArray(template.fields.columns)) {
        fieldsArray = template.fields.columns.map((col: any) => ({
          column: col.name || col.column || `col_${fieldsArray.length}`,
          label: col.label || col.name || col.column,
          type: col.type || 'string',
          required: col.required || false
        }));
      } else {
        throw new Error('Template fields format not recognized');
      }
    } else {
      throw new Error('Template fields is missing or invalid');
    }

    return fieldsArray;
  };

  // Helper to build TableData from template fields
  const buildTableFromFields = (fieldsArray: any[]): TableData => {
    const columns = fieldsArray.map((field: any, index: number) => ({
      id: field.column || `col_${index}`,
      label: field.label || field.column || `Column ${index + 1}`,
    }));

    const rows = Array.from({ length: DEFAULT_ROWS }, (_, rowIdx) => ({
      id: `row_${rowIdx}`,
      cells: columns.reduce((acc: Record<string, string>, col: any) => {
        acc[col.id] = '';
        return acc;
      }, {}),
    }));

    return { columns, rows };
  };

  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      showToast('Template name is required', 'warning');
      return;
    }
    
    // Check if template exists in DB
    const existing = templates.find(t => t.name === templateName.trim() || t.slug === templateName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'));
    if (existing) {
      setOverwriteTemplateDialogOpen(true);
      return;
    }
    
    try {
      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const fields = convertTableToDbTemplate(normalized);
      const slug = templateName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

      const templateData = {
        name: templateName.trim(),
        slug: slug,
        record_type: templateRecordType,
        description: templateDescription.trim() || null,
        fields: fields,
        grid_type: 'aggrid',
        theme: 'liturgicalBlueGold',
        layout_type: 'table',
        is_editable: true,
        church_id: null,
        is_global: templateIsGlobal,
      };

      const response = await adminAPI.templates.create(templateData);
      
      if (response.success) {
        const savedTemplateName = templateName.trim();
        await loadTemplatesFromDb();
        setTemplateName('');
        setTemplateDescription('');
        setTemplateRecordType('custom');
        setTemplateIsGlobal(false);
        setSaveTemplateDialogOpen(false);
        showToast(`Saved template: ${savedTemplateName}`, 'success');
      } else {
        showToast('Failed to save template', 'error');
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
      showToast(`Failed to save template: ${errorMessage}`, 'error');
    }
  }, [templateName, templateRecordType, templateDescription, templateIsGlobal, tableData, templates, convertTableToDbTemplate, loadTemplatesFromDb, showToast]);
  
  const handleOverwriteTemplate = useCallback(async () => {
    try {
      const existing = templates.find(t => t.name === templateName.trim() || t.slug === templateName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'));
      if (!existing) {
        showToast('Template not found', 'error');
        return;
      }

      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const fields = convertTableToDbTemplate(normalized);

      const templateData = {
        record_type: templateRecordType,
        description: templateDescription.trim() || null,
        fields: fields,
        is_global: templateIsGlobal,
      };

      const response = await adminAPI.templates.update(existing.slug, templateData);
      
      if (response.success) {
        const updatedTemplateName = templateName.trim();
        await loadTemplatesFromDb();
        setTemplateName('');
        setTemplateDescription('');
        setTemplateRecordType('custom');
        setTemplateIsGlobal(false);
        setSaveTemplateDialogOpen(false);
        setOverwriteTemplateDialogOpen(false);
        showToast(`Updated template: ${updatedTemplateName}`, 'success');
      } else {
        showToast('Failed to update template', 'error');
      }
    } catch (error: any) {
      console.error('Error updating template:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
      showToast(`Failed to update template: ${errorMessage}`, 'error');
    }
  }, [templateName, templateRecordType, templateDescription, templateIsGlobal, tableData, templates, convertTableToDbTemplate, loadTemplatesFromDb, showToast]);
  
  const handleLoadTemplate = useCallback(async (slug: string) => {
    if (isDirty()) {
      setTemplateToLoad(slug);
      setLoadTemplateDialogOpen(true);
      return;
    }
    
    try {
      const response = await adminAPI.templates.getBySlug(slug);
      if (!response.success || !response.template) {
        showToast(`Template not found`, 'error');
        return;
      }

      const template = response.template;
      const fieldsArray = parseTemplateFields(template);
      const newTableData = buildTableFromFields(fieldsArray);
      const normalized = normalizeTableData(newTableData, newTableData.rows.length, newTableData.columns.length);
      
      setTableData(normalized);
      historyManagerRef.current.clear();
      historyManagerRef.current.initialize(normalized);
      setCanUndo(false);
      setCanRedo(false);
      setLastSavedState(JSON.stringify(normalized));
      setSelectedTemplate(slug);
      showToast(`Loaded template: ${template.name}`, 'success');
    } catch (error: any) {
      console.error('Error loading template:', error);
      showToast(`Failed to load template: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [isDirty, showToast, setTableData, historyManagerRef, setCanUndo, setCanRedo, setLastSavedState]);
  
  const handleConfirmLoadTemplate = useCallback(async () => {
    const slug = templateToLoad;
    try {
      const response = await adminAPI.templates.getBySlug(slug);
      if (!response.success || !response.template) {
        showToast(`Template not found`, 'error');
        setLoadTemplateDialogOpen(false);
        return;
      }

      const template = response.template;
      const fieldsArray = parseTemplateFields(template);
      const newTableData = buildTableFromFields(fieldsArray);
      const normalized = normalizeTableData(newTableData, newTableData.rows.length, newTableData.columns.length);
      
      setTableData(normalized);
      historyManagerRef.current.clear();
      historyManagerRef.current.initialize(normalized);
      setCanUndo(false);
      setCanRedo(false);
      setLastSavedState(JSON.stringify(normalized));
      setSelectedTemplate(slug);
      setLoadTemplateDialogOpen(false);
      setTemplateToLoad('');
      showToast(`Loaded template: ${template.name}`, 'success');
    } catch (error: any) {
      console.error('Error loading template:', error);
      showToast(`Failed to load template: ${error?.message || 'Unknown error'}`, 'error');
      setLoadTemplateDialogOpen(false);
    }
  }, [templateToLoad, showToast, setTableData, historyManagerRef, setCanUndo, setCanRedo, setLastSavedState]);
  
  const handleDeleteTemplate = useCallback((slug: string) => {
    setTemplateToDelete(slug);
    setDeleteTemplateDialogOpen(true);
  }, []);
  
  const handleConfirmDeleteTemplate = useCallback(async () => {
    const slug = templateToDelete;
    try {
      const response = await adminAPI.templates.delete(slug);
      if (response.success) {
        await loadTemplatesFromDb();
        setDeleteTemplateDialogOpen(false);
        setTemplateToDelete('');
        if (selectedTemplate === slug) {
          setSelectedTemplate('');
        }
        showToast('Template deleted successfully', 'success');
      } else {
        showToast('Failed to delete template', 'error');
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      showToast(`Failed to delete template: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [templateToDelete, selectedTemplate, loadTemplatesFromDb, showToast]);
  
  const handleExportTemplates = useCallback(async () => {
    try {
      const response = await adminAPI.templates.getAll();
      if (response.success) {
        const json = JSON.stringify(response.templates, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
        a.download = `live-table-templates_${dateStr}_${timeStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Templates exported successfully', 'success');
      } else {
        showToast('Failed to export templates', 'error');
      }
    } catch (e) {
      showToast('Failed to export templates', 'error');
      console.error(e);
    }
  }, [showToast]);
  
  const handleImportTemplates = useCallback(() => {
    setImportTemplatesDialogOpen(true);
    setImportTemplatesJson('');
  }, []);
  
  const handleImportTemplatesFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          showToast('Failed to read file', 'error');
          return;
        }
        
        // Validate it's JSON
        JSON.parse(text);
        setImportTemplatesJson(text);
        setImportTemplatesDialogOpen(true);
      } catch (err) {
        showToast('Invalid JSON file', 'error');
        console.error(err);
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file', 'error');
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  }, [showToast]);
  
  const handleImportTemplatesConfirm = useCallback(async () => {
    try {
      if (!importTemplatesJson.trim()) {
        showToast('Please paste template JSON data', 'warning');
        return;
      }
      
      const imported = JSON.parse(importTemplatesJson);
      if (!Array.isArray(imported)) {
        showToast('Invalid template format: expected array', 'error');
        return;
      }

      let importedCount = 0;
      let errorCount = 0;

      for (const template of imported) {
        try {
          await adminAPI.templates.create({
            name: template.name,
            slug: template.slug,
            record_type: template.record_type || 'custom',
            description: template.description || null,
            fields: template.fields || [],
            grid_type: template.grid_type || 'aggrid',
            theme: template.theme || 'liturgicalBlueGold',
            layout_type: template.layout_type || 'table',
            is_editable: template.is_editable !== false,
            church_id: template.church_id || null,
            is_global: template.is_global || false,
          });
          importedCount++;
        } catch (error) {
          console.error('Failed to import template:', template.name, error);
          errorCount++;
        }
      }

      await loadTemplatesFromDb();
      setImportTemplatesDialogOpen(false);
      setImportTemplatesJson('');
      
      if (errorCount > 0) {
        showToast(`Imported ${importedCount} templates. ${errorCount} failed.`, 'warning');
      } else {
        showToast(`Imported ${importedCount} templates successfully`, 'success');
      }
    } catch (e) {
      showToast('Failed to import templates', 'error');
      console.error(e);
    }
  }, [importTemplatesJson, loadTemplatesFromDb, showToast]);
  
  const handleCreateStandardTemplates = useCallback(async () => {
    try {
      const standardHeaders = ['id', 'church_id', 'entry_no', 'date', 'first_name', 'last_name', 'father_name', 'mother_name', 'godfather_name', 'godmother_name', 'notes'];
      const recordTypes: Array<'baptism' | 'marriage' | 'funeral'> = ['baptism', 'marriage', 'funeral'];
      const locales = ['en', 'gr'];

      let created = 0;
      for (const locale of locales) {
        for (const recordType of recordTypes) {
          const name = `${locale}_${recordType}_records`;
          const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
          
          const fields = standardHeaders.map((header, index) => ({
            column: `col_${index}`,
            label: header,
            type: 'string',
            required: false,
          }));

          try {
            await adminAPI.templates.create({
              name,
              slug,
              record_type: recordType,
              description: `Standard ${recordType} template for ${locale}`,
              fields,
              grid_type: 'aggrid',
              theme: 'liturgicalBlueGold',
              layout_type: 'table',
              is_editable: true,
              church_id: null,
              is_global: true,
            });
            created++;
          } catch (error) {
            // Template might already exist, skip
            console.log(`Template ${name} may already exist, skipping`);
          }
        }
      }

      await loadTemplatesFromDb();
      showToast(`Created ${created} standard templates`, 'success');
    } catch (e) {
      showToast('Failed to create standard templates', 'error');
      console.error(e);
    }
  }, [loadTemplatesFromDb, showToast]);

  return {
    // State
    templateName,
    selectedTemplate,
    templates,
    saveTemplateDialogOpen,
    overwriteTemplateDialogOpen,
    deleteTemplateDialogOpen,
    templateToDelete,
    loadTemplateDialogOpen,
    templateToLoad,
    importTemplatesDialogOpen,
    importTemplatesJson,
    templateRecordType,
    templateDescription,
    templateIsGlobal,
    loadingTemplates,
    // Setters
    setTemplateName,
    setSelectedTemplate,
    setSaveTemplateDialogOpen,
    setOverwriteTemplateDialogOpen,
    setDeleteTemplateDialogOpen,
    setLoadTemplateDialogOpen,
    setImportTemplatesDialogOpen,
    setImportTemplatesJson,
    setTemplateRecordType,
    setTemplateDescription,
    setTemplateIsGlobal,
    setTemplateToDelete,
    setTemplateToLoad,
    // Handlers
    loadTemplatesFromDb,
    handleSaveTemplate,
    handleOverwriteTemplate,
    handleLoadTemplate,
    handleConfirmLoadTemplate,
    handleDeleteTemplate,
    handleConfirmDeleteTemplate,
    handleExportTemplates,
    handleImportTemplates,
    handleImportTemplatesFile,
    handleImportTemplatesConfirm,
    handleCreateStandardTemplates,
  };
}
