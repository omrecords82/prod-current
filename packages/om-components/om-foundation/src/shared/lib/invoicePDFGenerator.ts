// Language labels for English only
export const LANGUAGE_LABELS = {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice Number',
    date: 'Date',
    dueDate: 'Due Date',
    billTo: 'Bill To',
    description: 'Description',
    quantity: 'Quantity',
    rate: 'Rate',
    amount: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    notes: 'Notes',
    terms: 'Terms & Conditions',
    paymentInstructions: 'Payment Instructions',
    thankYou: 'Thank you for your business!'
};

// Placeholder functions for PDF generation
export const generateInvoicePDF = (invoiceData: any) => {
    console.log('PDF generation not implemented yet', invoiceData);
    return null;
};

export const downloadInvoicePDF = (invoiceData: any) => {
    console.log('PDF download not implemented yet', invoiceData);
};

// Default export
export default {
    LANGUAGE_LABELS,
    generateInvoicePDF,
    downloadInvoicePDF
};
