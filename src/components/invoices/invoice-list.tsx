
'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download, Eye, Loader2, Trash2, RotateCcw, ArrowUpDown, StickyNote } from 'lucide-react';
import type { Invoice, Client, Project } from '@/lib/types';
import { format, parseISO, isPast, isFuture, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch, updateDoc, deleteField } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceHtmlPreview } from './invoice-html-preview';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type SortConfig = {
  key: keyof Invoice | 'totalRon';
  direction: 'ascending' | 'descending';
} | null;

interface InvoiceListProps {
  invoices: Invoice[];
  clients: Client[];
  projects: Project[];
  isFiltered: boolean;
  selectedRows: Record<string, boolean>;
  onSelectedRowsChange: (selectedRows: Record<string, boolean>) => void;
  sortConfig: SortConfig;
  onSort: (config: SortConfig) => void;
  selectedInvoicesTotals: Record<string, number>;
}

const currencySymbols: { [key: string]: string } = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  RON: 'RON'
};

export function InvoiceList({ invoices, clients, projects, isFiltered, selectedRows, onSelectedRowsChange, sortConfig, onSort, selectedInvoicesTotals }: InvoiceListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [invoiceForNote, setInvoiceForNote] = useState<Invoice | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [invoiceForDeleteNote, setInvoiceForDeleteNote] = useState<Invoice | null>(null);
  const [isDeleteNoteAlertOpen, setIsDeleteNoteAlertOpen] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  
  const clientsById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const showVatColumn = useMemo(() => invoices.some(invoice => invoice.vatAmount && invoice.vatAmount > 0), [invoices]);
  const showRonColumn = useMemo(() => invoices.some(invoice => {
     return !!invoice.totalRon || invoice.currency === 'RON';
  }), [invoices]);

  const selectedRowCount = useMemo(() => Object.values(selectedRows).filter(Boolean).length, [selectedRows]);

  const getBadgeVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Sent':
        return 'warning';
      case 'Created':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const handleStatusChange = (invoice: Invoice, newStatus: Invoice['status']) => {
    if (!firestore || !user) return;

    const batch = writeBatch(firestore);
    const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoice.id);
    batch.update(invoiceRef, { status: newStatus });

    const hasTimecards = invoice.billedTimecardIds && invoice.billedTimecardIds.length > 0;

    if (hasTimecards && invoice.billedTimecardIds) {
        let newTimecardStatus: 'Billed' | 'Pending' = 'Pending';
        if (newStatus === 'Paid') {
            newTimecardStatus = 'Billed';
        }

        invoice.billedTimecardIds.forEach(tcId => {
            const timecardRef = doc(firestore, `users/${user.uid}/timecards`, tcId);
            batch.update(timecardRef, { status: newTimecardStatus });
        });
    }

    batch.commit().then(() => {
      toast({
        title: 'Invoice Updated',
        description: `Invoice ${invoice.invoiceNumber} marked as ${newStatus}. Associated timecards updated if applicable.`,
      });
    }).catch(error => {
      console.error("Error updating invoice and timecard statuses: ", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the invoice status. Please try again.',
      });
    });
  }

  const handleDownloadPdf = async (invoice: Invoice) => {
    setInvoiceToView(invoice);
    setIsGenerating(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          if (!previewRef.current) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate PDF. Preview element not found.' });
            setIsGenerating(false);
            setInvoiceToView(null);
            return;
          }

          const canvas = await html2canvas(previewRef.current, { scale: 4, useCORS: true, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
          pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);

          toast({ title: 'PDF Downloaded', description: `Invoice ${invoice.invoiceNumber} has been downloaded.` });
        } catch (error) {
          console.error('PDF generation failed:', error);
          toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'Could not generate the PDF. Please try again.' });
        } finally {
          setIsGenerating(false);
          setInvoiceToView(null);
        }
      });
    });
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
        toast({ variant: 'destructive', title: 'Preview Error', description: 'Could not generate the invoice preview image.' });
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

  const confirmDelete = async () => {
    if (!firestore || !invoiceToDelete || !user) return;
    
    const batch = writeBatch(firestore);
    const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoiceToDelete.id);
    batch.delete(invoiceRef);

    if (invoiceToDelete.billedTimecardIds && invoiceToDelete.billedTimecardIds.length > 0) {
        invoiceToDelete.billedTimecardIds.forEach(tcId => {
            const timecardRef = doc(firestore, `users/${user.uid}/timecards`, tcId);
            batch.update(timecardRef, { status: 'Billable' });
        });
    }

    try {
        await batch.commit();
        toast({ title: 'Invoice Deleted', description: `Invoice ${invoiceToDelete.invoiceNumber} has been deleted and associated timecards are now unbilled.` });
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error Deleting Invoice', description: 'Could not delete the invoice. Please try again.' });
    }

    setInvoiceToDelete(null);
    setIsAlertOpen(false);
  };

  const openNoteDialog = (invoice: Invoice) => {
    setInvoiceForNote(invoice);
    setNoteText(invoice.note || '');
    setIsNoteDialogOpen(true);
  };

  const openDeleteNoteAlert = (invoice: Invoice) => {
    setInvoiceForDeleteNote(invoice);
    setIsDeleteNoteAlertOpen(true);
  };

  const handleSaveNote = async () => {
    if (!firestore || !user || !invoiceForNote) return;

    setIsSavingNote(true);
    try {
      const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoiceForNote.id);
      const trimmed = noteText.trim();
      if (trimmed) {
        await updateDoc(invoiceRef, { note: trimmed });
      } else {
        await updateDoc(invoiceRef, { note: deleteField() });
      }

      toast({
        title: trimmed ? 'Note Saved' : 'Note Removed',
        description: trimmed
          ? `Note saved for invoice ${invoiceForNote.invoiceNumber}.`
          : `Note removed for invoice ${invoiceForNote.invoiceNumber}.`,
      });
      setIsNoteDialogOpen(false);
      setInvoiceForNote(null);
      setNoteText('');
    } catch (error) {
      console.error("Error saving note: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save note. Please try again.',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!firestore || !user || !invoiceForDeleteNote) return;

    try {
      const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoiceForDeleteNote.id);
      await updateDoc(invoiceRef, { note: deleteField() });

      toast({
        title: 'Note Deleted',
        description: `Note deleted for invoice ${invoiceForDeleteNote.invoiceNumber}.`,
      });

      if (invoiceForNote?.id === invoiceForDeleteNote.id) {
        setIsNoteDialogOpen(false);
        setInvoiceForNote(null);
        setNoteText('');
      }
    } catch (error) {
      console.error("Error deleting note: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete note. Please try again.',
      });
    } finally {
      setInvoiceForDeleteNote(null);
      setIsDeleteNoteAlertOpen(false);
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) {
      invoices.forEach(inv => newSelectedRows[inv.id] = true);
    }
    onSelectedRowsChange(newSelectedRows);
  };

  const handleRowSelect = (invoiceId: string, checked: boolean) => {
    const newSelectedRows = { ...selectedRows, [invoiceId]: checked };
    onSelectedRowsChange(newSelectedRows);
  };

  const handleDeleteSelected = async () => {
    if (!firestore || selectedRowCount === 0 || !user) return;
    
    const batch = writeBatch(firestore);
    const idsToDelete = Object.keys(selectedRows).filter(id => selectedRows[id]);
    
    idsToDelete.forEach(id => {
        const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, id);
        batch.delete(invoiceRef);

        const invoice = invoices.find(inv => inv.id === id);
        if (invoice?.billedTimecardIds) {
            invoice.billedTimecardIds.forEach(tcId => {
                const timecardRef = doc(firestore, `users/${user.uid}/timecards`, tcId);
                batch.update(timecardRef, { status: 'Billable', invoiceId: '' });
            });
        }
    });

    try {
        await batch.commit();
        toast({ title: 'Invoices Deleted', description: `${idsToDelete.length} invoices have been successfully deleted.` });
        onSelectedRowsChange({});
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error Deleting Invoices', description: 'Could not delete the selected invoices. Please try again.' });
    }
  };

  const requestSort = (key: keyof Invoice | 'totalRon') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    onSort({ key, direction });
  };

  const getSortIndicator = (key: keyof Invoice | 'totalRon') => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortConfig.direction === 'ascending' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  const totalsString = useMemo(() => {
    const entries = Object.entries(selectedInvoicesTotals);
    if (entries.length === 0) return '';
    
    const ronTotal = selectedInvoicesTotals['RON_total_for_summary'];
    const otherCurrencies = entries.filter(([currency]) => currency !== 'RON_total_for_summary');

    let otherCurrenciesParts = otherCurrencies.map(([currency, total]) => `${(currencySymbols[currency] || currency)}${total.toFixed(2)}`);

    if (otherCurrenciesParts.length === 0 && ronTotal !== undefined) {
      return `${ronTotal.toFixed(2)} RON total`;
    }
    
    if (otherCurrenciesParts.length > 0 && ronTotal !== undefined) {
      return `${otherCurrenciesParts.join(' + ')} = ${ronTotal.toFixed(2)} RON total`;
    }

    return `${otherCurrenciesParts.join(' + ')} total`;
  }, [selectedInvoicesTotals]);

  const SortableHeader = ({ sortKey, children }: { sortKey: keyof Invoice | 'totalRon', children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(sortKey)} className="p-0 hover:text-primary hover:bg-transparent">
        {children}
        {getSortIndicator(sortKey)}
      </Button>
    </TableHead>
  );
  
  const getDueDateStyles = (invoice: Invoice) => {
    if (invoice.status === 'Paid') return '';
    const dueDate = parseISO(invoice.dueDate);
    const today = new Date();
    if (isPast(dueDate)) return 'text-destructive';
    if (isFuture(dueDate) && differenceInDays(dueDate, today) <= 7) return 'text-amber-600 dark:text-amber-500';
    return '';
  }

  return (
    <>
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '800px' }}>
        {invoiceToView && <div ref={previewRef}><InvoiceHtmlPreview invoice={invoiceToView} /></div>}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>{isFiltered ? 'Filtered Invoices' : 'All Invoices'}</CardTitle>
                <CardDescription>
                  Displaying {invoices.length} invoice(s).
                  {selectedRowCount > 0 && ` ${selectedRowCount} selected, ${totalsString}`}
                </CardDescription>
            </div>
            {selectedRowCount > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedRowCount})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete {selectedRowCount} selected invoice(s) and mark their associated timecards as 'Unbilled'. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected}>Delete Invoices</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px] px-4">
                    <Checkbox
                        checked={invoices.length > 0 && selectedRowCount === invoices.length}
                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                        aria-label="Select all"
                    />
                </TableHead>
                <SortableHeader sortKey="invoiceNumber">Invoice #</SortableHeader>
                <SortableHeader sortKey="clientName">Client</SortableHeader>
                <SortableHeader sortKey="projectName">Project</SortableHeader>
                <SortableHeader sortKey="date">Date</SortableHeader>
                <SortableHeader sortKey="dueDate">Due Date</SortableHeader>
                <SortableHeader sortKey="total">Total</SortableHeader>
                {showRonColumn && <SortableHeader sortKey="totalRon">Total (RON)</SortableHeader>}
                <SortableHeader sortKey="status">Status</SortableHeader>
                <TableHead className="text-right px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
             {invoices.length > 0 ? invoices.map((invoice) => {
                const project = projectsById.get(invoice.projectId);
                const client = clientsById.get(project?.clientId || '');
                const displayInRon = client?.preferredCompanyIbanCurrency === 'RON' && invoice.currency !== 'RON';

                return (
                    <TableRow key={invoice.id} data-state={selectedRows[invoice.id] && "selected"}>
                    <TableCell className="px-4">
                        <Checkbox
                            checked={selectedRows[invoice.id] || false}
                            onCheckedChange={(checked) => handleRowSelect(invoice.id, Boolean(checked))}
                            aria-label={`Select invoice ${invoice.invoiceNumber}`}
                        />
                    </TableCell>
                    <TableCell className="font-medium relative p-0">
                      <div className="relative px-4 py-4 flex items-center min-h-[52px]">
                        <span>{invoice.invoiceNumber}</span>
                        {invoice.note && (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNoteDialog(invoice);
                                  }}
                                  className="absolute top-0 right-0 w-0 h-0 border-solid border-t-[10px] border-l-[10px] border-l-transparent border-t-red-500 hover:border-t-red-600 dark:border-t-red-400 dark:hover:border-t-red-300 transition-colors cursor-pointer focus:outline-none after:content-[''] after:absolute after:-top-1 after:-right-1 after:w-5 after:h-5"
                                  aria-label={`Note for invoice ${invoice.invoiceNumber}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                className="max-w-xs shadow-lg p-3 bg-popover border text-popover-foreground rounded-lg"
                              >
                                <div className="font-semibold text-xs flex items-center gap-1.5 text-muted-foreground mb-1.5">
                                  <StickyNote className="h-3.5 w-3.5 text-red-500" />
                                  <span>Invoice Note</span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed text-xs break-words">{invoice.note}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell>{invoice.projectName}</TableCell>
                    <TableCell>{format(parseISO(invoice.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className={cn('font-medium', getDueDateStyles(invoice))}>
                        {format(parseISO(invoice.dueDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {displayInRon && invoice.totalRon ?
                        <div className="flex flex-col">
                            <span>{invoice.totalRon.toFixed(2)} RON</span>
                            <span className="text-xs text-muted-foreground font-normal">
                                ({currencySymbols[invoice.currency] || invoice.currency}{invoice.total.toFixed(2)})
                            </span>
                        </div>
                         :
                        <>
                          {currencySymbols[invoice.currency] || invoice.currency}{invoice.total.toFixed(2)}
                          {showVatColumn && invoice.vatAmount && invoice.vatAmount > 0 && (
                              <div className='text-xs text-muted-foreground font-normal'>
                                  Net: {currencySymbols[invoice.currency] || invoice.currency}{invoice.subtotal.toFixed(2)}
                              </div>
                          )}
                        </>
                      }
                    </TableCell>
                    {showRonColumn && (
                        <TableCell className={cn("font-semibold", "text-foreground")}>
                            {invoice.totalRon ? `${invoice.totalRon.toFixed(2)} RON` : (invoice.currency === 'RON' ? `${invoice.total.toFixed(2)} RON` : '-')}
                        </TableCell>
                    )}
                    <TableCell>
                        <Badge variant={getBadgeVariant(invoice.status)} className="w-20 justify-center">{invoice.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right px-4">
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => openNoteDialog(invoice)}>
                              <StickyNote className="mr-2 h-4 w-4" /> {invoice.note ? 'Edit Note' : 'Add Note'}
                            </DropdownMenuItem>
                            {invoice.note && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => openDeleteNoteAlert(invoice)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {invoice.status === 'Created' && <DropdownMenuItem onSelect={() => handleStatusChange(invoice, 'Sent')}>Mark as Sent</DropdownMenuItem>}
                            {invoice.status === 'Sent' && <DropdownMenuItem onSelect={() => handleStatusChange(invoice, 'Paid')}>Mark as Paid</DropdownMenuItem>}
                            {invoice.status === 'Paid' && <DropdownMenuItem onSelect={() => handleStatusChange(invoice, 'Sent')}><RotateCcw className="mr-2 h-4 w-4" />Revert to Sent</DropdownMenuItem>}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => openDeleteDialog(invoice)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )
             }) : (
                <TableRow>
                  <TableCell colSpan={showRonColumn ? 10 : 9} className="h-24 text-center">
                    No invoices match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
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
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice <span className="font-semibold">{invoiceToDelete?.invoiceNumber}</span>. Associated timecards will be marked as 'Billable'. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              {invoiceForNote?.note ? 'Edit Note' : 'Add Note'}
            </DialogTitle>
            <DialogDescription>
              Internal note for Invoice <span className="font-semibold">{invoiceForNote?.invoiceNumber}</span> ({invoiceForNote?.clientName}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note (e.g. payment arrangements, client requests, reminders)..."
              rows={5}
              className="resize-none text-sm"
              autoFocus
            />
          </div>
          <DialogFooter className="flex sm:justify-between items-center w-full gap-2 pt-2">
            {invoiceForNote?.note ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (invoiceForNote) {
                    openDeleteNoteAlert(invoiceForNote);
                  }
                }}
                disabled={isSavingNote}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete Note
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNoteDialogOpen(false)}
                disabled={isSavingNote}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                {isSavingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Note
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteNoteAlertOpen} onOpenChange={setIsDeleteNoteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the note for invoice <span className="font-semibold">{invoiceForDeleteNote?.invoiceNumber}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteNote}
            >
              Delete Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
