
'use client';

import { useState, useMemo, useEffect } from 'react';
import { TimecardList } from '@/components/timecards/timecard-list';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Timecard, Client, Project } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

export default function TimecardsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const timecardsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `users/${user.uid}/timecards`), orderBy('date', 'desc')) : null),
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

  const availableYears = useMemo(() => {
    if (!timecards) return [];
    const years = new Set(timecards.map(tc => getYear(parseISO(tc.date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [timecards]);

  const projectsForClient = useMemo(() => {
    if (selectedClientId === 'all' || !projects) return projects || [];
    return projects.filter(p => p.clientId === selectedClientId);
  }, [selectedClientId, projects]);

  const filteredTimecards = useMemo(() => {
    if (!timecards) return [];
    return timecards.filter(timecard => {
      const date = parseISO(timecard.date);
      const yearMatch = selectedYear === 'all' || getYear(date) === Number(selectedYear);
      const monthMatch = selectedMonth === 'all' || getMonth(date) === Number(selectedMonth);
      const clientMatch = selectedClientId === 'all' || timecard.clientId === selectedClientId;
      const projectMatch = selectedProjectId === 'all' || timecard.projectId === selectedProjectId;
      return yearMatch && monthMatch && clientMatch && projectMatch;
    });
  }, [timecards, selectedClientId, selectedProjectId, selectedYear, selectedMonth]);

  useEffect(() => {
    setSelectedProjectId('all');
  }, [selectedClientId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timecards</h1>
        <p className="text-muted-foreground">
          Log and manage your work hours for all projects.
        </p>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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
