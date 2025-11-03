
'use client';

import { useMemo, useState } from 'react';
import { TimecardList } from '@/components/timecards/timecard-list';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Timecard, Client, Project, Invoice } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { DataExport } from '@/components/data/data-export';
import { DataImport } from '@/components/data/data-import';

const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

export default function TimecardsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedClientId, setSelectedClientId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const timecardsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `users/${user.uid}/timecards`), orderBy('startDate', 'desc')) : null),
    [firestore, user]
  );
  const { data: timecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);

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

  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId('all');
  };

  const availableYears = useMemo(() => {
    if (!timecards) return [];
    const years = new Set(timecards.map(tc => getYear(parseISO(tc.startDate))));
    return Array.from(years).sort((a, b) => b - a);
  }, [timecards]);

  const projectsForClient = useMemo(() => {
    if (selectedClientId === 'all' || !projects) return projects || [];
    return projects.filter(p => p.clientId === selectedClientId);
  }, [selectedClientId, projects]);

  const filteredTimecards = useMemo(() => {
    if (!timecards) return [];
    return timecards.filter(timecard => {
      const startDate = parseISO(timecard.startDate);
      const yearMatch = selectedYear === 'all' || getYear(startDate) === Number(selectedYear);
      const monthMatch = selectedMonth === 'all' || getMonth(startDate) === Number(selectedMonth);
      const clientMatch = selectedClientId === 'all' || timecard.clientId === selectedClientId;
      const projectMatch = selectedProjectId === 'all' || timecard.projectId === selectedProjectId;
      return yearMatch && monthMatch && clientMatch && projectMatch;
    });
  }, [timecards, selectedClientId, selectedProjectId, selectedYear, selectedMonth]);

  const exportableData = useMemo(() => {
    return { timecards: filteredTimecards || [] };
  }, [filteredTimecards]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timecards</h1>
          <p className="text-muted-foreground">
            Log and manage your work hours for all projects.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <DataExport 
            data={exportableData} 
            fileName='timecards_export.json' 
            buttonLabel="Export Filtered"
          />
          <DataImport 
            allowedCollections={['timecards', 'projects', 'clients', 'invoices']}
            buttonLabel="Import Timecards"
            defaultImportMode="merge"
            allowModeSelection={true}
            existingData={{ timecards: timecards || [], projects: projects || [], clients: clients || [], invoices: invoices || [] }}
          />
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Select value={selectedClientId} onValueChange={handleClientChange}>
              <SelectTrigger><SelectValue placeholder="Filter by Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={selectedClientId === 'all' && projectsForClient.length === 0}>
              <SelectTrigger className="justify-start"><SelectValue placeholder="Filter by Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectsForClient?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger><SelectValue placeholder="Filter by Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger><SelectValue placeholder="Filter by Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <TimecardList timecards={filteredTimecards || []} />
    </div>
  );
}
