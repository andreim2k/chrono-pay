
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download, Eye, Loader2, Trash2 } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceHtmlPreview } from './invoice-html-preview';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


interface InvoiceListProps {
  invoices: Invoice[];
}

const currencySymbols: { [key: string]: string } = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

export function InvoiceList({ invoices }: InvoiceListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const showVatColumn = useMemo(() => invoices.some(invoice => invoice.vatAmount && invoice.vatAmount > 0), [invoices]);

  const getBadgeVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Sent':
        return 'secondary';
      case 'Created':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleStatusChange = (invoice: Invoice, newStatus: Invoice['status']) => {
    if (!firestore) return;
    const invoiceRef = doc(firestore, `invoices`, invoice.id);
    updateDocumentNonBlocking(invoiceRef, { status: newStatus });
    toast({
        title: 'Invoice Updated',
        description: `Invoice ${invoice.invoiceNumber} has been marked as ${newStatus}.`
    });
  }

  const handleDownloadPdf = async (invoice: Invoice) => {
    setInvoiceToView(invoice);
    setIsGenerating(true);
    
    // We need a short timeout to allow the hidden preview to render with the correct invoice data
    setTimeout(async () => {
      if (!previewRef.current) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not generate PDF. Preview element not found.',
        });
        setIsGenerating(false);
        return;
      }

      const canvas = await html2canvas(previewRef.current, { scale: 4, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      
      setIsGenerating(false);
      setInvoiceToView(null);
    }, 100);
  }

  const generatePreview = useCallback(async () => {
    if (!invoiceToView || !previewRef.current) {
        setPreviewImage('');
        return;
    }
    
    setIsGenerating(true);
    try {
        const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, backgroundColor: null });
        setPreviewImage(canvas.toDataURL('image/png'));
    } catch (error) {
        console.error('Error generating canvas:', error);
        toast({
            variant: 'destructive',
            title: 'Preview Error',
            description: 'Could not generate the invoice preview image.',
        });
    } finally {
        setIsGenerating(false);
    }
  }, [invoiceToView, toast]);

  useEffect(() => {
    if (isPreviewOpen) {
      generatePreview();
    }
  }, [isPreviewOpen, generatePreview]);

  const openViewDialog = (invoice: Invoice) => {
    setInvoiceToView(invoice);
    setIsPreviewOpen(true);
  }

  const openDeleteDialog = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsAlertOpen(true);
  }

  const confirmDelete = () => {
    if (!firestore || !invoiceToDelete) return;
    const invoiceRef = doc(firestore, `invoices`, invoiceToDelete.id);
    deleteDocumentNonBlocking(invoiceRef);
    toast({
      title: 'Invoice Deleted',
      description: `Invoice ${invoiceToDelete.invoiceNumber} has been deleted.`,
    });
    setInvoiceToDelete(null);
    setIsAlertOpen(false);
  };


  return (
    <>
      {/* Hidden container for PDF/image generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '800px' }}>
        {invoiceToView && <div ref={previewRef}><InvoiceHtmlPreview invoice={invoiceToView} /></div>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all your past and present invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Subtotal</TableHead>
                {showVatColumn && <TableHead>VAT</TableHead>}
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>{format(new Date(invoice.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{currencySymbols[invoice.currency] || invoice.currency}{invoice.subtotal.toFixed(2)}</TableCell>
                  {showVatColumn && (
                      <TableCell>
                          {invoice.vatAmount ? `${currencySymbols[invoice.currency] || invoice.currency}${invoice.vatAmount.toFixed(2)}` : '-'}
                      </TableCell>
                  )}
                  <TableCell className="font-semibold">{currencySymbols[invoice.currency] || invoice.currency}{invoice.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => openViewDialog(invoice)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDownloadPdf(invoice)}>
                          <Download className="mr-2 h-4 w-4" /> Download PDF
                        </DropdownMenuItem>
                        {invoice.status === 'Created' && <DropdownMenuItem onSelect={() => handleStatusChange(invoice, 'Sent')}>Mark as Sent</DropdownMenuItem>}
                        {invoice.status === 'Sent' && <DropdownMenuItem onSelect={() => handleStatusChange(invoice, 'Paid')}>Mark as Paid</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => openDeleteDialog(invoice)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* View Invoice Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Invoice Preview: {invoiceToView?.invoiceNumber}</DialogTitle>
                <DialogDescription>
                    Reviewing invoice for {invoiceToView?.clientName}.
                </DialogDescription>
            </DialogHeader>
            <div className='flex-grow overflow-auto bg-gray-100 dark:bg-gray-800 rounded-lg p-4'>
                <div className="w-full flex justify-center">
                    {isGenerating && (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="ml-2">Generating preview...</p>
                    </div>
                    )}
                    {!isGenerating && previewImage && (
                    <img src={previewImage} alt="Invoice Preview" className="max-w-full h-auto object-contain rounded-md shadow-lg" />
                    )}
                    {!isGenerating && !previewImage && (
                    <div className="flex h-full w-full items-center justify-center text-center text-muted-foreground p-8">
                        <p>Could not generate preview.</p>
                    </div>
                    )}
                </div>
            </div>
            <DialogFooter className='pt-4'>
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete invoice
              <span className="font-semibold"> {invoiceToDelete?.invoiceNumber}</span> for 
              <span className="font-semibold"> {invoiceToDelete?.clientName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
