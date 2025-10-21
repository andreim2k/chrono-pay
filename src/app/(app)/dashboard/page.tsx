
'use client';

import { StatCard } from '@/components/dashboard/stat-card';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { useCollection } from '@/firebase';
import { DollarSign, Users, Clock } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';

export default function DashboardPage() {
  const firestore = useFirestore();

  const invoicesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'invoices') : null),
    [firestore]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clients } = useCollection(clientsQuery);

  const dashboardStats = useMemo(() => {
    if (!invoices || !clients) {
      return {
        totalRevenue: '€0.00',
        unpaidAmount: '€0.00',
        unpaidTotal: 0,
        clientCount: 0,
        paidCount: 0,
      };
    }

    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid');
    
    // client count should not include 'my-company-details'
    const clientCount = clients.filter(c => c.id !== 'my-company-details').length;

    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const unpaidTotal = unpaidInvoices.reduce((acc, inv) => acc + inv.total, 0);
    
    // Assuming we can figure out a base currency or convert. For now, we'll just show numbers.
    // The app should probably have a primary currency setting.
    // Let's use EUR as default for now, as it's common in other parts of the app.
    const formatCurrency = (amount: number) => {
        // A more robust solution would handle multiple currencies better
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
    }

    return {
      totalRevenue: formatCurrency(totalRevenue),
      unpaidAmount: formatCurrency(unpaidTotal),
      unpaidTotal,
      clientCount: clientCount,
      paidCount: paidInvoices.length,
    };
  }, [invoices, clients]);

  const recentInvoices = useMemo(() => {
     if (!invoices) return [];
    return [...invoices]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [invoices]);


  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={dashboardStats.totalRevenue}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="Total from paid invoices"
        />
        <StatCard
          title="Clients"
          value={String(dashboardStats.clientCount)}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Total number of clients"
        />
        <StatCard
          title="Unpaid Amount"
          value={dashboardStats.unpaidAmount}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Awaiting payment"
          valueClassName={dashboardStats.unpaidTotal > 0 ? 'text-destructive' : ''}
        />
        <StatCard
          title="Paid Invoices"
          value={String(dashboardStats.paidCount)}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="Total number of paid invoices"
        />
      </div>

      <RecentInvoices invoices={recentInvoices} />

    </div>
  );
}
