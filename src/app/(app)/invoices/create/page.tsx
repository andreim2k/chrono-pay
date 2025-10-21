'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, getDate, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Save, Loader2, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Client, Invoice, Project, InvoiceTheme } from '@/lib/types';
import { getExchangeRate } from '@/ai/flows/get-exchange-rate';
import { useCollection, useFirestore, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { InvoiceHtmlPreview, themeStyles } from '@/components/invoices/invoice-html-preview';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

export default function CreateInvoicePage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dailyRate, setDailyRate] = useState<number | ''>(500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [daysWorked, setDaysWorked] = useState<number | ''>(0);
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
  
  const previewRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const invoiceCreationDate = useMemo(() => new Date(), []);


  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clients } = useCollection<Client>(clientsQuery);
  
  const invoicesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'invoices') : null),
    [firestore]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery);

  const projectsForClientQuery = useMemoFirebase(
    () => {
        if (!firestore || !selectedClientId) return null;
        return query(collection(firestore, 'projects'), where('clientId', '==', selectedClientId))
    },
    [firestore, selectedClientId]
  );
  const { data: projectsForClient } = useCollection<Project>(projectsForClientQuery);


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
    }
  }, [selectedProject]);

  const myCompany = useMemo(() => {
    return clients?.find(c => c.id === 'my-company-details') || null;
  }, [clients]);

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

  useEffect(() => {
    if (selectedClient) {
      setCurrency(selectedClient.currency || 'EUR');
      
      if (selectedClient.maxExchangeRate && selectedClient.maxExchangeRateDate) {
        setExchangeRate(selectedClient.maxExchangeRate);
        setExchangeRateDate(selectedClient.maxExchangeRateDate);
        setUsedMaxRate(true);
        toast({
            title: 'Client Rate Applied',
            description: `Using fixed client exchange rate of ${selectedClient.maxExchangeRate.toFixed(4)} RON.`,
        });
      } else if (selectedClient.currency !== 'RON') {
        fetchExchangeRate(selectedClient.currency || 'EUR');
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
  }, [selectedClient, fetchExchangeRate, toast]);
  
  const generateInvoiceNumber = (client: Client, allInvoices: Invoice[]) => {
    const prefix = client.invoiceNumberPrefix || client.name.split(' ').map(word => word[0]).join('').toUpperCase();
    const clientInvoicesWithPrefix = allInvoices.filter(inv => inv.clientName === client.name && inv.invoiceNumber.startsWith(prefix));
    const nextInvoiceNum = clientInvoicesWithPrefix.length + 1;
    const paddedNumber = String(nextInvoiceNum).padStart(3, '0');
    return `${prefix}${paddedNumber}`;
  };

  const invoiceData: Omit<Invoice, 'id'> | null = useMemo(() => {
    if (!selectedClient || !selectedProject || !daysWorked || !dailyRate || !myCompany || !invoices) return null;

    const subtotal = daysWorked * dailyRate;
    const vatAmount = selectedClient.hasVat ? subtotal * (myCompany?.vatRate || 0) : 0;
    const total = subtotal + vatAmount;
    const totalRon = exchangeRate ? total * exchangeRate : undefined;
    const servicePeriod = new Date(invoicedYear, invoicedMonth);


    return {
      invoiceNumber: generateInvoiceNumber(selectedClient, invoices),
      companyName: myCompany.name,
      companyAddress: myCompany.address,
      companyVat: myCompany.vat,
      companyIban: myCompany.iban,
      companyBankName: myCompany.bankName,
      companySwift: myCompany.swift,
      clientName: selectedClient.name,
      clientAddress: selectedClient.address,
      clientVat: selectedClient.vat,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      date: format(invoiceCreationDate, 'yyyy-MM-dd'),
      currency,
      language: selectedClient.language || 'English',
      items: [
        {
          description: `${selectedProject.name}: Consultancy services for ${format(servicePeriod, 'MMMM yyyy')}`,
          quantity: daysWorked,
          unit: 'days',
          rate: dailyRate,
          amount: subtotal,
        },
      ],
      subtotal: subtotal,
      vatAmount: vatAmount,
      total,
      status: 'Created' as const,
      totalRon,
      exchangeRate,
      exchangeRateDate,
      usedMaxExchangeRate: usedMaxRate,
      vatRate: selectedClient.hasVat ? myCompany.vatRate : undefined,
      theme: invoiceTheme,
    };
  }, [selectedClient, selectedProject, dailyRate, invoices, daysWorked, currency, exchangeRate, exchangeRateDate, myCompany, invoicedMonth, invoicedYear, invoiceCreationDate, usedMaxRate, invoiceTheme]);
  
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

  const handleSaveInvoice = () => {
    if (!invoiceData || !firestore) return;
    const invoicesCol = collection(firestore, `invoices`);
    addDocumentNonBlocking(invoicesCol, invoiceData);
    toast({
      title: 'Invoice Saved',
      description: `Invoice ${invoiceData.invoiceNumber} has been saved.`,
    });
    router.push('/invoices');
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    // Don't auto-fetch if client has a fixed rate
    if (selectedClient && !selectedClient.maxExchangeRate) {
        fetchExchangeRate(newCurrency);
    }
  }

  const buttonsDisabled = !invoiceData || isGenerating || isFetchingRate;
  const availableClients = useMemo(() => clients?.filter(c => c.id !== 'my-company-details') || [], [clients]);

  const totalRonDisplay = useMemo(() => {
    if (invoiceData?.total && exchangeRate && currency !== 'RON') {
        return (invoiceData.total * exchangeRate).toFixed(2);
    }
    return null;
  }, [invoiceData, exchangeRate, currency]);

  return (
    <>
      <div style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '800px', // A good base width for high-quality capture
      }}>
        {invoiceData && <div ref={previewRef}><InvoiceHtmlPreview invoice={invoiceData} /></div>}
      </div>

      <div className="space-y-6">
         <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 -mt-4 px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create Invoice</h1>
                <p className="text-muted-foreground">
                Select a client and enter details to generate a new invoice.
                </p>
            </div>
            </div>
        </div>
        <div className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>Select a client and project, then enter the billable days.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="space-y-2">
                        <Label htmlFor="days-worked" className="mb-2 block">Days Worked</Label>
                        <Input
                          id="days-worked"
                          type="number"
                          value={daysWorked}
                          onChange={(e) => setDaysWorked(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          onBlur={(e) => {
                              if (e.target.value === '') {
                                  setDaysWorked(0);
                              }
                          }}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="daily-rate" className="mb-2 block">Daily Rate</Label>
                        <Input
                          id="daily-rate"
                          type="number"
                          value={dailyRate}
                          onChange={(e) => setDailyRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                           onBlur={(e) => {
                              if (e.target.value === '') {
                                  setDailyRate(0);
                              }
                          }}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency-select" className="mb-2 block">Currency</Label>
                        <div className="flex items-center gap-2">
                            <Select value={currency} onValueChange={handleCurrencyChange} disabled={!!selectedClient?.maxExchangeRate}>
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
                            <Button variant="ghost" size="icon" onClick={() => fetchExchangeRate(currency)} disabled={isFetchingRate || currency === 'RON' || !!selectedClient?.maxExchangeRate}>
                                {isFetchingRate ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-1">
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
                                        {usedMaxRate ? `Using fixed client rate set on ${formatDateWithOrdinal(exchangeRateDate)}` : `Based on BNR rate from ${formatDateWithOrdinal(exchangeRateDate)}`}: 1 {currency} = {exchangeRate?.toFixed(4)} RON
                                        </p>
                                    }
                                </div>
                            )}
                        </div>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter>
                 <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!invoiceData}>
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
                             <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Cancel</Button>
                            <Button variant="outline" disabled={buttonsDisabled} onClick={handleDownloadPdf}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Download PDF
                            </Button>
                            <Button disabled={buttonsDisabled} onClick={handleSaveInvoice}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Invoice
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
        </div>
      </div>
    </>
  );
}
