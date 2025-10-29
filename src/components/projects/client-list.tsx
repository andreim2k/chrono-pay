
'use client';

import { useState, useEffect } from 'react';
import type { Client, Project, Invoice, Timecard } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { GripVertical, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { AddClientDialog } from './add-client-dialog';
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
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ClientListProps {
  clients: Client[];
  onEditClient: (client: Client) => void;
}

function SortableClientItem({ client, onEdit, onDelete }: { client: Client, onEdit: (client: Client) => void, onDelete: (client: Client) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className='flex items-center gap-4'>
             <button {...attributes} {...listeners} className="cursor-grab p-2 text-muted-foreground hover:bg-accent rounded-md">
              <GripVertical className="h-5 w-5" />
            </button>
            <Avatar>
              <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{client.name}</CardTitle>
              <CardDescription>
                {client.address}
                <br/>
                VAT: {client.vat}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onEdit(client)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive" 
                onSelect={() => onDelete(client)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
      </Card>
    </div>
  );
}


export function ClientList({ clients: initialClients, onEditClient }: ClientListProps) {
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [activeClients, setActiveClients] = useState<Client[]>([]);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const projectsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/projects`) : null),
    [firestore, user]
  );
  const { data: allProjects } = useCollection<Project>(projectsQuery, `users/${user?.uid}/projects`);

  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: allInvoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

  const timecardsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/timecards`) : null),
    [firestore, user]
  );
  const { data: allTimecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);

  useEffect(() => {
    const sortedClients = [...initialClients].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setActiveClients(sortedClients);
  }, [initialClients]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = async () => {
    if (!firestore || !clientToDelete || !user || !allProjects || !allInvoices || !allTimecards) return;

    const batch = writeBatch(firestore);

    // 1. Delete the client document
    const clientRef = doc(firestore, `users/${user.uid}/clients`, clientToDelete.id);
    batch.delete(clientRef);

    // 2. Find all associated projects
    const projectsToDelete = allProjects.filter(p => p.clientId === clientToDelete.id);
    const projectIdsToDelete = new Set(projectsToDelete.map(p => p.id));

    // 3. Delete all associated projects
    projectsToDelete.forEach(project => {
        const projectRef = doc(firestore, `users/${user.uid}/projects`, project.id);
        batch.delete(projectRef);
    });
    
    // 4. Find and delete all associated invoices
    const invoicesToDelete = allInvoices.filter(inv => projectIdsToDelete.has(inv.projectId));
    invoicesToDelete.forEach(invoice => {
        const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoice.id);
        batch.delete(invoiceRef);
    });

    // 5. Find and delete all associated timecards
    const timecardsToDelete = allTimecards.filter(tc => projectIdsToDelete.has(tc.projectId));
    timecardsToDelete.forEach(timecard => {
        const timecardRef = doc(firestore, `users/${user.uid}/timecards`, timecard.id);
        batch.delete(timecardRef);
    });


    try {
        await batch.commit();
        toast({
          title: 'Client and Data Deleted',
          description: `${clientToDelete.name}, along with their projects, invoices, and timecards, has been deleted.`,
        });
    } catch (error) {
        console.error("Error deleting client and associated data: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete the client and their data. Please try again.',
        });
    }

    setClientToDelete(null);
    setIsAlertOpen(false);
  };

  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setIsAlertOpen(true);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setActiveClients((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over!.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update order in Firestore
        if (firestore && user) {
          const batch = writeBatch(firestore);
          newOrder.forEach((client, index) => {
            const clientRef = doc(firestore, `users/${user.uid}/clients`, client.id);
            batch.update(clientRef, { order: index });
          });
          batch.commit().catch(err => {
             toast({
              variant: 'destructive',
              title: 'Error updating order',
              description: 'Could not save the new client order.',
            });
            // Revert local state on failure
            setActiveClients(items);
          });
        }
        
        return newOrder;
      });
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <AddClientDialog />
        </div>
        
         <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={activeClients} strategy={rectSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeClients.map((client) => (
                 <SortableClientItem 
                  key={client.id} 
                  client={client}
                  onEdit={onEditClient}
                  onDelete={openDeleteDialog}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client <span className='font-bold'>{clientToDelete?.name}</span>, all of their associated projects, invoices, and timecards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete Everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
