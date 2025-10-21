
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { writeBatch, collection, doc } from 'firebase/firestore';

interface DataImportProps {
  allowedCollections?: ('clients' | 'projects' | 'invoices')[];
}

export function DataImport({ allowedCollections = ['clients', 'projects', 'invoices'] }: DataImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Firestore is not available.',
      });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      const batch = writeBatch(firestore);
      let count = 0;

      for (const collectionName of allowedCollections) {
        const collectionData = data[collectionName];
        if (Array.isArray(collectionData)) {
          const collectionRef = collection(firestore, collectionName);
          collectionData.forEach((docData) => {
            let docRef;
            if (collectionName === 'clients' && docData.name === "My Company's Company") {
              // Special handling for 'my-company-details'
              docRef = doc(firestore, 'clients', 'my-company-details');
            } else {
              docRef = doc(collectionRef);
            }
            batch.set(docRef, docData);
            count++;
          });
        }
      }

      if (count === 0) {
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'No valid data found in the selected file for the allowed collections.',
        });
        setIsImporting(false);
        return;
      }

      await batch.commit();

      toast({
        title: 'Import Successful',
        description: `Successfully imported ${count} documents. The page will now refresh.`,
      });

      // Refresh the page to show the new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Import failed:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'The file format is invalid or there was an error writing to the database.',
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/json"
        className="hidden"
      />
      <Button variant="outline" onClick={handleButtonClick} disabled={isImporting}>
        {isImporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Import Data
      </Button>
    </>
  );
}
