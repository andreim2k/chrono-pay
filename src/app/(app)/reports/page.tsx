
'use client';

import { RevenueChart } from '@/components/reports/revenue-chart';
import { InvoiceStatusChart } from '@/components/reports/invoice-status-chart';
import { InvoicesPerClientChart } from '@/components/reports/invoices-per-client-chart';
import { UnpaidByClientChart } from '@/components/reports/unpaid-by-client-chart';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Invoice } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { StatCard } from '@/components/dashboard/stat-card';
import { Banknote, Landmark } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { VatChart } from '@/components/reports/vat-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, parseISO } from 'date-fns';

export default function ReportsPage() {
  const firestore = useFirestore();
  const invoicesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'invoices') : null),
    [firestore]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery);

  const availableYears = useMemo(() => {
    if (!invoices) return [];
    const years = new Set(invoices.map(inv => getYear(parseISO(inv.date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

   useEffect(() => {
    if (availableYears.length > 0 && selectedYear === 'all') {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (selectedYear === 'all') return invoices;
    return invoices.filter(inv => getYear(parseISO(inv.date)) === selectedYear);
  }, [invoices, selectedYear]);


  const vatStats = useMemo(() => {
    if (!filteredInvoices) {
      return {
        totalVatCollected: 0,
        outstandingVat: 0,
      };
    }

    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid');
    const unpaidInvoices = filteredInvoices.filter(inv => inv.status !== 'Paid');

    const totalVatCollected = paidInvoices.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    const outstandingVat = unpaidInvoices.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    
    return {
      totalVatCollected,
      outstandingVat,
    };
  }, [filteredInvoices]);

  // Assuming EUR is the primary currency for this summary. A more complex app would need currency conversion.
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
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
            title="Total VAT Collected"
            value={formatCurrency(vatStats.totalVatCollected)}
            icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
            description={`For ${selectedYear === 'all' ? 'all time' : selectedYear} from paid invoices`}
          />
          <StatCard
            title="Outstanding VAT"
            value={formatCurrency(vatStats.outstandingVat)}
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            description={`For ${selectedYear === 'all' ? 'all time' : selectedYear} from created & sent invoices`}
            valueClassName={vatStats.outstandingVat > 0 ? 'text-destructive' : ''}
          />
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart invoices={filteredInvoices || []} />
        <VatChart invoices={filteredInvoices || []} selectedYear={selectedYear} />
        <InvoiceStatusChart invoices={filteredInvoices || []} />
        <InvoicesPerClientChart invoices={filteredInvoices || []} />
        <UnpaidByClientChart invoices={filteredInvoices || []} />
      </div>
    </div>
  );
}
