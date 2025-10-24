
'use client';

import { StatCard } from '@/components/dashboard/stat-card';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { useCollection, useUser } from '@/firebase';
import { DollarSign, Users, Clock, Banknote, Landmark } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

  const clientsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/clients`) : null),
    [firestore, user]
  );
  const { data: clients } = useCollection(clientsQuery, `users/${user?.uid}/clients`);

  const dashboardStats = useMemo(() => {
    if (!invoices || !clients) {
      return {
        totalRevenue: '€0.00',
        unpaidAmount: '€0.00',
        unpaidTotal: 0,
        clientCount: 0,
        paidCount: 0,
        totalVatCollected: '€0.00',
        outstandingVat: '€0.00',
        outstandingVatTotal: 0,
      };
    }

    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid');
    
    const clientCount = clients.length;

    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const unpaidTotal = unpaidInvoices.reduce((acc, inv) => acc + inv.total, 0);

    const totalVatCollected = paidInvoices.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    const outstandingVatTotal = unpaidInvoices.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    
    // Assuming EUR as the primary currency for dashboard summary, mirroring reports page.
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
    }

    return {
      totalRevenue: formatCurrency(totalRevenue),
      unpaidAmount: formatCurrency(unpaidTotal),
      unpaidTotal,
      clientCount: clientCount,
      paidCount: paidInvoices.length,
      totalVatCollected: formatCurrency(totalVatCollected),
      outstandingVat: formatCurrency(outstandingVatTotal),
      outstandingVatTotal,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="md:col-span-1 lg:col-span-1 xl:col-span-2">
            <StatCard
            title="Total Revenue"
            value={dashboardStats.totalRevenue}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            description="Total from paid invoices"
            />
        </div>
        <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <StatCard
            title="Clients"
            value={String(dashboardStats.clientCount)}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            description="Total number of clients"
            />
        </div>
        <div className="md:col-span-1 lg:col-span-1 xl:col-span-2">
            <StatCard
            title="Unpaid Amount"
            value={dashboardStats.unpaidAmount}
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            description="Awaiting payment"
            valueClassName={dashboardStats.unpaidTotal > 0 ? 'text-destructive' : ''}
            />
        </div>
        <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <StatCard
            title="Paid Invoices"
            value={String(dashboardStats.paidCount)}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            description="Total number of paid invoices"
            />
        </div>
        <div className="md:col-span-1 lg:col-span-1 xl:col-span-3">
            <StatCard
            title="Total VAT Collected"
            value={dashboardStats.totalVatCollected}
            icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
            description="From paid invoices"
            />
        </div>
        <div className="md:col-span-1 lg:col-span-1 xl:col-span-3">
             <StatCard
            title="Outstanding VAT"
            value={dashboardStats.outstandingVat}
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            description="From created & sent invoices"
            valueClassName={dashboardStats.outstandingVatTotal > 0 ? 'text-amber-600 dark:text-amber-500' : ''}
          />
        </div>
      </div>

      <RecentInvoices invoices={recentInvoices} />

    </div>
  );
}

    