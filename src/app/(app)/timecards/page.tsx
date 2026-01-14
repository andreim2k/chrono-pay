
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
const timecardStatuses: Timecard['status'][] = ['Billable', 'Pending', 'Billed'];

type SortConfig = {
  key: keyof Timecard;
  direction: 'ascending' | 'descending';
} | null;

export default function TimecardsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedClientId, setSelectedClientId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

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
      const statusMatch = selectedStatus === 'all' || timecard.status === selectedStatus;
      const clientMatch = selectedClientId === 'all' || timecard.clientId === selectedClientId;
      const projectMatch = selectedProjectId === 'all' || timecard.projectId === selectedProjectId;
      return yearMatch && monthMatch && statusMatch && clientMatch && projectMatch;
    });
  }, [timecards, selectedClientId, selectedProjectId, selectedYear, selectedMonth, selectedStatus]);
  
  const sortedTimecards = useMemo(() => {
    if (!sortConfig) return filteredTimecards;

    return [...filteredTimecards].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortConfig.key === 'startDate' || sortConfig.key === 'endDate') {
            comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else {
            comparison = aValue.localeCompare(bValue);
        }
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      
      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });
  }, [filteredTimecards, sortConfig]);

  const isFiltered = useMemo(() => {
    return selectedClientId !== 'all' || selectedProjectId !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || selectedStatus !== 'all';
  }, [selectedClientId, selectedProjectId, selectedYear, selectedMonth, selectedStatus]);

  const exportableData = useMemo(() => {
    const timecardsToExport = sortedTimecards.filter(tc => selectedRows[tc.id]);
    return { timecards: timecardsToExport.length > 0 ? timecardsToExport : sortedTimecards || [] };
  }, [sortedTimecards, selectedRows]);
  
  const totalSelectedHours = useMemo(() => {
    return sortedTimecards.reduce((acc, tc) => {
      return selectedRows[tc.id] ? acc + tc.hours : acc;
    }, 0);
  }, [selectedRows, sortedTimecards]);


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
            buttonLabel={Object.keys(selectedRows).length > 0 ? `Export ${Object.keys(selectedRows).length} Selected` : "Export Filtered"}
          />
          <DataImport 
            allowedCollections={['timecards']}
            buttonLabel="Import Timecards"
            defaultImportMode="merge"
            allowModeSelection={true}
            existingData={{ timecards: timecards || [] }}
          />
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <Select value={selectedClientId} onValueChange={handleClientChange}>
              <SelectTrigger><SelectValue placeholder="Filter by Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={selectedClientId === 'all' && projectsForClient.length === 0}>
              <SelectTrigger><SelectValue placeholder="Filter by Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectsForClient?.map(p => <SelectItem key={p.id} value={p.id}>{p.name.trim()}</SelectItem>)}
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger><SelectValue placeholder="Filter by Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {timecardStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <TimecardList 
        timecards={sortedTimecards || []} 
        isFiltered={isFiltered} 
        sortConfig={sortConfig}
        onSort={setSortConfig}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        totalSelectedHours={totalSelectedHours}
      />
    </div>
  );
}

    