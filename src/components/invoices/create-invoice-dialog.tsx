

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, getDate, subMonths, parseISO, min, max, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Save, Loader2, RefreshCw, Eye, PlusCircle, Hourglass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Client, Invoice, Project, InvoiceTheme, User, Timecard } from '@/lib/types';
import { getExchangeRate } from '@/ai/flows/get-exchange-rate';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { InvoiceHtmlPreview, themeStyles } from '@/components/invoices/invoice-html-preview';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const currencies = ['EUR', 'USD', 'GBP', 'RON'];
const invoiceThemes: InvoiceTheme[] = [
  'Classic', 'Modern', 'Sunset', 'Ocean', 'Monochrome', 'Minty', 'Velvet',
  'Corporate Blue', 'Earthy Tones', 'Creative', 'Slate Gray', 'Dark Charcoal',
  'Navy Blue', 'Forest Green', 'Burgundy', 'Teal', 'Coral', 'Lavender',
  'Golden', 'Steel Blue', 'Light Blue', 'Sky Blue', 'Mint Green', 'Lime',
  'Peach', 'Rose', 'Lilac', 'Sand', 'Olive', 'Maroon', 'Deep Purple',
  'Turquoise', 'Charcoal', 'Crimson', 'Sapphire'
];

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), 'MMMM'),
}));

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);


function getDayWithOrdinal(date: Date): string {
    const day = getDate(date);
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1:  return `${day}st`;
      case 2:  return `${day}nd`;
      case 3:  return `${day}rd`;
      default: return `${day}th`;
    }
}

const formatDateWithOrdinal = (dateString: string | undefined) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    // add timezone offset to avoid date shifting
    const adjustedDate = new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
    const dayWithOrdinal = getDayWithOrdinal(adjustedDate);
    return `${dayWithOrdinal} of ${format(adjustedDate, 'MMMM, yyyy')}`;
}

interface InvoiceConfig {
    currency: string;
    invoiceTheme: InvoiceTheme;
    exchangeRate?: number;
    exchangeRateDate?: string;
    usedMaxRate: boolean;
    isFetchingRate: boolean;
}

export function CreateInvoiceDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const lastMonth = subMonths(new Date(), 1);
  const [invoicedMonth, setInvoicedMonth] = useState<number>(lastMonth.getMonth());
  const [invoicedYear, setInvoicedYear] = useState<number>(lastMonth.getFullYear());
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTimecards, setSelectedTimecards] = useState<Record<string, boolean>>({});
  
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>({
    currency: 'EUR',
    invoiceTheme: 'Classic',
    exchangeRate: undefined,
    exchangeRateDate: undefined,
    usedMaxRate: false,
    isFetchingRate: false,
  });


  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: myCompany } = useDoc<User>(userDocRef, `users/${user?.uid}`);

  const clientsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/clients`) : null),
    [firestore, user]
  );
  const { data: clients } = useCollection<Client>(clientsQuery, `users/${user?.uid}/clients`);
  
  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

  const projectsForClientQuery = useMemoFirebase(
    () => {
        if (!firestore || !selectedClientId || !user) return null;
        return query(collection(firestore, `users/${user.uid}/projects`), where('clientId', '==', selectedClientId))
    },
    [firestore, selectedClientId, user]
  );
  const { data: projectsForClient } = useCollection<Project>(projectsForClientQuery, `users/${user?.uid}/projects`);

  const unbilledTimecardsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedProjectId) return null;
    return query(
        collection(firestore, `users/${user.uid}/timecards`),
        where('projectId', '==', selectedProjectId),
        where('status', '==', 'Billable')
    );
  }, [firestore, user, selectedProjectId]);
  const { data: unbilledTimecards } = useCollection<Timecard>(unbilledTimecardsQuery, `users/${user?.uid}/timecards`);

  const filteredTimecards = useMemo(() => {
    if (!unbilledTimecards) return [];
    return unbilledTimecards.filter(tc => {
      if (!tc.startDate) return false;
      const tcStartDate = new Date(tc.startDate.replace(/-/g, '/'));
      return tcStartDate.getFullYear() === invoicedYear && tcStartDate.getMonth() === invoicedMonth;
    });
  }, [unbilledTimecards, invoicedYear, invoicedMonth]);

  const selectedClient = useMemo(() => {
    return clients?.find(c => c.id === selectedClientId) || null;
  }, [selectedClientId, clients]);

  // When project ID changes, find the full project object
  useEffect(() => {
      if (selectedProjectId) {
          const project = projectsForClient?.find(p => p.id === selectedProjectId);
          setCurrentProject(project || null);
      } else {
          setCurrentProject(null);
      }
      setSelectedTimecards({});
  }, [selectedProjectId, projectsForClient]);

  // Effect to fetch rates and update config when the final `currentProject` object is stable.
  useEffect(() => {
      if (!currentProject) {
          // If no project, reset to a default config.
          setInvoiceConfig({
              currency: 'EUR',
              invoiceTheme: 'Classic',
              exchangeRate: undefined,
              exchangeRateDate: undefined,
              usedMaxRate: false,
              isFetchingRate: false,
          });
          return;
      }

      const newCurrency = currentProject.currency || 'EUR';
      const newTheme = currentProject.invoiceTheme || 'Classic';

      const fetchRate = async () => {
          // Start fetching, update config immediately with known values and loading state.
          setInvoiceConfig({
              currency: newCurrency,
              invoiceTheme: newTheme,
              exchangeRate: undefined,
              exchangeRateDate: undefined,
              usedMaxRate: false,
              isFetchingRate: true,
          });

          if (newCurrency === 'RON') {
              setInvoiceConfig(prev => ({
                  ...prev,
                  exchangeRate: 1,
                  exchangeRateDate: new Date().toISOString().split('T')[0],
                  isFetchingRate: false,
              }));
              return;
          }

          if (currentProject.maxExchangeRate && currentProject.maxExchangeRateDate) {
              setInvoiceConfig(prev => ({
                  ...prev,
                  exchangeRate: currentProject.maxExchangeRate,
                  exchangeRateDate: currentProject.maxExchangeRateDate,
                  usedMaxRate: true,
                  isFetchingRate: false,
              }));
              toast({
                  title: 'Fixed Exchange Rate Applied',
                  description: `Using fixed project exchange rate of ${currentProject.maxExchangeRate.toFixed(4)} RON.`,
              });
              return;
          }

          try {
              const result = await getExchangeRate({ currency: newCurrency });
              if (result.rate && result.date) {
                  setInvoiceConfig(prev => ({
                      ...prev,
                      exchangeRate: result.rate,
                      exchangeRateDate: result.date,
                      isFetchingRate: false,
                  }));
                  toast({
                      title: 'Exchange Rate Fetched',
                      description: `BNR rate for ${formatDateWithOrdinal(result.date)}: 1 ${newCurrency} = ${result.rate.toFixed(4)} RON.`,
                  });
              } else {
                  throw new Error('Rate not found');
              }
          } catch (error) {
              setInvoiceConfig(prev => ({ ...prev, isFetchingRate: false }));
              toast({
                  variant: 'destructive',
                  title: 'Error Fetching Rate',
                  description: 'Could not fetch the exchange rate from BNR.',
              });
          }
      };

      fetchRate();
  }, [currentProject, toast]);
  
  const generateInvoiceNumber = (project: Project, allInvoices: Invoice[]) => {
    const prefix = project.invoiceNumberPrefix || project.name.trim().split(' ').map(word => word[0]).join('').toUpperCase();
    const projectInvoicesWithPrefix = allInvoices.filter(inv => inv.projectId === project.id && inv.invoiceNumber.startsWith(prefix));
    const nextInvoiceNum = projectInvoicesWithPrefix.length + 1;
    const paddedNumber = String(nextInvoiceNum).padStart(3, '0');
    return `${prefix}${paddedNumber}`;
  };

  const invoiceData: Omit<Invoice, 'id'> | null = useMemo(() => {
    if (!selectedClient || !currentProject || !myCompany || !invoices ) return null;

    const currentlySelectedTimecards = filteredTimecards.filter(tc => selectedTimecards[tc.id]);
    if (currentlySelectedTimecards.length === 0) return null;

    const allStartDates = currentlySelectedTimecards.map(tc => parseISO(tc.startDate));
    const allEndDates = currentlySelectedTimecards.map(tc => parseISO(tc.endDate));

    const earliestStartDate = min(allStartDates);
    const latestEndDate = max(allEndDates);
    
    let items: Invoice['items'], subtotal: number, billedTimecardIds: string[] = [];
    const projectRate = currentProject.rate;
    
    const totalHours = currentlySelectedTimecards.reduce((acc, tc) => acc + tc.hours, 0);
    billedTimecardIds = currentlySelectedTimecards.map(tc => tc.id);

    if (billedTimecardIds.length === 0 || typeof projectRate !== 'number') return null;
    
    let quantity: number;
    let unit: string;
    let description: string;

    if (currentProject.rateType === 'hourly') {
        quantity = totalHours;
        unit = 'hours';
        description = `IT Consultancy services for period ${format(earliestStartDate, 'dd.MM.yyyy')} - ${format(latestEndDate, 'dd.MM.yyyy')}`;
    } else { // daily
        const hoursPerDay = currentProject.hoursPerDay || 8;
        quantity = totalHours / hoursPerDay;
        unit = 'days';
        description = `IT Consultancy services for period ${format(earliestStartDate, 'dd.MM.yyyy')} - ${format(latestEndDate, 'dd.MM.yyyy')}`;
    }

    subtotal = quantity * projectRate;
    
    items = [{
      description,
      quantity,
      unit,
      rate: projectRate,
      amount: subtotal,
    }];

    const clientVatRate = selectedClient.vatRate;
    const hasVat = selectedClient.hasVat || false;
    
    const creationDateString = new Date().toLocaleDateString('en-CA');
    
    const data: Omit<Invoice, 'id'> = {
      invoiceNumber: generateInvoiceNumber(currentProject, invoices),
      companyName: myCompany.companyName!,
      companyAddress: myCompany.companyAddress!,
      companyVat: myCompany.companyVat!,
      companyIban: myCompany.companyIban,
      companyBankName: myCompany.companyBankName,
      companySwift: myCompany.companySwift,
      companyPhone: myCompany.companyPhone,
      companyEmail: myCompany.companyEmail,
      clientName: selectedClient.name,
      clientAddress: selectedClient.address,
      clientVat: selectedClient.vat,
      clientBankName: selectedClient.bankName,
      clientIban: selectedClient.iban,
      clientSwift: selectedClient.swift,
      projectId: currentProject.id,
      projectName: currentProject.name.trim(),
      date: creationDateString,
      dueDate: format(addDays(new Date(creationDateString), selectedClient.paymentTerms), 'yyyy-MM-dd'),
      currency: invoiceConfig.currency,
      language: selectedClient.language || 'English',
      items,
      subtotal,
      total: subtotal,
      status: 'Created' as const,
      usedMaxExchangeRate: invoiceConfig.usedMaxRate,
      theme: invoiceConfig.invoiceTheme,
      billedTimecardIds,
      hasVat: hasVat,
    };

    if (hasVat) {
        data.vatAmount = subtotal * clientVatRate;
        data.vatRate = clientVatRate;
        data.total = data.subtotal + data.vatAmount;
    }

    if (invoiceConfig.exchangeRate) {
        data.exchangeRate = invoiceConfig.exchangeRate;
        data.exchangeRateDate = invoiceConfig.exchangeRateDate;
        data.totalRon = data.total * invoiceConfig.exchangeRate;
    }

    return data;
  }, [
      selectedClient, currentProject, invoices, invoiceConfig,
      myCompany, 
      filteredTimecards, selectedTimecards
    ]);
  
  const generatePreview = useCallback(async () => {
    if (!invoiceData || !previewRef.current) {
        setPreviewImage('');
        return;
    }
    
    setIsGenerating(true);
    try {
        const canvas = await html2canvas(previewRef.current, {
            scale: 3,
            useCORS: true,
            backgroundColor: null,
        });
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
}, [invoiceData, toast]);


  useEffect(() => {
    if (isPreviewOpen) {
      generatePreview();
    }
  }, [isPreviewOpen, generatePreview]);

  const handleSaveInvoice = async () => {
    if (!invoiceData || !firestore || !user) return;

    setIsGenerating(true);
    const batch = writeBatch(firestore);

    // 1. Add the new invoice
    const newInvoiceRef = doc(collection(firestore, `users/${user.uid}/invoices`));
    
    // Create a clean object to save.
    const dataToSave: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(invoiceData)) {
        if (value !== undefined) {
            dataToSave[key] = value;
        }
    }
    delete dataToSave.hasVat; // a temporary field
    
    // Explicitly check for vatAmount and vatRate
    if (!invoiceData.hasVat) {
        delete dataToSave.vatAmount;
        delete dataToSave.vatRate;
    }

    batch.set(newInvoiceRef, dataToSave);

    // 2. Update status of billed timecards
    if (invoiceData.billedTimecardIds && invoiceData.billedTimecardIds.length > 0) {
      invoiceData.billedTimecardIds.forEach(timecardId => {
        const timecardRef = doc(firestore, `users/${user.uid}/timecards`, timecardId);
        batch.update(timecardRef, {
          status: 'Pending',
          invoiceId: newInvoiceRef.id,
        });
      });
    }
    
    try {
      await batch.commit();
      toast({
        title: 'Invoice Saved',
        description: `Invoice ${invoiceData.invoiceNumber} has been saved.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving invoice and updating timecards: ", error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the invoice. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current || !invoiceData) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 4, // Higher scale for better resolution
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
      doc.save(`invoice-${invoiceData.invoiceNumber}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: `Invoice ${invoiceData.invoiceNumber} has been downloaded successfully.`,
      });
    } catch (error) {
      console.error('PDF download failed:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not download the invoice PDF. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  }
  
  // Reset state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
        setSelectedClientId(null);
        setSelectedProjectId(null);
        setCurrentProject(null);
        setSelectedTimecards({});
        setIsPreviewOpen(false);
    }
  }, [isOpen]);

  const handleSelectAllTimecards = (check: boolean) => {
    if (!filteredTimecards) return;
    const newSelection: Record<string, boolean> = {};
    if (check) {
      filteredTimecards.forEach(tc => newSelection[tc.id] = true);
    }
    setSelectedTimecards(newSelection);
  }

  const buttonsDisabled = !invoiceData || isGenerating || invoiceConfig.isFetchingRate;
  const availableClients = clients || [];
  
  const totalHoursFromTimecards = useMemo(() => {
    if (!filteredTimecards) return 0;
    return filteredTimecards.reduce((acc, tc) => selectedTimecards[tc.id] ? acc + tc.hours : acc, 0);
  }, [filteredTimecards, selectedTimecards]);


  const ronBreakdown = useMemo(() => {
    if (!invoiceData || !invoiceConfig.exchangeRate || invoiceConfig.currency === 'RON') {
        return null;
    }
    const subtotalRon = invoiceData.subtotal * invoiceConfig.exchangeRate;
    const vatAmountRon = (invoiceData.vatAmount || 0) * invoiceConfig.exchangeRate;
    const totalRon = invoiceData.total * invoiceConfig.exchangeRate;

    return {
        subtotal: subtotalRon.toFixed(2),
        vat: vatAmountRon.toFixed(2),
        total: totalRon.toFixed(2),
    };
  }, [invoiceData, invoiceConfig.exchangeRate, invoiceConfig.currency]);

  return (
    <>
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '800px' }}>
        {invoiceData && <div ref={previewRef}><InvoiceHtmlPreview invoice={invoiceData} /></div>}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="px-1">
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Select a client and project to generate an invoice from unbilled timecards.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto space-y-4 py-4 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-select" className="mb-2 block">Client</Label>
                <Select onValueChange={setSelectedClientId} value={selectedClientId || ''}>
                  <SelectTrigger id="client-select">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId && (
                <div className="space-y-2">
                  <Label htmlFor="project-select" className="mb-2 block">Project</Label>
                   <Select onValueChange={setSelectedProjectId} value={selectedProjectId || ''}>
                      <SelectTrigger id="project-select" className="justify-start">
                          <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                          {projectsForClient?.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                  {project.name.trim()}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedClientId && selectedProjectId && (
              <>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoice-month" className="mb-2 block">Service Month</Label>
                        <Select
                          value={String(invoicedMonth)}
                          onValueChange={(value) => setInvoicedMonth(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map(month => (
                              <SelectItem key={month.value} value={String(month.value)}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invoice-year" className="mb-2 block">Service Year</Label>
                        <Select
                          value={String(invoicedYear)}
                          onValueChange={(value) => setInvoicedYear(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map(year => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-sm flex items-center justify-between">
                      <div className='flex items-center'>
                        <Hourglass className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">Total Hours Selected:</span>
                      </div>
                      <span className='font-bold text-foreground'>{totalHoursFromTimecards.toFixed(2)}</span>
                    </div>
                    
                    <Card>
                      <CardHeader className='flex-row items-center justify-between py-3 px-4'>
                        <CardTitle className='text-base'>Timecards to Invoice</CardTitle>
                        <div className='flex items-center space-x-2'>
                          <Label htmlFor='select-all-timecards' className='text-sm font-normal'>Select All</Label>
                          <Checkbox id='select-all-timecards' onCheckedChange={handleSelectAllTimecards} />
                        </div>
                      </CardHeader>
                      <CardContent className='p-0'>
                        <ScrollArea className="h-48">
                          <div className='p-4 space-y-3'>
                            {filteredTimecards && filteredTimecards.length > 0 ? (
                              filteredTimecards.map(tc => (
                                <div key={tc.id} className='flex items-center justify-between text-sm p-2 rounded-md bg-background hover:bg-muted/50'>
                                  <div className='flex items-center gap-3'>
                                    <Checkbox id={`tc-${tc.id}`} checked={!!selectedTimecards[tc.id]} onCheckedChange={(checked) => setSelectedTimecards(prev => ({ ...prev, [tc.id]: !!checked }))} />
                                    <div>
                                      <p className='font-medium'>{format(new Date(tc.startDate.replace(/-/g, '/')), 'MMM d')} - {format(new Date(tc.endDate.replace(/-/g, '/')), 'MMM d, yyyy')}</p>
                                      <p className='text-xs text-muted-foreground'>{tc.description || 'No description'}</p>
                                    </div>
                                  </div>
                                  <Badge variant='outline'>{tc.hours}h</Badge>
                                </div>
                              ))
                            ) : (
                              <div className='text-center text-sm text-muted-foreground py-10'>
                                No timecards with status 'Billable' for this project in {months[invoicedMonth].label} {invoicedYear}.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="currency-select" className="mb-2 block">Currency</Label>
                    <div className="flex items-center gap-2">
                      <Select value={invoiceConfig.currency} onValueChange={(c) => setInvoiceConfig(prev => ({...prev, currency: c }))} disabled={!!currentProject?.maxExchangeRate}>
                        <SelectTrigger id="currency-select">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map(c => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => { /* This might be deprecated by auto-fetch */ }} disabled={invoiceConfig.isFetchingRate || invoiceConfig.currency === 'RON' || !!currentProject?.maxExchangeRate}>
                        {invoiceConfig.isFetchingRate ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="theme-select" className="mb-2 block">Invoice Theme</Label>
                    <Select value={invoiceConfig.invoiceTheme} onValueChange={(value) => setInvoiceConfig(prev => ({ ...prev, invoiceTheme: value as InvoiceTheme}))}>
                      <SelectTrigger id="theme-select">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-6 rounded border flex overflow-hidden">
                              <div className="w-1/2" style={{ backgroundColor: themeStyles[invoiceConfig.invoiceTheme].accentColor }} />
                              <div className="w-1/2" style={{ backgroundColor: themeStyles[invoiceConfig.invoiceTheme].tableHeaderBgColor }} />
                            </div>
                            {invoiceConfig.invoiceTheme}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceThemes.map(theme => (
                          <SelectItem key={theme} value={theme}>
                            <div className="flex items-center gap-3">
                              <div className="h-4 w-6 rounded border flex overflow-hidden">
                                <div className="w-1/2" style={{ backgroundColor: themeStyles[theme].accentColor }} />
                                <div className="w-1/2" style={{ backgroundColor: themeStyles[theme].tableHeaderBgColor }} />
                              </div>
                              {theme}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {invoiceData && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className='font-medium text-foreground'>{invoiceData.currency} {invoiceData.subtotal.toFixed(2)}</span>
                    </div>
                    {invoiceData.hasVat && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT ({((invoiceData.vatRate || 0) * 100).toFixed(0)}%):</span>
                        <span className='font-medium text-foreground'>{invoiceData.currency} {(invoiceData.vatAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span className="text-foreground">Total:</span>
                      <span className='text-foreground'>{invoiceData.currency} {invoiceData.total.toFixed(2)}</span>
                    </div>

                    {ronBreakdown && (
                        <div className='pt-2 mt-2 border-t space-y-1'>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal (RON):</span>
                                <span className='font-medium text-foreground'>{ronBreakdown.subtotal} RON</span>
                            </div>
                            {invoiceData.hasVat && (
                              <div className="flex justify-between">
                                  <span className="text-muted-foreground">VAT (RON):</span>
                                  <span className='font-medium text-foreground'>{ronBreakdown.vat} RON</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold">
                                <span className="text-foreground">Total (RON):</span>
                                <span className='text-foreground'>{ronBreakdown.total} RON</span>
                            </div>
                             {invoiceConfig.exchangeRateDate && (
                                <p className="text-xs text-muted-foreground pt-1">
                                    {invoiceConfig.usedMaxRate
                                        ? `Using fixed project rate set on ${formatDateWithOrdinal(invoiceConfig.exchangeRateDate)}`
                                        : `Based on BNR rate from ${formatDateWithOrdinal(invoiceConfig.exchangeRateDate)}`}
                                    : 1 {invoiceConfig.currency} = {invoiceConfig.exchangeRate?.toFixed(4)} RON
                                </p>
                            )}
                        </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={buttonsDisabled}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Invoice Preview</DialogTitle>
                  <DialogDescription>
                    Review your invoice before saving or downloading.
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
                  <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Back to Edit</Button>
                  <Button variant="outline" disabled={buttonsDisabled} onClick={handleDownloadPdf}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download PDF
                  </Button>
                  <Button disabled={buttonsDisabled} onClick={handleSaveInvoice}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Invoice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
