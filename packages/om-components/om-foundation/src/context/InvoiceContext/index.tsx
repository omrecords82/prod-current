import React, { createContext, useEffect, useState, useContext } from 'react';
import { InvoiceList } from '../../types/apps/invoice';
import type {
  InvoiceFilters,
  CreateInvoiceData,
  Invoice,
  PaginatedResponse
} from '@/types/orthodox-metrics.types';

interface InvoiceContextType {
  invoices: InvoiceList[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  filters: InvoiceFilters;
  setFilters: (filters: InvoiceFilters) => void;
  fetchInvoices: () => Promise<void>;
  getInvoiceById: (id: number) => Promise<Invoice | null>;
  getInvoiceByNumber: (invoiceNumber: string) => Promise<Invoice | null>;
  createInvoice: (invoice: CreateInvoiceData) => Promise<Invoice | null>;
  updateInvoice: (id: number, updates: Partial<Invoice>) => Promise<Invoice | null>;
  deleteInvoice: (id: number) => Promise<boolean>;
  markInvoiceAsPaid: (id: number, paidDate?: string) => Promise<Invoice | null>;
  generateInvoicePDF: (id: number) => Promise<Blob | null>;
  generateClientSidePDF: (invoice: Invoice, options?: any) => Promise<Blob>;
  downloadClientSidePDF: (invoice: Invoice, options?: any) => Promise<void>;
  sendInvoiceEmail: (id: number, email: string) => Promise<boolean>;
  exportInvoices: (format: 'csv' | 'xlsx' | 'pdf') => Promise<Blob | null>;
}

const InvoiceContext = createContext<InvoiceContextType | any>(undefined);

// Custom hook to use the invoice context
export const useInvoiceContext = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoiceContext must be used within an InvoiceProvider');
  }
  return context;
};

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<InvoiceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    limit: 10,
    status: undefined,
    church_id: undefined,
    date_from: undefined,
    date_to: undefined,
    search: undefined,
  });

  // Fetch invoices with current filters
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: PaginatedResponse<Invoice> = await metricsAPI.invoices.getAll({
        ...filters,
        page: currentPage,
      });

      setInvoices(response.data);
      setTotalCount(response.pagination.total);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices when filters or page changes
  useEffect(() => {
    fetchInvoices();
  }, [filters, currentPage]);

  // Get invoice by ID
  const getInvoiceById = async (id: number): Promise<Invoice | null> => {
    try {
      const invoice = await metricsAPI.invoices.getById(id);
      return invoice;
    } catch (err) {
      console.error('Error fetching invoice:', err);
      return null;
    }
  };

  // Get invoice by invoice number (v1 API)
  const getInvoiceByNumber = async (invoiceNumber: string): Promise<Invoice | null> => {
    try {
      const invoice = await metricsAPI.invoices.getByInvoiceNumber(invoiceNumber);
      return invoice;
    } catch (err) {
      console.error('Error fetching invoice by number:', err);
      return null;
    }
  };

  // Create new invoice
  const createInvoice = async (invoiceData: CreateInvoiceData): Promise<Invoice | null> => {
    try {
      const newInvoice = await metricsAPI.invoices.create(invoiceData);
      await fetchInvoices(); // Refresh the list
      return newInvoice;
    } catch (err) {
      console.error('Error creating invoice:', err);
      return null;
    }
  };

  // Update existing invoice
  const updateInvoice = async (id: number, updates: Partial<Invoice>): Promise<Invoice | null> => {
    try {
      const updatedInvoice = await metricsAPI.invoices.update(id, updates);
      await fetchInvoices(); // Refresh the list
      return updatedInvoice;
    } catch (err) {
      console.error('Error updating invoice:', err);
      return null;
    }
  };

  // Delete invoice
  const deleteInvoice = async (id: number): Promise<boolean> => {
    try {
      await metricsAPI.invoices.delete(id);
      await fetchInvoices(); // Refresh the list
      return true;
    } catch (err) {
      console.error('Error deleting invoice:', err);
      return false;
    }
  };

  // Mark invoice as paid
  const markInvoiceAsPaid = async (id: number, paidDate?: string): Promise<Invoice | null> => {
    try {
      const updatedInvoice = await metricsAPI.invoices.markPaid(id, paidDate);
      await fetchInvoices(); // Refresh the list
      return updatedInvoice;
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      return null;
    }
  };

  // Generate PDF
  const generateInvoicePDF = async (id: number): Promise<Blob | null> => {
    try {
      const pdfBlob = await metricsAPI.invoices.generatePDF(id);
      return pdfBlob;
    } catch (err) {
      console.error('Error generating PDF:', err);
      return null;
    }
  };

  // Generate PDF using client-side generator
  const generateClientSidePDF = async (invoice: Invoice, options?: any): Promise<Blob> => {
    try {
      const { generateInvoicePDF } = await import('@/shared/lib/invoicePDFGenerator');
      return await generateInvoicePDF(invoice, options);
    } catch (err) {
      console.error('Error generating client-side PDF:', err);
      throw err;
    }
  };

  // Download PDF using client-side generator
  const downloadClientSidePDF = async (invoice: Invoice, options?: any): Promise<void> => {
    try {
      const { downloadInvoicePDF } = await import('@/shared/lib/invoicePDFGenerator');
      await downloadInvoicePDF(invoice, options);
    } catch (err) {
      console.error('Error downloading client-side PDF:', err);
      throw err;
    }
  };

  // Send invoice via email
  const sendInvoiceEmail = async (id: number, email: string): Promise<boolean> => {
    try {
      await metricsAPI.invoices.sendEmail(id, email);
      return true;
    } catch (err) {
      console.error('Error sending invoice email:', err);
      return false;
    }
  };

  // Export invoices
  const exportInvoices = async (format: 'csv' | 'xlsx' | 'pdf'): Promise<Blob | null> => {
    try {
      const exportBlob = await metricsAPI.invoices.export(filters, format);
      return exportBlob;
    } catch (err) {
      console.error('Error exporting invoices:', err);
      return null;
    }
  };

  const contextValue: InvoiceContextType = {
    invoices,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    filters,
    setFilters,
    fetchInvoices,
    getInvoiceById,
    getInvoiceByNumber,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsPaid,
    generateInvoicePDF,
    generateClientSidePDF,
    downloadClientSidePDF,
    sendInvoiceEmail,
    exportInvoices,
  };

  return (
    <InvoiceContext.Provider value={contextValue}>
      {children}
    </InvoiceContext.Provider>
  );
};

// Legacy export for backward compatibility
export { InvoiceContext };