
'use client';

import { useMemo, useState } from 'react';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Invoice, Client, Project, Timecard } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { DataImport } from '@/components/data/data-import';
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, parseISO, format, getMonth } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ExportMenu } from '@/components/data/export-menu';

const currencySymbols: { [key: string]: string } = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
const invoiceStatuses = ['Created', 'Sent', 'Paid'];

type SortConfig = {
  key: keyof Invoice;
  direction: 'ascending' | 'descending';
} | null;

export default function InvoicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedClientId, setSelectedClientId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

  const clientsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/clients`) : null),
    [firestore, user]
  );
  const { data: clients } = useCollection<Client>(clientsQuery, `users/${user?.uid}/clients`);

  const projectsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/projects`) : null),
    [firestore, user]
  );
  const { data: projects } = useCollection<Project>(projectsQuery, `users/${user?.uid}/projects`);

  const timecardsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/timecards`) : null),
    [firestore, user]
  );
  const { data: timecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId('all'); // Reset project when client changes
  };
  
  const availableYears = useMemo(() => {
    if (!invoices) return [];
    const years = new Set(invoices.map(inv => getYear(parseISO(inv.date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  const projectsForClient = useMemo(() => {
    if (selectedClientId === 'all' || !projects) return projects || [];
    return projects.filter(p => p.clientId === selectedClientId);
  }, [selectedClientId, projects]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(invoice => {
      const invoiceDate = parseISO(invoice.date);
      const yearMatch = selectedYear === 'all' || getYear(invoiceDate) === Number(selectedYear);
      const monthMatch = selectedMonth === 'all' || getMonth(invoiceDate) === Number(selectedMonth);
      const statusMatch = selectedStatus === 'all' || invoice.status === selectedStatus;
      const projectForInvoice = projects?.find(p => p.id === invoice.projectId);
      const clientMatch = selectedClientId === 'all' || (projectForInvoice && projectForInvoice.clientId === selectedClientId);
      const projectMatch = selectedProjectId === 'all' || invoice.projectId === selectedProjectId;
      return yearMatch && monthMatch && statusMatch && clientMatch && projectMatch;
    });
  }, [invoices, projects, selectedClientId, selectedProjectId, selectedYear, selectedMonth, selectedStatus]);
  
  const sortedInvoices = useMemo(() => {
    if (!sortConfig) {
      return [...filteredInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return [...filteredInvoices].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortConfig.key === 'date' || sortConfig.key === 'dueDate') {
            comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else {
            comparison = aValue.localeCompare(bValue);
        }
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      
      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });
  }, [filteredInvoices, sortConfig]);

  const selectedInvoices = useMemo(() => {
    return sortedInvoices.filter(inv => selectedRows[inv.id]);
  }, [sortedInvoices, selectedRows]);

  const isFiltered = useMemo(() => {
    return selectedClientId !== 'all' || selectedProjectId !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || selectedStatus !== 'all';
  }, [selectedClientId, selectedProjectId, selectedYear, selectedMonth, selectedStatus]);

  const exportableUiData = useMemo(() => {
    const invoicesToExport = selectedInvoices.length > 0 ? selectedInvoices : sortedInvoices;
    return invoicesToExport.map(inv => ({
      'Invoice #': inv.invoiceNumber,
      'Client': inv.clientName,
      'Project': inv.projectName,
      'Date': format(new Date(inv.date), 'MMM d, yyyy'),
      'Subtotal': `${currencySymbols[inv.currency] || inv.currency}${inv.subtotal.toFixed(2)}`,
      ...(inv.vatAmount && inv.vatAmount > 0 ? { 'VAT': `${currencySymbols[inv.currency] || inv.currency}${inv.vatAmount.toFixed(2)}` } : {}),
      'Total': `${currencySymbols[inv.currency] || inv.currency}${inv.total.toFixed(2)}`,
      ...(inv.totalRon ? { 'Total (RON)': `${inv.totalRon.toFixed(2)} RON` } : {}),
      'Status': inv.status,
      'Note': inv.note || '',
    }));
  }, [selectedInvoices, sortedInvoices]);
  
  const exportableRawData = useMemo(() => {
    const invoicesToExport = selectedInvoices.length > 0 ? selectedInvoices : sortedInvoices;
    return { invoices: invoicesToExport };
  }, [selectedInvoices, sortedInvoices]);

  const selectedInvoicesTotals = useMemo(() => {
    if (selectedInvoices.length === 0) return {};

    const totals = selectedInvoices.reduce((acc, inv) => {
        // Original currency totals
        if (!acc.currencies[inv.currency]) {
            acc.currencies[inv.currency] = 0;
        }
        acc.currencies[inv.currency] += inv.total;

        // RON total for summary display
        const totalInRon = inv.totalRon ?? (inv.currency === 'RON' ? inv.total : 0);
        if (totalInRon > 0) {
            acc.totalRonForSummary += totalInRon;
        }

        return acc;
    }, { currencies: {} as Record<string, number>, totalRonForSummary: 0 });

    const finalTotals: Record<string, number> = { ...totals.currencies };
    if (totals.totalRonForSummary > 0) {
        finalTotals['RON_total_for_summary'] = totals.totalRonForSummary;
    }
    
    return finalTotals;
  }, [selectedInvoices]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your invoices and billing.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <ExportMenu 
            uiData={exportableUiData} 
            rawData={exportableRawData}
            filename='invoices'
            buttonLabel={selectedInvoices.length > 0 ? `Export ${selectedInvoices.length} Selected` : 'Export All Filtered'}
          />
          <DataImport 
            allowedCollections={['invoices', 'timecards', 'projects', 'clients']}
            buttonLabel="Import Invoices"
            defaultImportMode="merge"
            allowModeSelection={true}
            existingData={{ invoices: invoices || [], timecards: timecards || [], projects: projects || [], clients: clients || [] }}
          />
          <CreateInvoiceDialog />
        </div>
      </div>
      <Card>
        <CardContent className='p-4'>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Filter by Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={selectedClientId === 'all' && projectsForClient.length === 0}>
                <SelectTrigger><SelectValue placeholder="Filter by Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projectsForClient?.map(p => <SelectItem key={p.id} value={p.id}>{p.name.trim()}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue placeholder="Filter by Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue placeholder="Filter by Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue placeholder="Filter by Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {invoiceStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
        </CardContent>
      </Card>
      <InvoiceList 
        invoices={sortedInvoices || []} 
        clients={clients || []}
        projects={projects || []}
        isFiltered={isFiltered}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        sortConfig={sortConfig}
        onSort={setSortConfig}
        selectedInvoicesTotals={selectedInvoicesTotals}
      />
    </div>
  );
}
