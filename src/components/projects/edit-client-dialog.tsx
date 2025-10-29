
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Client } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';

const languages = ['English', 'Romanian'];

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  address: z.string().min(1, 'Address is required'),
  vat: z.string().optional(),
  iban: z.string().optional(),
  bankName: z.string().optional(),
  swift: z.string().optional(),
  language: z.string().min(1, 'Language is required'),
  vatRate: z.coerce.number().min(0, "VAT rate can't be negative").optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface EditClientDialogProps {
    client: Client;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditClientDialog({ client, isOpen, onOpenChange }: EditClientDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client.name,
      address: client.address,
      vat: client.vat,
      iban: client.iban,
      bankName: client.bankName,
      swift: client.swift,
      language: client.language || 'English',
      vatRate: client.vatRate ? client.vatRate * 100 : undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset({
            name: client.name,
            address: client.address,
            vat: client.vat,
            iban: client.iban,
            bankName: client.bankName,
            swift: client.swift,
            language: client.language || 'English',
            vatRate: client.vatRate ? client.vatRate * 100 : undefined,
        });
    }
  }, [isOpen, client, form]);

  const onSubmit = async (data: ClientFormValues) => {
    if (!firestore || !user) return;
    const clientRef = doc(firestore, `users/${user.uid}/clients`, client.id);

    const dataToSave: any = {
      ...client, // Preserve existing fields like order, logoUrl
      ...data,
      vatRate: data.vatRate ? data.vatRate / 100 : 0,
    };

    // Remove undefined fields to prevent Firestore errors
    Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
            delete dataToSave[key];
        }
    });

    await setDoc(clientRef, dataToSave, { merge: true });
    
    toast({
      title: 'Client Updated',
      description: `${data.name} has been updated.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update the details for {client.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Innovate Inc." {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input placeholder="123 Tech Street, Silicon Valley, CA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="vat"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>VAT Number (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="US123456789" {...field} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Invoice Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {languages.map(lang => (
                            <SelectItem key={lang} value={lang}>
                                {lang}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Bank Name (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="Client Bank Name" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="swift"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>SWIFT/BIC (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="DEUTDEFF" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <FormField
            control={form.control}
            name="iban"
            render={({ field }) => (
                <FormItem>
                <FormLabel>IBAN (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="DE89370400440532013000" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
              control={form.control}
              name="vatRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT Rate (%) (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 19" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
