
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

interface DataImportProps {
  allowedCollections?: string[];
  buttonLabel?: string;
  defaultImportMode?: 'overwrite' | 'merge';
  existingData?: Record<string, any[]>;
  allowModeSelection?: boolean;
}

export function DataImport({ 
  allowedCollections = ['clients', 'projects', 'invoices', 'myCompany'], 
  buttonLabel = 'Import Data',
  defaultImportMode = 'overwrite',
  existingData,
  allowModeSelection = false,
}: DataImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [selectedImportMode, setSelectedImportMode] = useState<'overwrite' | 'merge'>(defaultImportMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  // These hooks are only needed for 'overwrite' mode to get all existing docs for deletion.
  const clientsQuery = useMemoFirebase(() => (firestore && user && allowedCollections.includes('clients') ? collection(firestore, `users/${user.uid}/clients`) : null), [firestore, user, allowedCollections]);
  const projectsQuery = useMemoFirebase(() => (firestore && user && allowedCollections.includes('projects') ? collection(firestore, `users/${user.uid}/projects`) : null), [firestore, user, allowedCollections]);
  const invoicesQuery = useMemoFirebase(() => (firestore && user && allowedCollections.includes('invoices') ? collection(firestore, `users/${user.uid}/invoices`) : null), [firestore, user, allowedCollections]);

  const { data: existingClients } = useCollection(clientsQuery);
  const { data: existingProjects } = useCollection(projectsQuery);
  const { data: existingInvoicesForOverwrite } = useCollection(invoicesQuery);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedImportMode(defaultImportMode);
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

      if (selectedImportMode === 'overwrite') {
        if (allowedCollections.includes('invoices') && existingInvoicesForOverwrite) {
          existingInvoicesForOverwrite.forEach(inv => batch.delete(doc(firestore, `users/${user.uid}/invoices`, inv.id)));
        }
        if (allowedCollections.includes('projects') && existingProjects) {
          existingProjects.forEach(proj => batch.delete(doc(firestore, `users/${user.uid}/projects`, proj.id)));
        }
        if (allowedCollections.includes('clients') && existingClients) {
          existingClients.forEach(client => batch.delete(doc(firestore, `users/${user.uid}/clients`, client.id)));
        }
      }
      
      if (allowedCollections.includes('myCompany') && dataToImport.myCompany) {
        const userRef = doc(firestore, `users/${user.uid}`);
        batch.set(userRef, dataToImport.myCompany, { merge: true });
        if(selectedImportMode === 'merge') importCount++;
      }

      const collectionsToImport = ['clients', 'projects', 'invoices'];
      for (const collectionName of collectionsToImport) {
        if (allowedCollections.includes(collectionName) && Array.isArray(dataToImport[collectionName])) {
          let docsToProcess = dataToImport[collectionName];

          if (selectedImportMode === 'merge' && collectionName === 'invoices' && existingData?.invoices) {
            const existingInvoiceNumbers = new Set(existingData.invoices.map(inv => inv.invoiceNumber));
            docsToProcess = docsToProcess.filter((docData: any) => !existingInvoiceNumbers.has(docData.invoiceNumber));
          }

          docsToProcess.forEach((docData: any) => {
            const newDocRef = doc(collection(firestore, `users/${user.uid}/${collectionName}`));
            batch.set(newDocRef, docData);
            importCount++;
          });
        }
      }
      

      if (importCount === 0) {
        toast({
            title: 'No New Data',
            description: 'No new data was found in the selected file to import.',
        });
        setIsImporting(false);
        return;
      }

      await batch.commit();
      
      const countForToast = selectedImportMode === 'overwrite' ? Object.values(dataToImport).reduce((acc, val) => acc + (Array.isArray(val) ? val.length : 1), 0) : importCount;
      const successTitle = selectedImportMode === 'overwrite' ? 'Import Successful' : 'Merge Successful';
      const successDescription = selectedImportMode === 'overwrite' 
        ? `Successfully cleared relevant data and imported ${countForToast} records. The page will now refresh.`
        : `Successfully merged ${countForToast} new records. The page will now refresh.`;

      toast({
        title: successTitle,
        description: successDescription,
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
    let description = '';

    if (allowModeSelection && selectedImportMode === 'merge') {
      return "This will add all invoices from the selected file that do not already exist in your current data. It will not delete anything. Are you sure you want to continue?";
    }

    const collectionsToWipe = allowedCollections.filter(c => c !== 'myCompany');

    if (collectionsToWipe.length > 0) {
        const lastCollection = collectionsToWipe.pop();
        const collectionText = collectionsToWipe.length > 0 ? `${collectionsToWipe.join(', ')} and ${lastCollection}` : lastCollection;
        description += `This will permanently delete all existing ${collectionText} and replace them with the data from the imported file. `;
    }

    if (allowedCollections.includes('myCompany')) {
        description += "Your 'My Company' details will be updated if present in the file. ";
    }
    
    description += "This action cannot be undone.";

    return description;
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
            {allowModeSelection && (
                <div className="py-4 text-sm text-muted-foreground">
                    <p className='mb-3 font-medium text-foreground'>Please select an import mode:</p>
                    <RadioGroup defaultValue={selectedImportMode} onValueChange={(value) => setSelectedImportMode(value as 'merge' | 'overwrite')}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="merge" id="r-merge" />
                            <Label htmlFor="r-merge" className='font-normal'>
                                <span className='font-semibold text-foreground'>Merge:</span> Add new invoices from the file. Existing invoices will not be affected.
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="overwrite" id="r-overwrite" />
                            <Label htmlFor="r-overwrite" className='font-normal'>
                                <span className='font-semibold text-foreground'>Overwrite:</span> Delete all current invoices and replace them with invoices from the file.
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
            )}
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
