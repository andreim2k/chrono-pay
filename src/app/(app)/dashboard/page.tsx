
'use client';

import { StatCard } from '@/components/dashboard/stat-card';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { useCollection, useUser, useDoc } from '@/firebase';
import { DollarSign, Users, Clock, Banknote, Landmark, Briefcase, Hourglass, Euro, FileText } from 'lucide-react';
import type { Invoice, Project, Timecard, Client, User } from '@/lib/types';
import { useMemo } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

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
    () => (firestore && user ? collection(firestore, `users/${user.uid}/timecards`) : null),
    [firestore, user]
  );
  const { data: timecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);

  const dashboardStats = useMemo(() => {
    const safeInvoices = invoices || [];
    const safeClients = clients || [];
    const safeProjects = projects || [];
    const safeTimecards = timecards || [];

    const paidInvoices = safeInvoices.filter(inv => inv.status === 'Paid');
    const unpaidInvoices = safeInvoices.filter(inv => inv.status !== 'Paid');
    
    const clientCount = safeClients.length;
    const projectCount = safeProjects.length;

    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + (inv.totalRon || 0), 0);
    const netRevenue = paidInvoices.reduce((acc, inv) => {
        const subtotalRon = inv.subtotal * (inv.exchangeRate || 1);
        return acc + subtotalRon;
    }, 0);
    
    const unpaidTotal = unpaidInvoices.reduce((acc, inv) => acc + (inv.totalRon || 0), 0);

    const totalVatCollectedRon = paidInvoices.reduce((acc, inv) => {
        const vatInRon = (inv.vatAmount || 0) * (inv.exchangeRate || 1);
        return acc + vatInRon;
    }, 0);
    
    const outstandingVatTotalRon = unpaidInvoices.reduce((acc, inv) => {
        const vatInRon = (inv.vatAmount || 0) * (inv.exchangeRate || 1);
        return acc + vatInRon;
    }, 0);
    
    const unbilledHours = safeTimecards.filter(tc => tc.status === 'Billable').reduce((acc, tc) => acc + tc.hours, 0);
    
    const paidEurNoVatInvoices = paidInvoices
      .filter(inv => inv.currency === 'EUR' && (!inv.vatAmount || inv.vatAmount === 0));

    const paidEurNoVat = paidEurNoVatInvoices.reduce((acc, inv) => acc + inv.subtotal, 0);
    const paidEurNoVatInRon = paidEurNoVatInvoices.reduce((acc, inv) => acc + (inv.subtotal * (inv.exchangeRate || 1)), 0);

    const shouldShowRon = myCompany?.companyIbans && 'RON' in myCompany.companyIbans;

    const formatCurrency = (amount: number, currency = 'EUR') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    }
    
    const formatRon = (amount: number) => {
        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
    }

    return {
      totalRevenue: formatRon(totalRevenue),
      netRevenue: formatRon(netRevenue),
      unpaidAmount: formatRon(unpaidTotal),
      unpaidTotal,
      clientCount,
      projectCount,
      paidCount: paidInvoices.length,
      totalVatCollected: formatRon(totalVatCollectedRon),
      outstandingVat: formatRon(outstandingVatTotalRon),
      outstandingVatTotal: outstandingVatTotalRon,
      unbilledHours: unbilledHours.toFixed(2),
      paidEurValue: shouldShowRon ? formatRon(paidEurNoVatInRon) : formatCurrency(paidEurNoVat, 'EUR'),
      paidEurLabel: shouldShowRon ? 'Net Revenue from EUR (RON)' : 'Net Revenue from EUR',
    };
  }, [invoices, clients, projects, timecards, myCompany]);

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
        title="Total Revenue (RON)"
        value={dashboardStats.totalRevenue}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        description="Total from paid invoices, including VAT"
        />
        <StatCard
          title="Net Revenue (RON)"
          value={dashboardStats.netRevenue}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          description="Total from paid invoices, before VAT"
        />
        <StatCard
        title="Unpaid Amount (RON)"
        value={dashboardStats.unpaidAmount}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        description="Awaiting payment from clients"
        valueClassName={dashboardStats.unpaidTotal > 0 ? 'text-destructive' : ''}
        />
         <StatCard
          title="Clients & Projects"
          value={`${dashboardStats.clientCount} / ${dashboardStats.projectCount}`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Total active clients / projects"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={dashboardStats.paidEurLabel}
          value={dashboardStats.paidEurValue}
          icon={<Euro className="h-4 w-4 text-muted-foreground" />}
          description="From paid EUR invoices without VAT"
        />
        <StatCard
          title="Total VAT Collected (RON)"
          value={dashboardStats.totalVatCollected}
          icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
          description="From paid invoices"
        />
        <StatCard
          title="Outstanding VAT (RON)"
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
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
       </div>

      <RecentInvoices invoices={recentInvoices} myCompany={myCompany} />

    </div>
  );
}
