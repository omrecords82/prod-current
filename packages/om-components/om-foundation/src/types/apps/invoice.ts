// Import the main invoice types from the API
export type { 
  Invoice, 
  InvoiceItem, 
  InvoiceFilters, 
  CreateInvoiceData, 
  InvoiceStatus 
} from '../orthodox-metrics.types';

import type { Invoice, InvoiceItem } from '../orthodox-metrics.types';

// For backward compatibility with existing components
export type InvoiceList = Invoice;

// Legacy support - map old structure to new
export interface order extends InvoiceItem {
  itemName: string;
  unitPrice: number;
  units: number;
  unitTotalPrice: number;
}