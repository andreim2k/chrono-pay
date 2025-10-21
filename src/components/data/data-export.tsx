'use client';

import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DataExportProps {
  data: Record<string, any[]>;
  fileName?: string;
  buttonLabel?: string;
}

export function DataExport({ data, fileName = 'chronopay_backup.json', buttonLabel = 'Export Data' }: DataExportProps) {
  const { toast } = useToast();

  const handleExport = () => {
    try {
      const dataToExport = Object.fromEntries(
        Object.entries(data).map(([collection, docs]) => {
          // Remove the 'id' field from each document before exporting
          const cleanedDocs = docs.map(({ id, ...rest }) => rest);
          return [collection, cleanedDocs];
        })
      );
      
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const finalFileName = fileName.replace('.json', `_${timestamp}.json`);

      const link = document.createElement('a');
      link.href = url;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Your data has been exported to ${finalFileName}.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export your data. Please check the console for errors.',
      });
    }
  };
  
  const hasData = Object.values(data).some(arr => arr.length > 0);

  return (
    <Button variant="outline" onClick={handleExport} disabled={!hasData}>
      <Upload className="mr-2 h-4 w-4" />
      {buttonLabel}
    </Button>
  );
}
