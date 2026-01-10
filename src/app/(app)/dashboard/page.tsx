
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

    // Stage 1: Initialize stats objects for every preferred currency found in clients
    const currencyStats: { [currency: string]: CurrencyStats } = {};
    safeClients.forEach(c => {
        if (c.preferredCompanyIbanCurrency && !currencyStats[c.preferredCompanyIbanCurrency]) {
            currencyStats[c.preferredCompanyIbanCurrency] = { totalRevenue: 0, netRevenue: 0, unpaidTotal: 0, vatCollected: 0, outstandingVat: 0 };
        }
    });
     // Also ensure RON exists if there are no clients preferring it yet
    if (!currencyStats['RON']) {
        currencyStats['RON'] = { totalRevenue: 0, netRevenue: 0, unpaidTotal: 0, vatCollected: 0, outstandingVat: 0 };
    }


    // Stage 2: Process each invoice and add its values to the correct currency bucket
    safeInvoices.forEach(inv => {
      const client = clientsById.get(inv.clientId);
      if (!client || !client.preferredCompanyIbanCurrency) return;

      const groupCurrency = client.preferredCompanyIbanCurrency;

      // Ensure the stats object for this currency exists
      if (!currencyStats[groupCurrency]) {
          currencyStats[groupCurrency] = { totalRevenue: 0, netRevenue: 0, unpaidTotal: 0, vatCollected: 0, outstandingVat: 0 };
      }

      let totalInGroupCurrency: number;
      let subtotalInGroupCurrency: number;
      let vatInGroupCurrency: number;

      // Perform conversion only if the group is RON and the invoice currency is different
      if (groupCurrency === 'RON' && inv.currency !== 'RON') {
        const conversionRate = inv.exchangeRate ?? 1;
        totalInGroupCurrency = inv.total * conversionRate;
        subtotalInGroupCurrency = inv.subtotal * conversionRate;
        vatInGroupCurrency = (inv.vatAmount || 0) * conversionRate;
      } else {
        // For all other cases (EUR group, USD group, or native RON in RON group), use the invoice's original values
        // But only if the invoice currency matches the group currency
        if (inv.currency !== groupCurrency) return;
        totalInGroupCurrency = inv.total;
        subtotalInGroupCurrency = inv.subtotal;
        vatInGroupCurrency = inv.vatAmount || 0;
      }

      if (inv.status === 'Paid') {
        currencyStats[groupCurrency].totalRevenue += totalInGroupCurrency;
        currencyStats[groupCurrency].netRevenue += subtotalInGroupCurrency;
        currencyStats[groupCurrency].vatCollected += vatInGroupCurrency;
      } else { // 'Created' or 'Sent'
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
    
    // Prepare final output
    const ronStats = currencyStats['RON'] || { totalRevenue: 0, netRevenue: 0, unpaidTotal: 0, vatCollected: 0, outstandingVat: 0 };
    delete currencyStats['RON'];
    
    // Create cards for all other currencies
    const otherCurrencyCards = Object.entries(currencyStats)
      .map(([currency, stats]) => ({
          currency,
          totalRevenue: formatCurrency(stats.totalRevenue, currency),
          netRevenue: formatCurrency(stats.netRevenue, currency),
          unpaidAmount: formatCurrency(stats.unpaidTotal, currency),
          unpaidTotal: stats.unpaidTotal,
          totalVatCollected: formatCurrency(stats.vatCollected, currency),
          vatCollectedTotal: stats.vatCollected,
          outstandingVat: formatCurrency(stats.outstandingVat, currency),
          outstandingVatTotal: stats.outstandingVat,
      }));

    return {
      totalRevenue: formatCurrency(ronStats.totalRevenue, 'RON'),
      netRevenue: formatCurrency(ronStats.netRevenue, 'RON'),
      unpaidAmount: formatCurrency(ronStats.unpaidTotal, 'RON'),
      unpaidTotal: ronStats.unpaidTotal,
      totalVatCollected: formatCurrency(ronStats.vatCollected, 'RON'),
      vatCollectedTotal: ronStats.vatCollected,
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
       <div className="space-y-6">
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
                title="Total VAT Collected (RON)"
                value={dashboardStats.totalVatCollected}
                icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
                description="VAT from paid invoices in RON"
            />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Outstanding VAT (RON)"
                value={dashboardStats.outstandingVat}
                icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
                description="VAT from created & sent invoices in RON"
                valueClassName={dashboardStats.outstandingVatTotal > 0 ? 'text-destructive' : ''}
            />
            <StatCard
                title="Total Clients"
                value={`${dashboardStats.clientCount}`}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                description="Total number of active clients"
            />
            <StatCard
                title="Total Projects"
                value={`${dashboardStats.projectCount}`}
                icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
                description="Total number of active projects"
            />
            <StatCard
                title="Unbilled Hours"
                value={dashboardStats.unbilledHours}
                icon={<Hourglass className="h-4 w-4 text-muted-foreground" />}
                description="Ready to be invoiced"
                valueClassName={parseFloat(dashboardStats.unbilledHours) > 0 ? 'text-amber-600 dark:text-amber-500' : ''}
            />
        </div>

        {dashboardStats.dynamicCurrencyCards.map((card) => (
            <div key={card.currency} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <StatCard
                    title={`Total VAT Collected (${card.currency})`}
                    value={card.totalVatCollected}
                    icon={currencyIcons[card.currency] || <Banknote className="h-4 w-4 text-muted-foreground" />}
                    description={`VAT from paid invoices in ${card.currency}`}
                />
            </div>
        ))}
      </div>

      <RecentInvoices invoices={recentInvoices} clients={clients || []} />

    </div>
  );
}

    