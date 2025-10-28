
'use client';

import { TimecardList } from '@/components/timecards/timecard-list';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Timecard } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';

export default function TimecardsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const timecardsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `users/${user.uid}/timecards`), orderBy('date', 'desc')) : null),
    [firestore, user]
  );
  const { data: timecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timecards</h1>
        <p className="text-muted-foreground">
          Log and manage your work hours for all projects.
        </p>
      </div>
      <TimecardList timecards={timecards || []} />
    </div>
  );
}
