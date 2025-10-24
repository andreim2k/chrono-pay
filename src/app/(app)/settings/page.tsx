
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
import type { Client, Project, Invoice } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { EditClientDialog } from '@/components/projects/edit-client-dialog';
import { DataManagement } from '@/components/data/data-management';

const companySchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    address: z.string().min(1, 'Address is required'),
    vat: z.string().min(1, 'VAT is required').regex(/^[A-Z0-9]+$/, 'Invalid VAT format, should be alphanumeric.'),
    iban: z.string().min(1, 'IBAN is required').regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/, 'Invalid IBAN. It should start with 2 letters followed by numbers (e.g., DE89370400440532013000).'),
    bankName: z.string().min(1, 'Bank name is required'),
    swift: z.string().min(1, 'SWIFT/BIC is required').regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Invalid SWIFT/BIC format.'),
    vatRate: z.coerce.number().min(0, 'VAT rate must be positive').multipleOf(0.01, { message: "VAT rate can have at most 2 decimal places." }),
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

    const invoicesQuery = useMemoFirebase(
      () => (firestore ? collection(firestore, 'invoices') : null),
      [firestore]
    );
    const { data: invoices } = useCollection<Invoice>(invoicesQuery);

    const myCompany = useMemo(() => clients?.find(c => c.id === 'my-company-details'), [clients]);
    const actualClients = useMemo(() => clients?.filter(c => c.id !== 'my-company-details') || [], [clients]);

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companySchema),
        mode: 'onChange',
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
            logoUrl: myCompany?.logoUrl || `https://picsum.photos/seed/my-company/40/40`
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
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="company">My Company</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
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
                                          <FormControl><Input placeholder="Your Company Name" {...field} /></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                               <FormField
                                  control={form.control}
                                  name="address"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Address</FormLabel>
                                          <FormControl><Input placeholder="Your Company Address" {...field} /></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                            </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                      control={form.control}
                                      name="vat"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>VAT Number</FormLabel>
                                              <FormControl><Input placeholder="Your VAT Number" {...field} /></FormControl>
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
                                              <FormControl><Input type="number" placeholder="e.g., 19" step="0.01" {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                      control={form.control}
                                      name="bankName"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Bank Name</FormLabel>
                                              <FormControl><Input placeholder="Your Bank Name" {...field} /></FormControl>
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
                                              <FormControl><Input placeholder="Your SWIFT/BIC Code" {...field} /></FormControl>
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
                                              <FormControl><Input placeholder="Your IBAN" {...field} /></FormControl>
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
                clients={actualClients}
                onEditClient={onEditClient}
             />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectList projects={projects || []} />
          </TabsContent>
           <TabsContent value="data">
             <DataManagement
                data={{
                    myCompany: myCompany || {},
                    clients: actualClients,
                    projects: projects || [],
                    invoices: invoices || [],
                }}
             />
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
