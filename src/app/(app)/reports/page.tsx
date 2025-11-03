
'use client';

import { RevenueChart } from '@/components/reports/revenue-chart';
import { InvoiceStatusChart } from '@/components/reports/invoice-status-chart';
import { InvoicesPerClientChart } from '@/components/reports/invoices-per-client-chart';
import { InvoicesPerProjectChart } from '@/components/reports/invoices-per-project-chart';
import { UnpaidByClientChart } from '@/components/reports/unpaid-by-client-chart';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Invoice, Project, Timecard } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
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
  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

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

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

   useEffect(() => {
    if (availableYears.length > 0 && selectedYear === 'all') {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filteredInvoices = useMemo(() => {
    if (allInvoices.length === 0) return [];
    if (selectedYear === 'all') return allInvoices;
    return allInvoices.filter(inv => getYear(parseISO(inv.date)) === selectedYear);
  }, [allInvoices, selectedYear]);

  const filteredTimecards = useMemo(() => {
    if (allTimecards.length === 0) return [];
    if (selectedYear === 'all') return allTimecards;
    return allTimecards.filter(tc => tc.startDate && getYear(parseISO(tc.startDate)) === selectedYear);
  }, [allTimecards, selectedYear]);


  const vatStats = useMemo(() => {
    if (!filteredInvoices) {
      return {
        totalVatCollectedRon: 0,
        outstandingVatRon: 0,
      };
    }

    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid');
    const unpaidInvoices = filteredInvoices.filter(inv => inv.status !== 'Paid');

    const totalVatCollectedRon = paidInvoices.reduce((acc, inv) => {
        const vatInRon = (inv.vatAmount || 0) * (inv.exchangeRate || 1);
        return acc + vatInRon;
    }, 0);
    const outstandingVatRon = unpaidInvoices.reduce((acc, inv) => {
        const vatInRon = (inv.vatAmount || 0) * (inv.exchangeRate || 1);
        return acc + vatInRon;
    }, 0);
    
    return {
      totalVatCollectedRon,
      outstandingVatRon,
    };
  }, [filteredInvoices]);

  const formatRon = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
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
        {availableYears.length > 0 && (
          <div className="w-48">
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

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Total VAT Collected (RON)"
            value={formatRon(vatStats.totalVatCollectedRon)}
            icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
            description={`For ${selectedYear === 'all' ? 'all time' : selectedYear} from paid invoices`}
          />
          <StatCard
            title="Outstanding VAT (RON)"
            value={formatRon(vatStats.outstandingVatRon)}
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            description={`For ${selectedYear === 'all' ? 'all time' : selectedYear} from created & sent invoices`}
            valueClassName={vatStats.outstandingVatRon > 0 ? 'text-destructive' : ''}
          />
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart invoices={filteredInvoices || []} />
        <InvoiceStatusChart invoices={filteredInvoices || []} />
        <VatChart invoices={filteredInvoices || []} selectedYear={selectedYear} />
        <VatChartYearly invoices={allInvoices} />
        <HoursPerProjectChart timecards={filteredTimecards || []} projects={projects || []} />
        <InvoicesPerClientChart invoices={filteredInvoices || []} />
        <InvoicesPerProjectChart invoices={filteredInvoices || []} projects={projects || []} />
        <UnpaidByClientChart invoices={filteredInvoices || []} />
      </div>
    </div>
  );
}
