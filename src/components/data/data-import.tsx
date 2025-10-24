
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
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
  allowedCollections?: string[];
  buttonLabel?: string;
}

export function DataImport({ allowedCollections = ['clients', 'projects', 'invoices', 'myCompany'], buttonLabel = 'Import Data' }: DataImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const clientsQuery = useMemoFirebase(() => (firestore && user && allowedCollections.includes('clients') ? collection(firestore, `users/${user.uid}/clients`) : null), [firestore, user, allowedCollections]);
  const projectsQuery = useMemoFirebase(() => (firestore && user && allowedCollections.includes('projects') ? collection(firestore, `users/${user.uid}/projects`) : null), [firestore, user, allowedCollections]);
  const invoicesQuery = useMemoFirebase(() => (firestore && user && allowedCollections.includes('invoices') ? collection(firestore, `users/${user.uid}/invoices`) : null), [firestore, user, allowedCollections]);

  const { data: existingClients } = useCollection(clientsQuery, `users/${user?.uid}/clients`);
  const { data: existingProjects } = useCollection(projectsQuery, `users/${user?.uid}/projects`);
  const { data: existingInvoices } = useCollection(invoicesQuery, `users/${user?.uid}/invoices`);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileToImport(file);
    setIsAlertOpen(true);
    
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!firestore || !fileToImport || !user) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Firestore is not available, no file was selected, or user is not logged in.',
      });
      return;
    }
    
    setIsImporting(true);
    try {
      const fileContent = await fileToImport.text();
      const dataToImport = JSON.parse(fileContent);

      const batch = writeBatch(firestore);
      let importCount = 0;

      // 1. Delete all existing data for the allowed collections
      if (allowedCollections.includes('invoices') && existingInvoices) {
        existingInvoices.forEach(inv => batch.delete(doc(firestore, `users/${user.uid}/invoices`, inv.id)));
      }
      if (allowedCollections.includes('projects') && existingProjects) {
        existingProjects.forEach(proj => batch.delete(doc(firestore, `users/${user.uid}/projects`, proj.id)));
      }
      // Delete only regular clients
      if (allowedCollections.includes('clients') && existingClients) {
        existingClients.forEach(client => batch.delete(doc(firestore, `users/${user.uid}/clients`, client.id)));
      }
      
      // 2. Add new data from the import file
      // Handle My Company
      if (allowedCollections.includes('myCompany') && dataToImport.myCompany) {
        const myCompanyRef = doc(firestore, `users/${user.uid}/company`, 'details');
        batch.set(myCompanyRef, dataToImport.myCompany, { merge: true });
        // This is an update, so we don't increment the main import count
      }

      // Handle other collections
      const collectionsToImport = ['clients', 'projects', 'invoices'];
      collectionsToImport.forEach(collectionName => {
        if (allowedCollections.includes(collectionName) && Array.isArray(dataToImport[collectionName])) {
          dataToImport[collectionName].forEach((docData: any) => {
            const newDocRef = doc(collection(firestore, `users/${user.uid}/${collectionName}`));
            batch.set(newDocRef, docData);
            importCount++;
          });
        }
      });
      

      if (importCount === 0 && !dataToImport.myCompany) {
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'No valid data found in the selected file to import.',
        });
        setIsImporting(false);
        return;
      }

      await batch.commit();

      toast({
        title: 'Import Successful',
        description: `Successfully cleared relevant data and imported ${importCount} records. Your 'My Company' details have been updated. The page will now refresh.`,
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
  
  const alertDescription = () => {
    const collectionsToWipe = allowedCollections.filter(c => c !== 'myCompany');
    if (collectionsToWipe.length === 0) {
        return "This will update your 'My Company' details with the data from the imported file.";
    }
    const lastCollection = collectionsToWipe.pop();
    const collectionText = collectionsToWipe.length > 0 ? `${collectionsToWipe.join(', ')} and ${lastCollection}` : lastCollection;
    return `This will permanently delete all existing ${collectionText} and replace them with the data from the imported file. Your 'My Company' details will be updated if present in the file. This action cannot be undone.`;
  }

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
              {alertDescription()}
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

    