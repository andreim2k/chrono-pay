
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectList } from '@/components/projects/project-list';
import { ClientList } from '@/components/projects/client-list';
import { useCollection, useDoc, useFirestore, useMemoFirebase, setDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Client, Project, Invoice, User, Timecard } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { EditClientDialog } from '@/components/projects/edit-client-dialog';
import { DataManagement } from '@/components/data/data-management';

const companySchema = z.object({
    companyName: z.string().min(1, 'Company name is required'),
    companyAddress: z.string().min(1, 'Address is required'),
    companyVat: z.string().min(1, 'VAT is required').regex(/^[A-Z0-9]+$/, 'Invalid VAT format, should be alphanumeric.'),
    companyIban: z.string().min(1, 'IBAN is required').regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/, 'Invalid IBAN. It should start with 2 letters followed by numbers (e.g., DE89370400440532013000).'),
    companyBankName: z.string().min(1, 'Bank name is required'),
    companySwift: z.string().min(1, 'SWIFT/BIC is required').regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Invalid SWIFT/BIC format.'),
    companyPhone: z.string().optional(),
    companyEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function SettingsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const userDocRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, `users/${user.uid}`) : null),
        [firestore, user]
    );
    const { data: myCompany } = useDoc<User>(userDocRef, `users/${user?.uid}`);

    const clientsQuery = useMemoFirebase(
        () => (firestore && user ? collection(firestore, `users/${user.uid}/clients`) : null),
        [firestore, user]
    );
    const { data: clients } = useCollection<Client>(clientsQuery, `users/${user?.uid}/clients`);
    

    const projectsQuery = useMemoFirebase(
        () => (firestore && user ? collection(firestore, `users/${user.uid}/projects`) : null),
        [firestore, user]
    );
    const { data: projects } = useCollection<Project>(projectsQuery, `users/${user?.uid}/projects`);

    const invoicesQuery = useMemoFirebase(
      () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
      [firestore, user]
    );
    const { data: invoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

    const timecardsQuery = useMemoFirebase(
      () => (firestore && user ? collection(firestore, `users/${user.uid}/timecards`) : null),
      [firestore, user]
    );
    const { data: timecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);


    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companySchema),
        mode: 'onChange',
        defaultValues: {
            companyName: '',
            companyVat: '',
            companyAddress: '',
            companyIban: '',
            companyBankName: '',
            companySwift: '',
            companyPhone: '',
            companyEmail: '',
        }
    });

    useEffect(() => {
        if (myCompany) {
            form.reset({
                companyName: myCompany.companyName || '',
                companyAddress: myCompany.companyAddress || '',
                companyVat: myCompany.companyVat || '',
                companyIban: myCompany.companyIban || '',
                companyBankName: myCompany.companyBankName || '',
                companySwift: myCompany.companySwift || '',
                companyPhone: myCompany.companyPhone || '',
                companyEmail: myCompany.companyEmail || '',
            });
        } else {
             form.reset({
                companyName: '',
                companyVat: '',
                companyAddress: '',
                companyIban: '',
                companyBankName: '',
                companySwift: '',
                companyPhone: '',
                companyEmail: '',
            });
        }
    }, [myCompany, form]);


    const handleSaveCompany = (data: CompanyFormValues) => {
        if (!firestore || !user) return;
        const userRef = doc(firestore, `users/${user.uid}`);

        const companyData: Partial<User> = {
            companyName: data.companyName.trim(),
            companyAddress: data.companyAddress.trim(),
            companyVat: data.companyVat.trim(),
            companyIban: data.companyIban.trim(),
            companyBankName: data.companyBankName.trim(),
            companySwift: data.companySwift.trim(),
            companyPhone: data.companyPhone?.trim(),
            companyEmail: data.companyEmail?.trim(),
            companyLogoUrl: myCompany?.companyLogoUrl || `https://picsum.photos/seed/my-company/40/40`
        };

        setDocumentNonBlocking(userRef, companyData, { merge: true });

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
                                  name="companyName"
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
                                  name="companyAddress"
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
                                    name="companyEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>E-Mail Address</FormLabel>
                                            <FormControl><Input placeholder="contact@company.com" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="companyPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telephone</FormLabel>
                                            <FormControl><Input placeholder="+44 123 456 789" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                              </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                      control={form.control}
                                      name="companyVat"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>VAT Number</FormLabel>
                                              <FormControl><Input placeholder="Your VAT Number" {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                      control={form.control}
                                      name="companyBankName"
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
                                      name="companySwift"
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
                                      name="companyIban"
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
                clients={clients || []}
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
                    clients: clients || [],
                    projects: projects || [],
                    invoices: invoices || [],
                    timecards: timecards || [],
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
