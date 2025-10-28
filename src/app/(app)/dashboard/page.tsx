
'use client';

import { StatCard } from '@/components/dashboard/stat-card';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { useCollection, useUser } from '@/firebase';
import { DollarSign, Users, Clock, Banknote, Landmark, Briefcase, Hourglass } from 'lucide-react';
import type { Invoice, Project, Timecard } from '@/lib/types';
import { useMemo } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';

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

  const dashboardStats = useMemo(() => {
    if (!invoices || !clients || !projects || !timecards) {
      return {
        totalRevenue: '€0.00',
        unpaidAmount: '€0.00',
        unpaidTotal: 0,
        clientCount: 0,
        projectCount: 0,
        paidCount: 0,
        totalVatCollected: '€0.00',
        outstandingVat: '€0.00',
        outstandingVatTotal: 0,
        unbilledHours: '0.00',
      };
    }

    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid');
    
    const clientCount = clients.length;
    const projectCount = projects.length;

    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const unpaidTotal = unpaidInvoices.reduce((acc, inv) => acc + inv.total, 0);

    const totalVatCollected = paidInvoices.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    const outstandingVatTotal = unpaidInvoices.reduce((acc, inv) => acc + (inv.vatAmount || 0), 0);
    
    const unbilledHours = timecards.filter(tc => tc.status === 'Unbilled').reduce((acc, tc) => acc + tc.hours, 0);

    // Assuming EUR as the primary currency for dashboard summary, mirroring reports page.
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
    }

    return {
      totalRevenue: formatCurrency(totalRevenue),
      unpaidAmount: formatCurrency(unpaidTotal),
      unpaidTotal,
      clientCount: clientCount,
      projectCount,
      paidCount: paidInvoices.length,
      totalVatCollected: formatCurrency(totalVatCollected),
      outstandingVat: formatCurrency(outstandingVatTotal),
      outstandingVatTotal,
      unbilledHours: unbilledHours.toFixed(2),
    };
  }, [invoices, clients, projects, timecards]);

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
        title="Unpaid Amount"
        value={dashboardStats.unpaidAmount}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        description="Awaiting payment"
        valueClassName={dashboardStats.unpaidTotal > 0 ? 'text-destructive' : ''}
        />
         <StatCard
          title="Clients"
          value={String(dashboardStats.clientCount)}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Total number of clients"
        />
         <StatCard
          title="Projects"
          value={String(dashboardStats.projectCount)}
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
          description="Total number of projects"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Paid Invoices"
          value={String(dashboardStats.paidCount)}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="Total number of paid invoices"
        />
        <StatCard
          title="Total VAT Collected"
          value={dashboardStats.totalVatCollected}
          icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
          description="From paid invoices"
        />
        <StatCard
          title="Outstanding VAT"
          value={dashboardStats.outstandingVat}
          icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
          description="From created & sent invoices"
          valueClassName={dashboardStats.outstandingVatTotal > 0 ? 'text-amber-600 dark:text-amber-500' : ''}
        />
        <StatCard
          title="Unbilled Hours"
          value={dashboardStats.unbilledHours}
          icon={<Hourglass className="h-4 w-4 text-muted-foreground" />}
          description="Ready to be invoiced"
          valueClassName={parseFloat(dashboardStats.unbilledHours) > 0 ? 'text-amber-600 dark:text-amber-500' : ''}
        />
      </div>

      <RecentInvoices invoices={recentInvoices} />

    </div>
  );
}
