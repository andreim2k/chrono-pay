
'use client';

import { StatCard } from '@/components/dashboard/stat-card';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { useCollection, useUser, useDoc } from '@/firebase';
import { DollarSign, Users, Clock, Banknote, Landmark, Briefcase, Hourglass, Euro, FileText, PoundSterling } from 'lucide-react';
import type { Invoice, Project, Timecard, Client, User } from '@/lib/types';
import { useMemo } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';

const currencyIcons: { [key: string]: React.ReactNode } = {
  EUR: <Euro className="h-4 w-4 text-muted-foreground" />,
  USD: <DollarSign className="h-4 w-4 text-muted-foreground" />,
  GBP: <PoundSterling className="h-4 w-4 text-muted-foreground" />,
  RON: <FileText className="h-4 w-4 text-muted-foreground" />,
};


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

    const clientsById = new Map(safeClients.map(c => [c.id, c]));
    const projectsById = new Map(safeProjects.map(p => [p.id, p]));

    let totalRonRevenue = 0;
    let netRonRevenue = 0;
    let unpaidRonTotal = 0;

    const netRevenueByCurrency: { [currency: string]: number } = {};
    
    safeInvoices.forEach(inv => {
        const project = projectsById.get(inv.projectId);
        const client = clientsById.get(project?.clientId || '');
        const displayInRon = client?.preferredCompanyIbanCurrency === 'RON';
        
        if (inv.status === 'Paid') {
            if (displayInRon) {
                totalRonRevenue += inv.totalRon || (inv.total * (inv.exchangeRate || 1));
                netRonRevenue += (inv.subtotal || 0) * (inv.exchangeRate || 1);
            } else {
                if (!netRevenueByCurrency[inv.currency]) {
                    netRevenueByCurrency[inv.currency] = 0;
                }
                netRevenueByCurrency[inv.currency] += inv.subtotal;
            }
        } else { // Unpaid invoices
            if (displayInRon) {
                unpaidRonTotal += inv.totalRon || (inv.total * (inv.exchangeRate || 1));
            }
        }
    });

    const clientCount = safeClients.length;
    const projectCount = safeProjects.length;

    const unbilledHours = safeTimecards.filter(tc => tc.status === 'Billable').reduce((acc, tc) => acc + tc.hours, 0);

    const formatCurrency = (amount: number, currency = 'EUR') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    }
    
    const formatRon = (amount: number) => {
        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
    }

    const dynamicCurrencyCards = Object.entries(netRevenueByCurrency).map(([currency, netAmount]) => ({
      currency,
      netAmount,
      formattedAmount: formatCurrency(netAmount, currency),
    }));

    return {
      totalRevenue: formatRon(totalRonRevenue),
      netRevenue: formatRon(netRonRevenue),
      unpaidAmount: formatRon(unpaidRonTotal),
      unpaidTotal: unpaidRonTotal,
      clientCount,
      projectCount,
      unbilledHours: unbilledHours.toFixed(2),
      dynamicCurrencyCards,
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
        title="Total Revenue (RON)"
        value={dashboardStats.totalRevenue}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        description="Total from paid invoices in RON"
        />
        <StatCard
          title="Net Revenue (RON)"
          value={dashboardStats.netRevenue}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          description="Total from paid invoices in RON, before VAT"
        />
        <StatCard
        title="Unpaid Amount (RON)"
        value={dashboardStats.unpaidAmount}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        description="Awaiting payment from RON invoices"
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
        {dashboardStats.dynamicCurrencyCards.map(card => (
            <StatCard
                key={card.currency}
                title={`Net Revenue (${card.currency})`}
                value={card.formattedAmount}
                icon={currencyIcons[card.currency] || <DollarSign className="h-4 w-4 text-muted-foreground" />}
                description={`From paid ${card.currency} invoices without VAT`}
            />
        ))}
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

      <RecentInvoices invoices={recentInvoices} myCompany={myCompany} clients={clients || []} projects={projects || []} />

    </div>
  );
}
