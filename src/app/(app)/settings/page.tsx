'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectList } from '@/components/projects/project-list';
import { ClientList } from '@/components/projects/client-list';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Client, Project } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { EditClientDialog } from '@/components/projects/edit-client-dialog';

const companySchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    vat: z.string().min(1, 'VAT is required'),
    address: z.string().min(1, 'Address is required'),
    iban: z.string().min(1, 'IBAN is required'),
    bankName: z.string().optional(),
    swift: z.string().optional(),
    vatRate: z.coerce.number().min(0, 'VAT rate must be positive').optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function SettingsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);


    const clientsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'clients') : null),
        [firestore]
    );
    const { data: clients } = useCollection<Client>(clientsQuery);
    
    const projectsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'projects') : null),
        [firestore]
    );
    const { data: projects } = useCollection<Project>(projectsQuery);

    const myCompany = clients ? clients.find(c => c.id === 'my-company-details') : null;

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            name: '',
            vat: '',
            address: '',
            iban: '',
            bankName: '',
            swift: '',
            vatRate: 0,
        }
    });

    useEffect(() => {
        if (myCompany) {
            form.reset({
                name: myCompany.name || '',
                address: myCompany.address || '',
                vat: myCompany.vat || '',
                iban: myCompany.iban || '',
                bankName: myCompany.bankName || '',
                swift: myCompany.swift || '',
                vatRate: myCompany.vatRate ? myCompany.vatRate * 100 : 0,
            });
        } else {
             form.reset({
                name: '',
                vat: '',
                address: '',
                iban: '',
                bankName: '',
                swift: '',
                vatRate: 0,
            });
        }
    }, [myCompany, form]);


    const handleSaveCompany = (data: CompanyFormValues) => {
        if (!firestore) return;
        const companyRef = doc(firestore, `clients`, 'my-company-details');

        const companyData: Omit<Client, 'id'> = {
            ...data,
            vatRate: data.vatRate ? data.vatRate / 100 : 0,
            logoUrl: `https://picsum.photos/seed/my-company/40/40`
        };

        setDocumentNonBlocking(companyRef, companyData, { merge: true });

        toast({
            title: 'Company Details Saved',
            description: 'Your company information has been updated.',
        });
    }
    
    const onEditClient = (client: Client) => {
        setClientToEdit(client);
        setIsEditOpen(true);
    }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and workspace settings.
          </p>
        </div>
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="company">My Company</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
          <TabsContent value="company">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSaveCompany)}>
                      <Card>
                          <CardHeader>
                          <CardTitle>My Company</CardTitle>
                          <CardDescription>
                              Details of the company that issues invoices. This will appear on all your invoices.
                          </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                      control={form.control}
                                      name="name"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Company Name</FormLabel>
                                              <FormControl><Input {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  <FormField
                                      control={form.control}
                                      name="vat"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>VAT Number</FormLabel>
                                              <FormControl><Input {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              </div>
                               <FormField
                                  control={form.control}
                                  name="address"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Address</FormLabel>
                                          <FormControl><Input {...field} /></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                      control={form.control}
                                      name="bankName"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Bank Name</FormLabel>
                                              <FormControl><Input {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  <FormField
                                      control={form.control}
                                      name="swift"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>SWIFT/BIC</FormLabel>
                                              <FormControl><Input {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                      control={form.control}
                                      name="iban"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>IBAN</FormLabel>
                                              <FormControl><Input {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                   <FormField
                                      control={form.control}
                                      name="vatRate"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>VAT Rate (%)</FormLabel>
                                              <FormControl><Input type="number" {...field} /></FormControl>
                                              <FormDescription>Enter the percentage, e.g., 19 for 19%.</FormDescription>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              </div>
                          </CardContent>
                          <CardFooter>
                              <Button type="submit">Save Company Details</Button>
                          </CardFooter>
                      </Card>
                  </form>
              </Form>
          </TabsContent>
          <TabsContent value="clients">
            <ClientList 
                clients={clients?.filter(c => c.id !== 'my-company-details') || []}
                onEditClient={onEditClient}
             />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectList projects={projects || []} />
          </TabsContent>
        </Tabs>
      </div>
      {clientToEdit && (
        <EditClientDialog 
          client={clientToEdit} 
          isOpen={isEditOpen} 
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              setClientToEdit(null);
            }
          }}
        />
      )}
    </>
  );
}
