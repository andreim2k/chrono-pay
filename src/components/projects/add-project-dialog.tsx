'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Client, InvoiceTheme } from '@/lib/types';
import { themeStyles } from '../invoices/invoice-html-preview';

const invoiceThemes: InvoiceTheme[] = ['Classic', 'Modern', 'Sunset', 'Ocean', 'Monochrome', 'Minty', 'Velvet', 'Corporate Blue', 'Earthy Tones', 'Creative'];

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientId: z.string().min(1, 'Please select a client'),
  invoiceTheme: z.string().min(1, 'Please select a theme') as z.ZodType<InvoiceTheme>,
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export function AddProjectDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clients') : null),
    [firestore]
  );
  const { data: clients } = useCollection<Client>(clientsQuery);

  const availableClients = useMemo(() => clients?.filter(c => c.id !== 'my-company-details') || [], [clients]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      clientId: '',
      invoiceTheme: 'Classic',
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    if (!firestore) return;
    const client = clients?.find(c => c.id === data.clientId);
    const projectsCollection = collection(firestore, 'projects');
    
    addDocumentNonBlocking(projectsCollection, { 
      ...data, 
      clientName: client?.name 
    });

    toast({
      title: 'Project Added',
      description: `${data.name} has been added for ${client?.name}.`,
    });
    form.reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Enter the details of the new project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Project Phoenix" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="invoiceTheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Invoice Theme</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                         <SelectValue>
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-8 rounded-sm border flex overflow-hidden">
                                    <div className="w-1/3" style={{ backgroundColor: themeStyles[field.value].accent.replace('border-','').replace('-600','-500').replace('-800','-500').replace('-400','-300').replace('-700','-500') }} />
                                    <div className="w-2/3" style={{ backgroundColor: themeStyles[field.value].tableHeaderBg.replace('bg-', '') }} />
                                </div>
                                {field.value}
                            </div>
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {invoiceThemes.map(theme => (
                        <SelectItem key={theme} value={theme}>
                          <div className="flex items-center gap-3">
                            <div className="h-5 w-8 rounded-sm border flex overflow-hidden">
                                <div className="w-1/3" style={{ backgroundColor: themeStyles[theme].accent.replace('border-','').replace('-600','-500').replace('-800','-500').replace('-400','-300').replace('-700','-500') }} />
                                <div className="w-2/3" style={{ backgroundColor: themeStyles[theme].tableHeaderBg.replace('bg-', '') }} />
                            </div>
                            {theme}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Project</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}