
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Edit, ArrowUpDown } from 'lucide-react';
import type { Timecard, Project, Client } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, deleteDocumentNonBlocking, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, writeBatch } from 'firebase/firestore';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '../ui/checkbox';

type SortConfig = {
  key: keyof Timecard;
  direction: 'ascending' | 'descending';
} | null;

interface TimecardListProps {
  timecards: Timecard[];
  isFiltered: boolean;
  sortConfig: SortConfig;
  onSort: (config: SortConfig) => void;
}

export function TimecardList({ timecards, isFiltered, sortConfig, onSort }: TimecardListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [timecardToEdit, setTimecardToEdit] = useState<Timecard | null>(null);
  const [timecardToDelete, setTimecardToDelete] = useState<Timecard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

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

  const selectedRowCount = useMemo(() => Object.values(selectedRows).filter(Boolean).length, [selectedRows]);

  const getBadgeVariant = (status: Timecard['status']) => {
    switch (status) {
      case 'Billed':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Billable':
        return 'outline';
      default:
        return 'outline';
    }
  };

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
      description: `The time entry for ${format(new Date(timecardToDelete.startDate.replace(/-/g, '/')), 'MMM d, yyyy')} has been deleted.`,
    });
    setTimecardToDelete(null);
    setIsAlertOpen(false);
  };
  
  const handleSelectAll = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) {
      timecards.forEach(tc => {
        if(tc.status === 'Billable') newSelectedRows[tc.id] = true
      });
    }
    setSelectedRows(newSelectedRows);
  };

  const handleRowSelect = (timecardId: string, checked: boolean) => {
    setSelectedRows(prev => ({ ...prev, [timecardId]: checked }));
  };

  const handleDeleteSelected = async () => {
    if (!firestore || selectedRowCount === 0 || !user) return;
    
    const batch = writeBatch(firestore);
    const idsToDelete = Object.keys(selectedRows).filter(id => selectedRows[id]);
    
    idsToDelete.forEach(id => {
        const timecardRef = doc(firestore, `users/${user.uid}/timecards`, id);
        batch.delete(timecardRef);
    });

    try {
        await batch.commit();
        toast({
            title: 'Timecards Deleted',
            description: `${idsToDelete.length} time entries have been successfully deleted.`,
        });
        setSelectedRows({});
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error Deleting Timecards',
            description: 'Could not delete the selected time entries. Please try again.',
        });
    }
  };

  const requestSort = (key: keyof Timecard) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    onSort({ key, direction });
  };

  const getSortIndicator = (key: keyof Timecard) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ sortKey, children }: { sortKey: keyof Timecard, children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(sortKey)} className="p-0 hover:text-primary hover:bg-transparent">
        {children}
        {getSortIndicator(sortKey)}
      </Button>
    </TableHead>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{isFiltered ? 'Filtered Time Entries' : 'All Time Entries'}</CardTitle>
            <CardDescription>
                Displaying {timecards.length} time entries.
                {selectedRowCount > 0 && ` (${selectedRowCount} selected)`}
            </CardDescription>
          </div>
           <div className="flex items-center gap-2">
            {selectedRowCount > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedRowCount})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete {selectedRowCount} selected time entries. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected}>Delete Entries</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <AddTimecardDialog
                projects={projects || []}
                clients={clients || []}
                isOpen={isAddOpen}
                onOpenChange={setIsAddOpen}
            />
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox
                        checked={timecards.filter(t => t.status === 'Billable').length > 0 && selectedRowCount === timecards.filter(t => t.status === 'Billable').length}
                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                        aria-label="Select all billable"
                    />
                </TableHead>
                <SortableHeader sortKey="startDate">Date</SortableHeader>
                <SortableHeader sortKey="clientName">Client</SortableHeader>
                <SortableHeader sortKey="projectName">Project</SortableHeader>
                <SortableHeader sortKey="hours">Hours</SortableHeader>
                <TableHead>Description</TableHead>
                <SortableHeader sortKey="status">Status</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timecards.map((timecard) => (
                <TableRow key={timecard.id} data-state={selectedRows[timecard.id] && "selected"}>
                  <TableCell>
                     <Checkbox
                        checked={selectedRows[timecard.id] || false}
                        onCheckedChange={(checked) => handleRowSelect(timecard.id, Boolean(checked))}
                        aria-label={`Select timecard on ${timecard.startDate}`}
                        disabled={timecard.status !== 'Billable'}
                      />
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(timecard.startDate.replace(/-/g, '/')), 'MMM d')} - {format(new Date(timecard.endDate.replace(/-/g, '/')), 'MMM d, yyyy')}
                  </TableCell>
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
                        <Button variant="ghost" size="icon" disabled={timecard.status !== 'Billable'}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => openEditDialog(timecard)} disabled={timecard.status !== 'Billable'}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => openDeleteDialog(timecard)} disabled={timecard.status !== 'Billable'}>
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
      
      {timecardToEdit && (
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
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the time entry for <span className="font-semibold">{timecardToDelete?.projectName}</span> on <span className="font-semibold">{timecardToDelete ? format(new Date(timecardToDelete.startDate.replace(/-/g, '/')), 'MMM d, yyyy') : ''}</span>.
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
