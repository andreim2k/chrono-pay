
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import type { Timecard, Project, Client } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, deleteDocumentNonBlocking, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { AddTimecardDialog } from './add-timecard-dialog';
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

interface TimecardListProps {
  timecards: Timecard[];
}

export function TimecardList({ timecards }: TimecardListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [timecardToEdit, setTimecardToEdit] = useState<Timecard | null>(null);
  const [timecardToDelete, setTimecardToDelete] = useState<Timecard | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const projectsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/projects`) : null),
    [firestore, user]
  );
  const { data: projects } = useCollection<Project>(projectsQuery, `users/${user?.uid}/projects`);

  const clientsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/clients`) : null),
    [firestore, user]
  );
  const { data: clients } = useCollection<Client>(clientsQuery, `users/${user?.uid}/clients`);


  const getBadgeVariant = (status: Timecard['status']) => {
    switch (status) {
      case 'Billed':
        return 'default';
      case 'Unbilled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleStatusChange = (timecard: Timecard, newStatus: Timecard['status']) => {
    if (!firestore || !user) return;
    const timecardRef = doc(firestore, `users/${user.uid}/timecards`, timecard.id);
    updateDocumentNonBlocking(timecardRef, { 
      status: newStatus,
      // If un-billing, clear the invoiceId
      invoiceId: newStatus === 'Unbilled' ? '' : timecard.invoiceId 
    });
    toast({
        title: 'Timecard Updated',
        description: `Time entry has been marked as ${newStatus}.`
    });
  }

  const openEditDialog = (timecard: Timecard) => {
    setTimecardToEdit(timecard);
    setIsEditOpen(true);
  };
  
  const openDeleteDialog = (timecard: Timecard) => {
    setTimecardToDelete(timecard);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!firestore || !timecardToDelete || !user) return;
    const timecardRef = doc(firestore, `users/${user.uid}/timecards`, timecardToDelete.id);
    deleteDocumentNonBlocking(timecardRef);
    toast({
      title: 'Timecard Deleted',
      description: `The time entry for ${format(new Date(timecardToDelete.date), 'MMM d, yyyy')} has been deleted.`,
    });
    setTimecardToDelete(null);
    setIsAlertOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Time Entries</CardTitle>
            <CardDescription>A list of all your logged work hours.</CardDescription>
          </div>
          <AddTimecardDialog
            projects={projects || []}
            clients={clients || []}
            timecardToEdit={timecardToEdit}
            isOpen={isEditOpen}
            onOpenChange={(open) => {
              setIsEditOpen(open);
              if (!open) {
                setTimecardToEdit(null);
              }
            }}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timecards.map((timecard) => (
                <TableRow key={timecard.id}>
                  <TableCell className="font-medium">{format(new Date(timecard.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{timecard.clientName}</TableCell>
                  <TableCell>{timecard.projectName}</TableCell>
                  <TableCell>{timecard.hours.toFixed(2)}</TableCell>
                  <TableCell className='max-w-xs truncate'>{timecard.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(timecard.status)}>{timecard.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {timecard.status === 'Unbilled' && (
                            <DropdownMenuItem onSelect={() => handleStatusChange(timecard, 'Billed')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Billed
                            </DropdownMenuItem>
                        )}
                        {timecard.status === 'Billed' && (
                            <DropdownMenuItem onSelect={() => handleStatusChange(timecard, 'Unbilled')}>
                                <XCircle className="mr-2 h-4 w-4" /> Mark as Unbilled
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => openEditDialog(timecard)} disabled={timecard.status === 'Billed'}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => openDeleteDialog(timecard)} disabled={timecard.status === 'Billed'}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {timecards.length === 0 && (
             <div className="flex h-24 w-full items-center justify-center text-muted-foreground">
                No time entries yet.
             </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the time entry for <span className="font-semibold">{timecardToDelete?.projectName}</span> on <span className="font-semibold">{timecardToDelete ? format(new Date(timecardToDelete.date), 'MMM d, yyyy') : ''}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
