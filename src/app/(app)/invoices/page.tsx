
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Invoice, Client, Project } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { DataExport } from '@/components/data/data-export';
import { DataImport } from '@/components/data/data-import';
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

export default function InvoicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

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
      const yearMatch = selectedYear === 'all' || getYear(parseISO(invoice.date)) === Number(selectedYear);
      const projectForInvoice = projects?.find(p => p.id === invoice.projectId);
      const clientMatch = selectedClientId === 'all' || (projectForInvoice && projectForInvoice.clientId === selectedClientId);
      const projectMatch = selectedProjectId === 'all' || invoice.projectId === selectedProjectId;
      return yearMatch && clientMatch && projectMatch;
    });
  }, [invoices, projects, selectedClientId, selectedProjectId, selectedYear]);

  useEffect(() => {
    setSelectedProjectId('all');
  }, [selectedClientId]);
  
  const exportableData = useMemo(() => {
    return { invoices: filteredInvoices || [] };
  }, [filteredInvoices]);


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
          <DataExport 
            data={exportableData} 
            fileName='invoices_export.json' 
            buttonLabel="Export Filtered"
          />
          <DataImport 
            allowedCollections={['invoices']}
            buttonLabel="Import Invoices"
            defaultImportMode="merge"
            allowModeSelection={true}
            existingData={{ invoices: invoices || [] }}
          />
          <CreateInvoiceDialog />
        </div>
      </div>
      <Card>
        <CardContent className='p-4'>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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
                  {projectsForClient?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue placeholder="Filter by Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
        </CardContent>
      </Card>
      <InvoiceList invoices={filteredInvoices || []} />
    </div>
  );
}
