
'use client';

import { RevenueChart } from '@/components/reports/revenue-chart';
import { InvoiceStatusChart } from '@/components/reports/invoice-status-chart';
import { InvoicesPerClientChart } from '@/components/reports/invoices-per-client-chart';
import { InvoicesPerProjectChart } from '@/components/reports/invoices-per-project-chart';
import { UnpaidByClientChart } from '@/components/reports/unpaid-by-client-chart';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { Invoice, Project, Timecard, User, Client } from '@/lib/types';
import { collection, query, doc } from 'firebase/firestore';
import { StatCard } from '@/components/dashboard/stat-card';
import { Banknote, Landmark } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { VatChart } from '@/components/reports/vat-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, parseISO } from 'date-fns';
import { HoursPerProjectChart } from '@/components/reports/hours-per-project-chart';
import { VatChartYearly } from '@/components/reports/vat-chart-yearly';

export default function ReportsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('RON');

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: myCompany } = useDoc<User>(userDocRef, `users/${user?.uid}`);

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
    () => (firestore && user ? query(collection(firestore, `users/${user.uid}/timecards`)) : null),
    [firestore, user]
  );
  const { data: timecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);

  const allInvoices = invoices || [];
  const allTimecards = timecards || [];

  const availableYears = useMemo(() => {
    if (allInvoices.length === 0) return [];
    const years = new Set(allInvoices.map(inv => getYear(parseISO(inv.date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [allInvoices]);
  
  const availableCurrencies = useMemo(() => {
      const currencySet = new Set<string>();
      // Always include RON
      currencySet.add('RON');
      // Add all currencies from clients' preferredCompanyIbanCurrency
      clients?.forEach(client => {
        if (client.preferredCompanyIbanCurrency) {
          currencySet.add(client.preferredCompanyIbanCurrency);
        }
      });
      return Array.from(currencySet).sort();
  }, [clients]);

   useEffect(() => {
    if (availableYears.length > 0 && selectedYear === 'all') {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const clientsById = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);
  const projectsById = useMemo(() => new Map(projects?.map(p => [p.id, p])), [projects]);

  const filteredInvoicesByDate = useMemo(() => {
    if (selectedYear === 'all') return allInvoices;
    return allInvoices.filter(inv => getYear(parseISO(inv.date)) === selectedYear);
  }, [allInvoices, selectedYear]);


  const filteredInvoices = useMemo(() => {
    if (!clients || !projects) return [];

    return filteredInvoicesByDate.filter(inv => {
        // Use clientId from invoice (matches dashboard logic)
        const client = clientsById.get(inv.clientId);
        if (!client || !client.preferredCompanyIbanCurrency) return false;

        const groupCurrency = client.preferredCompanyIbanCurrency;
        return groupCurrency === selectedCurrency;
    });
  }, [filteredInvoicesByDate, selectedCurrency, clientsById, clients, projects]);


  const filteredTimecards = useMemo(() => {
    if (allTimecards.length === 0) return [];
    if (selectedYear === 'all') return allTimecards;
    return allTimecards.filter(tc => tc.startDate && getYear(parseISO(tc.startDate)) === selectedYear);
  }, [allTimecards, selectedYear]);


  const vatStats = useMemo(() => {
    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid');
    const unpaidInvoices = filteredInvoices.filter(inv => inv.status !== 'Paid');
    
    const calculateVatInCurrency = (invoices: Invoice[], currency: string) => {
        return invoices.reduce((acc, inv) => {
            const vatAmount = inv.vatAmount || 0;
            if (currency === 'RON') {
                const exchangeRate = inv.currency === 'RON' ? 1 : (inv.exchangeRate || 1);
                return acc + (vatAmount * exchangeRate);
            }
            // For other currencies, only sum if the invoice is in that currency
            if (inv.currency === currency) {
                return acc + vatAmount;
            }
            return acc;
        }, 0);
    };

    const totalVatCollected = calculateVatInCurrency(paidInvoices, selectedCurrency);
    const outstandingVat = calculateVatInCurrency(unpaidInvoices, selectedCurrency);
    
    return { totalVatCollected, outstandingVat };

  }, [filteredInvoices, selectedCurrency]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(amount);
  }

  const handleYearChange = (yearString: string) => {
    const year = yearString === 'all' ? 'all' : parseInt(yearString, 10);
    setSelectedYear(year);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Analyze your performance with detailed reports and charts.
          </p>
        </div>
        <div className="flex items-center gap-4">
            {availableCurrencies.length > 0 && (
                <div className="w-36">
                    <Select onValueChange={setSelectedCurrency} value={selectedCurrency}>
                        <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
                        <SelectContent>
                            {availableCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {availableYears.length > 0 && (
            <div className="w-36">
                <Select onValueChange={handleYearChange} value={String(selectedYear)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    {availableYears.map(year => (
                    <SelectItem key={year} value={String(year)}>
                        {year}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart invoices={filteredInvoices} selectedCurrency={selectedCurrency} />
        <InvoiceStatusChart invoices={filteredInvoices} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title={`Total VAT Collected (${selectedCurrency})`}
            value={formatCurrency(vatStats.totalVatCollected)}
            icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
            description={`For ${selectedYear === 'all' ? 'all time' : selectedYear} from paid invoices`}
          />
          <StatCard
            title={`Outstanding VAT (${selectedCurrency})`}
            value={formatCurrency(vatStats.outstandingVat)}
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            description={`For ${selectedYear === 'all' ? 'all time' : selectedYear} from created & sent invoices`}
            valueClassName={vatStats.outstandingVat > 0 ? 'text-destructive' : ''}
          />
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VatChart invoices={filteredInvoices} selectedYear={selectedYear} selectedCurrency={selectedCurrency} />
        <VatChartYearly invoices={allInvoices} selectedCurrency={selectedCurrency} />
        <HoursPerProjectChart timecards={filteredTimecards || []} projects={projects || []} />
        <InvoicesPerClientChart invoices={filteredInvoices || []} />
        <InvoicesPerProjectChart invoices={filteredInvoices || []} projects={projects || []} />
        <UnpaidByClientChart invoices={filteredInvoices || []} selectedCurrency={selectedCurrency} />
      </div>
    </div>
  );
}
