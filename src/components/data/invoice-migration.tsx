'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Invoice, Client, Project } from '@/lib/types';

interface InvoiceMigrationProps {
  invoices: Invoice[];
  clients: Client[];
  projects: Project[];
}

export function InvoiceMigration({ invoices, clients, projects }: InvoiceMigrationProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: number; failed: number; skipped: number } | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const invoicesNeedingMigration = invoices.filter(inv => !inv.clientId);

  const handleMigration = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: 'Firestore is not available or user is not logged in.',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const batch = writeBatch(firestore);
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const invoice of invoices) {
        // Skip if already has clientId
        if (invoice.clientId) {
          skippedCount++;
          continue;
        }

        let clientId: string | undefined;

        // Try to find clientId by matching clientName
        if (invoice.clientName) {
          const matchingClient = clients.find(c => c.name === invoice.clientName);
          if (matchingClient) {
            clientId = matchingClient.id;
          }
        }

        // If still no clientId but we have projectId, try to find client through project
        if (!clientId && invoice.projectId) {
          const matchingProject = projects.find(p => p.id === invoice.projectId);
          if (matchingProject && matchingProject.clientId) {
            clientId = matchingProject.clientId;
          }
        }

        if (clientId) {
          const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoice.id);
          batch.update(invoiceRef, { clientId });
          successCount++;
        } else {
          failedCount++;
          console.warn(`Could not find clientId for invoice ${invoice.invoiceNumber} (${invoice.clientName})`);
        }
      }

      if (successCount > 0) {
        await batch.commit();
      }

      setMigrationResult({ success: successCount, failed: failedCount, skipped: skippedCount });

      toast({
        title: 'Migration Complete',
        description: `Updated ${successCount} invoices. ${failedCount} failed, ${skippedCount} skipped (already migrated).`,
      });

      // Refresh the page to show updated data
      if (successCount > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: 'There was an error updating the invoices in the database.',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (invoicesNeedingMigration.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Invoice Migration
          </CardTitle>
          <CardDescription>
            All invoices have been migrated and contain the clientId field.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Migration</CardTitle>
        <CardDescription>
          {invoicesNeedingMigration.length} invoice{invoicesNeedingMigration.length !== 1 ? 's' : ''} need to be migrated to include the clientId field.
          This is required for the dashboard to display revenue metrics correctly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>The migration will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Match invoices to clients by name</li>
            <li>Use project information if direct client match fails</li>
            <li>Update invoices in the database with the correct clientId</li>
          </ul>
        </div>

        {migrationResult && (
          <div className="p-4 rounded-lg bg-muted">
            <p className="font-medium">Migration Results:</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="text-green-600">✓ Successfully migrated: {migrationResult.success}</li>
              {migrationResult.failed > 0 && (
                <li className="text-destructive">✗ Failed to migrate: {migrationResult.failed}</li>
              )}
              <li className="text-muted-foreground">⊘ Already migrated: {migrationResult.skipped}</li>
            </ul>
          </div>
        )}

        <Button onClick={handleMigration} disabled={isMigrating}>
          {isMigrating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Migrate Invoices
        </Button>
      </CardContent>
    </Card>
  );
}
