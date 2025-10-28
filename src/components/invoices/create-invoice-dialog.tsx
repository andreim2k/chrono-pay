
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, getDate, subMonths, getYear, getMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Save, Loader2, RefreshCw, Eye, PlusCircle, Hourglass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Client, Invoice, Project, InvoiceTheme, User, Timecard } from '@/lib/types';
import { getExchangeRate } from '@/ai/flows/get-exchange-rate';
import { useCollection, useFirestore, addDocumentNonBlocking, useMemoFirebase, useUser, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { InvoiceHtmlPreview, themeStyles } from '@/components/invoices/invoice-html-preview';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '../ui/switch';
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

type GenerationMode = 'manual' | 'timecards';

export function CreateInvoiceDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [manualQuantity, setManualQuantity] = useState<number | ''>(0);
  const [currency, setCurrency] = useState('EUR');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>();
  const [exchangeRateDate, setExchangeRateDate] = useState<string | undefined>();
  const [usedMaxRate, setUsedMaxRate] = useState(false);
  const lastMonth = subMonths(new Date(), 1);
  const [invoicedMonth, setInvoicedMonth] = useState<number>(lastMonth.getMonth());
  const [invoicedYear, setInvoicedYear] = useState<number>(lastMonth.getFullYear());
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [invoiceTheme, setInvoiceTheme] = useState<InvoiceTheme>('Classic');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('manual');
  const [selectedTimecards, setSelectedTimecards] = useState<Record<string, boolean>>({});

  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const invoiceCreationDate = useMemo(() => new Date(), []);
  
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
        where('status', '==', 'Unbilled')
    );
  }, [firestore, user, selectedProjectId]);
  const { data: unbilledTimecards } = useCollection<Timecard>(unbilledTimecardsQuery, `users/${user?.uid}/timecards`);

  const filteredTimecards = useMemo(() => {
    if (!unbilledTimecards) return [];
    return unbilledTimecards.filter(tc => {
        const tcDate = new Date(tc.date);
        return getYear(tcDate) === invoicedYear && getMonth(tcDate) === invoicedMonth;
    });
  }, [unbilledTimecards, invoicedYear, invoicedMonth]);


  const handleDownloadPdf = async () => {
    if (!previewRef.current || !invoiceData) return;

    setIsGenerating(true);
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
    setIsGenerating(false);
  }

  const selectedClient = useMemo(() => {
    return clients?.find(c => c.id === selectedClientId) || null;
  }, [selectedClientId, clients]);

  const selectedProject = useMemo(() => {
    return projectsForClient?.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projectsForClient]);

  useEffect(() => {
    if (selectedProject) {
        setInvoiceTheme(selectedProject.invoiceTheme || 'Classic');
        setCurrency(selectedProject.currency || 'EUR');
        
        if (selectedProject.maxExchangeRate && selectedProject.maxExchangeRateDate) {
          setExchangeRate(selectedProject.maxExchangeRate);
          setExchangeRateDate(selectedProject.maxExchangeRateDate);
          setUsedMaxRate(true);
          toast({
              title: 'Fixed Exchange Rate Applied',
              description: `Using fixed project exchange rate of ${selectedProject.maxExchangeRate.toFixed(4)} RON.`,
          });
        } else if (selectedProject.currency !== 'RON') {
          fetchExchangeRate(selectedProject.currency || 'EUR');
        } else {
          setExchangeRate(1);
          setExchangeRateDate(new Date().toISOString().split('T')[0]);
          setUsedMaxRate(false);
        }
    } else {
        setExchangeRate(undefined);
        setExchangeRateDate(undefined);
        setUsedMaxRate(false);
    }
  }, [selectedProject, toast]);

  // Debounced toast for rate
  useEffect(() => {
    if (typeof manualQuantity === 'number' && manualQuantity > 0 && selectedProject?.rate) {
      const handler = setTimeout(() => {
        toast({
          title: 'Project Rate Applied',
          description: `Using rate: ${selectedProject.rate} ${selectedProject.currency || 'EUR'} / ${selectedProject.rateType || 'day'}`,
        });
      }, 1000);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [manualQuantity, selectedProject, toast]);



  const fetchExchangeRate = useCallback(async (currentCurrency: string) => {
    if (currentCurrency === 'RON' || !currentCurrency) {
      setExchangeRate(1);
      setExchangeRateDate(new Date().toISOString().split('T')[0]);
      setUsedMaxRate(false);
      return;
    }
    setIsFetchingRate(true);
    setUsedMaxRate(false);
    try {
      const result = await getExchangeRate({ currency: currentCurrency });
      const { rate, date } = result;
      
      if (rate && date) {
        setExchangeRate(rate);
        setExchangeRateDate(date);
        toast({
            title: 'Exchange Rate Fetched',
            description: `BNR rate for ${formatDateWithOrdinal(date)}: 1 ${currentCurrency} = ${rate?.toFixed(4)} RON.`,
        });
      } else {
        setExchangeRate(undefined);
        setExchangeRateDate(undefined);
        toast({
            variant: 'destructive',
            title: 'Error Fetching Rate',
            description: 'Could not fetch the exchange rate from BNR.',
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setExchangeRate(undefined);
      setExchangeRateDate(undefined);
      toast({
        variant: 'destructive',
        title: 'Error Fetching Rate',
        description: 'Something went wrong while fetching the exchange rate.',
      });
    } finally {
      setIsFetchingRate(false);
    }
  }, [toast]);

  useEffect(() => {
    setSelectedProjectId(null); // Reset project when client changes
  }, [selectedClientId])
  
  const generateInvoiceNumber = (project: Project, allInvoices: Invoice[]) => {
    const prefix = project.invoiceNumberPrefix || project.name.split(' ').map(word => word[0]).join('').toUpperCase();
    const projectInvoicesWithPrefix = allInvoices.filter(inv => inv.projectId === project.id && inv.invoiceNumber.startsWith(prefix));
    const nextInvoiceNum = projectInvoicesWithPrefix.length + 1;
    const paddedNumber = String(nextInvoiceNum).padStart(3, '0');
    return `${prefix}${paddedNumber}`;
  };

  const invoiceData: Omit<Invoice, 'id'> | null = useMemo(() => {
    if (!selectedClient || !selectedProject || !myCompany || !invoices ) return null;

    let items: Invoice['items'], subtotal: number, billedTimecardIds: string[] = [];
    const servicePeriod = new Date(invoicedYear, invoicedMonth);
    const description = `${selectedProject.name}: Consultancy services for ${format(servicePeriod, 'MMMM yyyy')}`;

    if (generationMode === 'timecards') {
        const totalHours = filteredTimecards.reduce((acc, tc) => selectedTimecards[tc.id] ? acc + tc.hours : acc, 0);
        billedTimecardIds = filteredTimecards.filter(tc => selectedTimecards[tc.id]).map(tc => tc.id);
        
        const currentRate = selectedProject.rate || 0;
        if (billedTimecardIds.length === 0 || currentRate === 0) return null;
        
        let quantity: number;
        let unit: string;
        
        if (selectedProject.rateType === 'hourly') {
            quantity = totalHours;
            unit = 'hours';
            subtotal = totalHours * currentRate;
        } else { // daily
            quantity = totalHours / 8; // Assuming 8 hours/day
            unit = 'days';
            subtotal = quantity * currentRate;
        }
        
        items = [{
          description,
          quantity,
          unit,
          rate: currentRate,
          amount: subtotal,
        }];

    } else { // manual mode
        const projectRate = selectedProject.rate ?? 0;
        if (!manualQuantity || !projectRate) return null;
        subtotal = manualQuantity * projectRate;
        items = [{
          description,
          quantity: manualQuantity,
          unit: selectedProject.rateType === 'hourly' ? 'hours' : 'days',
          rate: projectRate,
          amount: subtotal,
        }];
    }

    const vatAmount = selectedProject.hasVat ? subtotal * (myCompany?.companyVatRate || 0) : 0;
    const total = subtotal + vatAmount;
    const totalRon = exchangeRate ? total * exchangeRate : undefined;
    
    const data: Omit<Invoice, 'id'> & { vatRate?: number } = {
      invoiceNumber: generateInvoiceNumber(selectedProject, invoices),
      companyName: myCompany.companyName!,
      companyAddress: myCompany.companyAddress!,
      companyVat: myCompany.companyVat!,
      companyIban: myCompany.companyIban,
      companyBankName: myCompany.companyBankName,
      companySwift: myCompany.companySwift,
      clientName: selectedClient.name,
      clientAddress: selectedClient.address,
      clientVat: selectedClient.vat,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      date: format(invoiceCreationDate, 'yyyy-MM-dd'),
      currency,
      language: selectedClient.language || 'English',
      items,
      subtotal,
      vatAmount,
      total,
      status: 'Created' as const,
      totalRon,
      exchangeRate,
      exchangeRateDate,
      usedMaxExchangeRate: usedMaxRate,
      theme: invoiceTheme,
      billedTimecardIds,
    };
    
    if (selectedProject.hasVat && myCompany.companyVatRate) {
        data.vatRate = myCompany.companyVatRate;
    }

    return data;
  }, [
      selectedClient, selectedProject, invoices, manualQuantity, currency, exchangeRate, 
      exchangeRateDate, myCompany, invoicedMonth, invoicedYear, invoiceCreationDate, usedMaxRate, 
      invoiceTheme, generationMode, filteredTimecards, selectedTimecards
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
    const dataToSave = { ...invoiceData };
    if (dataToSave.vatRate === undefined) {
      delete (dataToSave as Partial<typeof dataToSave>).vatRate;
    }
    batch.set(newInvoiceRef, dataToSave);

    // 2. Update status of billed timecards
    if (invoiceData.billedTimecardIds && invoiceData.billedTimecardIds.length > 0) {
      invoiceData.billedTimecardIds.forEach(timecardId => {
        const timecardRef = doc(firestore, `users/${user.uid}/timecards`, timecardId);
        batch.update(timecardRef, {
          status: 'Billed',
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

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    if (selectedProject && !selectedProject.maxExchangeRate) {
        fetchExchangeRate(newCurrency);
    }
  }
  
  // Reset state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
        setSelectedClientId(null);
        setSelectedProjectId(null);
        setManualQuantity(0);
        setGenerationMode('manual');
        setSelectedTimecards({});
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

  const buttonsDisabled = !invoiceData || isGenerating || isFetchingRate;
  const availableClients = clients || [];
  
  const totalHoursFromTimecards = useMemo(() => {
    if (generationMode !== 'timecards' || !filteredTimecards) return 0;
    return filteredTimecards.reduce((acc, tc) => selectedTimecards[tc.id] ? acc + tc.hours : acc, 0);
  }, [generationMode, filteredTimecards, selectedTimecards]);


  const totalRonDisplay = useMemo(() => {
    if (invoiceData?.total && exchangeRate && currency !== 'RON') {
        return (invoiceData.total * exchangeRate).toFixed(2);
    }
    return null;
  }, [invoiceData, exchangeRate, currency]);

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
              Select a client and enter details to generate a new invoice.
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
                  <Select onValueChange={setSelectedProjectId} value={selectedProjectId || ''} >
                    <SelectTrigger id="project-select">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsForClient?.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
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
                <div className="flex items-center space-x-2 rounded-lg border p-3 shadow-sm">
                  <Switch id="generation-mode" checked={generationMode === 'timecards'} onCheckedChange={(checked) => setGenerationMode(checked ? 'timecards' : 'manual')} />
                  <Label htmlFor="generation-mode">Generate from Unbilled Timecards</Label>
                </div>

                {generationMode === 'manual' ? (
                  <div className="grid grid-cols-1 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="manual-quantity" className="mb-2 block">
                        Quantity ({selectedProject?.rateType === 'hourly' ? 'Hours' : 'Days'})
                      </Label>
                      <Input
                        id="manual-quantity"
                        type="number"
                        value={manualQuantity}
                        onChange={(e) => setManualQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setManualQuantity(0);
                          }
                        }}
                        min="0"
                        placeholder={`e.g., 20 ${selectedProject?.rateType === 'hourly' ? 'hours' : 'days'}`}
                      />
                    </div>
                  </div>
                ) : (
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
                        <CardTitle className='text-base'>Unbilled Timecards</CardTitle>
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
                                      <p className='font-medium'>{format(new Date(tc.date), 'MMM d, yyyy')}</p>
                                      <p className='text-xs text-muted-foreground'>{tc.description || 'No description'}</p>
                                    </div>
                                  </div>
                                  <Badge variant='outline'>{tc.hours}h</Badge>
                                </div>
                              ))
                            ) : (
                              <div className='text-center text-sm text-muted-foreground py-10'>
                                No unbilled time for this project in {months[invoicedMonth].label} {invoicedYear}.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="currency-select" className="mb-2 block">Currency</Label>
                    <div className="flex items-center gap-2">
                      <Select value={currency} onValueChange={handleCurrencyChange} disabled={!!selectedProject?.maxExchangeRate}>
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
                      <Button variant="ghost" size="icon" onClick={() => fetchExchangeRate(currency)} disabled={isFetchingRate || currency === 'RON' || !!selectedProject?.maxExchangeRate}>
                        {isFetchingRate ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="theme-select" className="mb-2 block">Invoice Theme</Label>
                    <Select value={invoiceTheme} onValueChange={(value) => setInvoiceTheme(value as InvoiceTheme)}>
                      <SelectTrigger id="theme-select">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-8 rounded-sm border flex overflow-hidden">
                              <div className="w-1/3" style={{ backgroundColor: themeStyles[invoiceTheme].accentColor }} />
                              <div className="w-2/3" style={{ backgroundColor: themeStyles[invoiceTheme].tableHeaderBgColor }} />
                            </div>
                            {invoiceTheme}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceThemes.map(theme => (
                          <SelectItem key={theme} value={theme}>
                            <div className="flex items-center gap-3">
                              <div className="h-5 w-8 rounded-sm border flex overflow-hidden">
                                <div className="w-1/3" style={{ backgroundColor: themeStyles[theme].accentColor }} />
                                <div className="w-2/3" style={{ backgroundColor: themeStyles[theme].tableHeaderBgColor }} />
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
                    {invoiceData.vatAmount && invoiceData.vatAmount > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT ({(invoiceData.vatRate! * 100).toFixed(0)}%):</span>
                        <span className='font-medium text-foreground'>{invoiceData.currency} {invoiceData.vatAmount.toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-bold">
                      <span className="text-foreground">Total:</span>
                      <span className='text-foreground'>{invoiceData.currency} {invoiceData.total.toFixed(2)}</span>
                    </div>

                    {totalRonDisplay && (
                      <div className='pt-2 mt-2 border-t'>
                        <p className="text-muted-foreground">Total in RON (approx.): <span className='font-bold text-foreground'>{totalRonDisplay} RON</span></p>
                        {exchangeRateDate && <p className="text-xs text-muted-foreground mt-1">
                          {usedMaxRate ? `Using fixed project rate set on ${formatDateWithOrdinal(exchangeRateDate)}` : `Based on BNR rate from ${formatDateWithOrdinal(exchangeRateDate)}`}: 1 {currency} = {exchangeRate?.toFixed(4)} RON
                        </p>
                        }
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
                  Preview & Save
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

    