
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
    
    type CurrencyStats = {
      totalRevenue: number;
      netRevenue: number;
      unpaidTotal: number;
      vatCollected: number;
      outstandingVat: number;
    };
    const currencyStats: { [currency: string]: CurrencyStats } = {};

    safeInvoices.forEach(inv => {
        const project = projects?.find(p => p.id === inv.projectId);
        const client = clientsById.get(project?.clientId || '');
        
        // Group by client's preferred currency, fallback to invoice currency
        const groupCurrency = client?.preferredCompanyIbanCurrency || inv.currency;
        
        if (!currencyStats[groupCurrency]) {
            currencyStats[groupCurrency] = { totalRevenue: 0, netRevenue: 0, unpaidTotal: 0, vatCollected: 0, outstandingVat: 0 };
        }
        
        // Determine the conversion rate to the group's currency
        let conversionRate = 1;
        if (inv.currency !== groupCurrency) {
            // This assumes RON is the base for exchange rates stored in the invoice
            if (groupCurrency === 'RON') {
                conversionRate = inv.exchangeRate || 1;
            } else {
                // This is a simplification. A full implementation would need a rate from inv.currency to groupCurrency.
                // For now, we only handle the primary case of foreign currency -> RON.
            }
        }

        const totalInGroupCurrency = inv.total * conversionRate;
        const subtotalInGroupCurrency = inv.subtotal * conversionRate;
        const vatInGroupCurrency = (inv.vatAmount || 0) * conversionRate;

        if (inv.status === 'Paid') {
            currencyStats[groupCurrency].totalRevenue += totalInGroupCurrency;
            currencyStats[groupCurrency].netRevenue += subtotalInGroupCurrency;
            currencyStats[groupCurrency].vatCollected += vatInGroupCurrency;
        } else {
            currencyStats[groupCurrency].unpaidTotal += totalInGroupCurrency;
            currencyStats[groupCurrency].outstandingVat += vatInGroupCurrency;
        }
    });

    const clientCount = safeClients.length;
    const projectCount = safeProjects.length;
    const unbilledHours = safeTimecards.filter(tc => tc.status === 'Billable').reduce((acc, tc) => acc + tc.hours, 0);

    const formatCurrency = (amount: number, currency: string) => {
        const locale = currency === 'RON' ? 'ro-RO' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    }
    
    const ronStats = currencyStats['RON'] || { totalRevenue: 0, netRevenue: 0, unpaidTotal: 0, vatCollected: 0, outstandingVat: 0 };
    
    const otherCurrencyCards = Object.entries(currencyStats)
        .filter(([currency]) => currency !== 'RON')
        .map(([currency, stats]) => ({
            currency,
            totalRevenue: formatCurrency(stats.totalRevenue, currency),
            netRevenue: formatCurrency(stats.netRevenue, currency),
            unpaidAmount: formatCurrency(stats.unpaidTotal, currency),
            unpaidTotal: stats.unpaidTotal,
        }));


    return {
      totalRevenue: formatCurrency(ronStats.totalRevenue, 'RON'),
      netRevenue: formatCurrency(ronStats.netRevenue, 'RON'),
      unpaidAmount: formatCurrency(ronStats.unpaidTotal, 'RON'),
      unpaidTotal: ronStats.unpaidTotal,
      totalVatCollected: formatCurrency(ronStats.vatCollected, 'RON'),
      outstandingVat: formatCurrency(ronStats.outstandingVat, 'RON'),
      outstandingVatTotal: ronStats.outstandingVat,
      clientCount,
      projectCount,
      unbilledHours: unbilledHours.toFixed(2),
      dynamicCurrencyCards: otherCurrencyCards,
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
        <StatCard
          title="Total VAT Collected (RON)"
          value={dashboardStats.totalVatCollected}
          icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
          description="VAT from paid invoices converted to RON"
        />
        <StatCard
          title="Outstanding VAT (RON)"
          value={dashboardStats.outstandingVat}
          icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
          description="VAT from created & sent invoices in RON"
          valueClassName={dashboardStats.outstandingVatTotal > 0 ? 'text-destructive' : ''}
        />
      </div>

       {dashboardStats.dynamicCurrencyCards.map((card, index) => (
          <div key={card.currency} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
              <StatCard
                  title={`Total Revenue (${card.currency})`}
                  value={card.totalRevenue}
                  icon={currencyIcons[card.currency] || <DollarSign className="h-4 w-4 text-muted-foreground" />}
                  description={`Total from paid invoices in ${card.currency}`}
              />
              <StatCard
                  title={`Net Revenue (${card.currency})`}
                  value={card.netRevenue}
                  icon={currencyIcons[card.currency] || <FileText className="h-4 w-4 text-muted-foreground" />}
                  description={`Total from paid invoices in ${card.currency}, before VAT`}
              />
              <StatCard
                  title={`Unpaid Amount (${card.currency})`}
                  value={card.unpaidAmount}
                  icon={currencyIcons[card.currency] || <Clock className="h-4 w-4 text-muted-foreground" />}
                  description={`Awaiting payment from ${card.currency} invoices`}
                  valueClassName={card.unpaidTotal > 0 ? 'text-destructive' : ''}
              />
              {index === 0 && (
                <StatCard
                  title="Unbilled Hours"
                  value={dashboardStats.unbilledHours}
                  icon={<Hourglass className="h-4 w-4 text-muted-foreground" />}
                  description="Ready to be invoiced"
                  valueClassName={parseFloat(dashboardStats.unbilledHours) > 0 ? 'text-amber-600 dark:text-amber-500' : ''}
                />
              )}
          </div>
        ))}

      <RecentInvoices invoices={recentInvoices} myCompany={myCompany} clients={clients || []} projects={projects || []} />

    </div>
  );
}
