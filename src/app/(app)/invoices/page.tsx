
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Invoice } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { DataExport } from '@/components/data/data-export';
import { DataImport } from '@/components/data/data-import';


export default function InvoicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: invoices } = useCollection<Invoice>(invoicesQuery);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your invoices and billing.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <DataExport 
            data={{invoices: invoices || []}} 
            fileName='invoices_export.json' 
            buttonLabel="Export Invoices"
          />
          <DataImport 
            allowedCollections={['invoices']}
            buttonLabel="Import Invoices"
          />
          <Button asChild>
            <Link href="/invoices/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
            </Link>
          </Button>
        </div>
      </div>
      <InvoiceList invoices={invoices || []} />
    </div>
  );
}
