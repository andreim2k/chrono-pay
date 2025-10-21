'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { writeBatch, collection, doc } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DataImportProps {
  allowedCollections?: ('clients' | 'projects' | 'invoices')[];
  buttonLabel?: string;
}

export function DataImport({ allowedCollections = ['clients', 'projects', 'invoices'], buttonLabel = 'Import Data' }: DataImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const clientsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const projectsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'projects') : null), [firestore]);
  const invoicesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'invoices') : null), [firestore]);

  const { data: clients } = useCollection(clientsQuery);
  const { data: projects } = useCollection(projectsQuery);
  const { data: invoices } = useCollection(invoicesQuery);

  const dataMap = {
    clients,
    projects,
    invoices
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileToImport(file);
    setIsAlertOpen(true);
    
    // Reset file input so the same file can be selected again
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!firestore || !fileToImport) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Firestore is not available or no file was selected.',
      });
      return;
    }
    
    setIsImporting(true);
    try {
      const fileContent = await fileToImport.text();
      const dataToImport = JSON.parse(fileContent);

      const batch = writeBatch(firestore);
      let importCount = 0;

      // 1. Delete existing documents in allowed collections
      for (const collectionName of allowedCollections) {
        const collectionData = dataMap[collectionName as keyof typeof dataMap];
        if(collectionData) {
            for (const docToDelete of collectionData) {
                 // Special handling for 'my-company-details' to prevent deletion
                if (collectionName === 'clients' && docToDelete.id === 'my-company-details') {
                    continue;
                }
                const docRef = doc(firestore, collectionName, docToDelete.id);
                batch.delete(docRef);
            }
        }
      }

      // 2. Add new documents from the import file
      for (const collectionName of allowedCollections) {
        const collectionData = dataToImport[collectionName];
        if (Array.isArray(collectionData)) {
          collectionData.forEach((docData: any) => {
            const collectionRef = collection(firestore, collectionName);
            let docRef;
             // Special handling for 'my-company-details' to keep its ID consistent
            if (collectionName === 'clients' && docData.name?.includes("Company")) {
                 docRef = doc(firestore, 'clients', 'my-company-details');
            } else {
                 docRef = doc(collectionRef); // Create new doc with new ID
            }
            batch.set(docRef, docData);
            importCount++;
          });
        }
      }

      if (importCount === 0) {
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
        description: `Successfully imported ${importCount} documents. The page will now refresh.`,
      });

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
      setFileToImport(null);
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
        {buttonLabel}
      </Button>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all existing data in the selected collections ({allowedCollections.join(', ')}) and replace it with the data from the imported file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileToImport(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
