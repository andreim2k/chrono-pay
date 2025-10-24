
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataExport } from './data-export';
import { DataImport } from './data-import';

interface DataManagementProps {
    data: {
        myCompany: any;
        clients: any[];
        projects: any[];
        invoices: any[];
    }
}

export function DataManagement({ data }: DataManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>
          Export all your data for backup or import it to a new workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <DataExport data={data} />
        <DataImport allowedCollections={['clients', 'projects', 'invoices', 'myCompany']} />
      </CardContent>
    </Card>
  );
}
