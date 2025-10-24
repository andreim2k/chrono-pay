
'use client';

import { useState, useEffect } from 'react';
import type { Client } from '@/lib/types';
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
import { useFirestore, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
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

  const handleDelete = () => {
    if (!firestore || !clientToDelete || !user) return;
    const clientRef = doc(firestore, `users/${user.uid}/clients`, clientToDelete.id);
    deleteDocumentNonBlocking(clientRef);
    toast({
      title: 'Client Deleted',
      description: `${clientToDelete.name} has been deleted.`,
    });
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
