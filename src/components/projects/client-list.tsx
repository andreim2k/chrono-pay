
'use client';

import { useState } from 'react';
import type { Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { AddClientDialog } from './add-client-dialog';
import { EditClientDialog } from './edit-client-dialog';
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
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';


interface ClientListProps {
  clients: Client[];
}

export function ClientList({ clients }: ClientListProps) {
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!firestore || !clientToDelete) return;
    const clientRef = doc(firestore, `clients`, clientToDelete.id);
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

  const openEditDialog = (client: Client) => {
    setClientToEdit(client);
    setIsEditOpen(true);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <AddClientDialog />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className='flex items-start gap-4'>
                  <Avatar>
                    <AvatarImage src={client.logoUrl} data-ai-hint="logo" />
                    <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => openEditDialog(client)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive" 
                      onSelect={() => openDeleteDialog(client)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>{client.address}</p>
                  <p>VAT: {client.vat}</p>
                  <p>IBAN: {client.iban}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {clientToEdit && (
        <EditClientDialog 
          client={clientToEdit} 
          isOpen={isEditOpen} 
          onOpenChange={setIsEditOpen} 
        />
      )}
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
