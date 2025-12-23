
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataExport } from './data-export';
import { DataImport } from './data-import';

interface DataManagementProps {
    data: {
        myCompany: any; // This will now be the User object which includes company fields
        clients: any[];
        projects: any[];
        invoices: any[];
        timecards: any[];
    }
}

export function DataManagement({ data }: DataManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>
          Export your data for backup, or import a previous backup file. You can choose to merge new data or overwrite existing data.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <DataExport data={data} fileName='chronopay_full_backup.json' buttonLabel='Export All Data'/>
        <DataImport 
            allowedCollections={['clients', 'projects', 'invoices', 'timecards', 'myCompany']} 
            defaultImportMode='merge' 
            existingData={data} 
            allowModeSelection={true}
            buttonLabel='Import Data'
        />
      </CardContent>
    </Card>
  );
}
