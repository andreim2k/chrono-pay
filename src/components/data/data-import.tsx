
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
import type { Timecard, Invoice, Project, Client, User } from '@/lib/types';


interface DataImportProps {
  allowedCollections?: Array<keyof AlignedData>;
  buttonLabel?: string;
  defaultImportMode?: 'overwrite' | 'merge';
  existingData: AlignedData;
  allowModeSelection?: boolean;
}

interface AlignedData {
    myCompany?: User,
    clients?: Client[];
    projects?: Project[];
    invoices?: Invoice[];
    timecards?: Timecard[];
}


const migrateProjectData = (projectData: any): Omit<Project, 'id' | 'clientName'> => {
  const migrated = { ...projectData };

  // Check for old rate structures and migrate them
  if (migrated.ratePerDay) {
    migrated.rate = migrated.ratePerDay;
    migrated.rateType = 'daily';
    migrated.hoursPerDay = migrated.hoursPerDay || 8; // Default to 8 if not present
    delete migrated.ratePerDay;
  } else if (migrated.ratePerHour) {
    migrated.rate = migrated.ratePerHour;
    migrated.rateType = 'hourly';
    delete migrated.ratePerHour;
    delete migrated.hoursPerDay; // Not applicable for hourly
  }

  // Remove hasVat from project if it exists
  delete migrated.hasVat;

  return migrated;
}

const migrateClientData = (clientData: any, projectDataForClient: any[], companyData: any): Omit<Client, 'id'> => {
    const migrated = { ...clientData };

    const oldCompanyVatRate = companyData?.companyVatRate;
    if (oldCompanyVatRate && migrated.vatRate === undefined) {
        migrated.vatRate = oldCompanyVatRate;
    }
    if (migrated.vatRate === undefined) {
        migrated.vatRate = 0;
    }
    
    // Migrate hasVat from the first associated project if it exists
    if (migrated.hasVat === undefined && projectDataForClient.length > 0) {
        const firstProject = projectDataForClient.find(p => p.clientId === clientData.id || p.clientName === clientData.name);
        if (firstProject && firstProject.hasVat !== undefined) {
            migrated.hasVat = firstProject.hasVat;
        }
    }
     if (migrated.hasVat === undefined) {
        migrated.hasVat = false;
    }
    
    // Ensure payment terms exist, default to 7
    if (migrated.paymentTerms === undefined) {
        migrated.paymentTerms = 7;
    }
    
    return migrated;
}


export function DataImport({ 
  allowedCollections = ['clients', 'projects', 'invoices', 'timecards', 'myCompany'], 
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
        if (allowedCollections.includes('invoices') && existingData?.invoices) {
          existingData.invoices.forEach(inv => batch.delete(doc(firestore, `users/${user.uid}/invoices`, inv.id)));
        }
        if (allowedCollections.includes('projects') && existingData?.projects) {
          existingData.projects.forEach(proj => batch.delete(doc(firestore, `users/${user.uid}/projects`, proj.id)));
        }
        if (allowedCollections.includes('clients') && existingData?.clients) {
          existingData.clients.forEach(client => batch.delete(doc(firestore, `users/${user.uid}/clients`, client.id)));
        }
        if (allowedCollections.includes('timecards') && existingData?.timecards) {
          existingData.timecards.forEach(tc => batch.delete(doc(firestore, `users/${user.uid}/timecards`, tc.id)));
        }
      }
      
      // Special handling for myCompany which is always a merge/update
      if (allowedCollections.includes('myCompany') && dataToImport.myCompany) {
        const userRef = doc(firestore, `users/${user.uid}`);
        const companyData = { ...dataToImport.myCompany };
        // Clean up old vat rate field if it exists
        delete companyData.companyVatRate;
        batch.set(userRef, companyData, { merge: true });
        if(selectedImportMode === 'merge') importCount++;
      }

      const collectionsToImport = ['clients', 'projects', 'invoices', 'timecards'];
      for (const collectionName of collectionsToImport) {
        if (allowedCollections.includes(collectionName as keyof AlignedData) && Array.isArray(dataToImport[collectionName])) {
          let docsToProcess = dataToImport[collectionName];

          if (selectedImportMode === 'merge') {
            if (collectionName === 'invoices' && existingData?.invoices) {
                const existingInvoiceNumbers = new Set(existingData.invoices.map((inv: Invoice) => inv.invoiceNumber));
                docsToProcess = docsToProcess.filter((docData: any) => !existingInvoiceNumbers.has(docData.invoiceNumber));
            }
             if (collectionName === 'timecards' && existingData?.timecards) {
                const existingTimecardSignatures = new Set(existingData.timecards.map((tc: Timecard) => `${tc.projectId}-${tc.startDate}-${tc.hours}`));
                docsToProcess = docsToProcess.filter((docData: any) => {
                    const signature = `${docData.projectId}-${docData.startDate}-${docData.hours}`;
                    return !existingTimecardSignatures.has(signature);
                });
             }
             if (collectionName === 'clients' && existingData?.clients) {
                const existingClientNames = new Set(existingData.clients.map((c: Client) => c.name.toLowerCase().trim()));
                docsToProcess = docsToProcess.filter((docData: any) => !existingClientNames.has(docData.name.toLowerCase().trim()));
             }
             if (collectionName === 'projects' && existingData?.projects) {
                const existingProjectSignatures = new Set(existingData.projects.map((p: Project) => `${p.clientId}-${p.name.toLowerCase().trim()}`));
                docsToProcess = docsToProcess.filter((docData: any) => {
                    const signature = `${docData.clientId}-${docData.name.toLowerCase().trim()}`;
                    return !existingProjectSignatures.has(signature);
                });
             }
          }

          docsToProcess.forEach((docData: any) => {
            let finalDocData = docData;
            if (collectionName === 'projects') {
              finalDocData = migrateProjectData(docData);
            }
            if (collectionName === 'clients') {
              finalDocData = migrateClientData(docData, dataToImport.projects || [], dataToImport.myCompany);
            }
            const newDocRef = doc(collection(firestore, `users/${user.uid}/${collectionName}`));
            batch.set(newDocRef, finalDocData);
            importCount++;
          });
        }
      }
      
      if (importCount === 0 && selectedImportMode === 'merge') {
        toast({
            title: 'No New Data',
            description: 'No new data was found in the selected file to import.',
        });
        setIsImporting(false);
        return;
      }

      await batch.commit();
      
      const countForToast = selectedImportMode === 'overwrite' ? Object.values(dataToImport).flat().length : importCount;
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
      return "This will add all records from the selected file that do not already exist in your current data. It will not delete anything. Are you sure you want to continue?";
    }

    const collectionsToWipe = (allowedCollections as string[]).filter(c => c !== 'myCompany');

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
                                <span className='font-semibold text-foreground'>Merge:</span> Add new records from the file. Existing data will not be affected.
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="overwrite" id="r-overwrite" />
                            <Label htmlFor="r-overwrite" className='font-normal'>
                                <span className='font-semibold text-foreground'>Overwrite:</span> Delete all current data and replace it with data from the file.
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
