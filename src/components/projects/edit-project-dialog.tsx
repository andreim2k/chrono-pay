
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Client, Project, InvoiceTheme } from '@/lib/types';
import { themeStyles } from '../invoices/invoice-html-preview';

const invoiceThemes: InvoiceTheme[] = ['Classic', 'Modern', 'Sunset', 'Ocean', 'Monochrome', 'Minty', 'Velvet', 'Corporate Blue', 'Earthy Tones', 'Creative'];

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientId: z.string().min(1, 'Please select a client'),
  invoiceTheme: z.string().min(1, 'Please select a theme') as z.ZodType<InvoiceTheme>,
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface EditProjectDialogProps {
    project: Project;
    children: React.ReactNode;
}

export function EditProjectDialog({ project, children }: EditProjectDialogProps) {
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
      name: project.name,
      clientId: project.clientId,
      invoiceTheme: project.invoiceTheme || 'Classic',
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    if (!firestore) return;
    const client = clients?.find(c => c.id === data.clientId);
    const projectRef = doc(firestore, `projects`, project.id);
    
    setDocumentNonBlocking(projectRef, { 
      ...data, 
      clientName: client?.name 
    }, { merge: true });

    toast({
      title: 'Project Updated',
      description: `${data.name} has been updated.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the details for {project.name}.
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
                                    <div className="w-1/3" style={{ backgroundColor: themeStyles[field.value].accentColor }} />
                                    <div className="w-2/3" style={{ backgroundColor: themeStyles[field.value].tableHeaderBgColor }} />
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
                                <div className="w-1/3" style={{ backgroundColor: themeStyles[theme].accentColor }} />
                                <div className="w-2/3" style={{ backgroundColor: themeStyles[theme].tableHeaderBgColor }} />
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
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
