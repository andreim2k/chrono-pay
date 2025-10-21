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
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Switch } from '../ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { useEffect } from 'react';


const currencies = ['EUR', 'USD', 'GBP', 'RON'];
const languages = ['English', 'Romanian'];

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  address: z.string().min(1, 'Address is required'),
  vat: z.string().min(1, 'VAT number is required'),
  iban: z.string().min(1, 'IBAN is required'),
  currency: z.string().min(1, 'Currency is required'),
  language: z.string().min(1, 'Language is required'),
  invoiceNumberPrefix: z.string().optional(),
  hasVat: z.boolean().default(false),
  maxExchangeRate: z.coerce.number().optional(),
  maxExchangeRateDate: z.date().optional(),
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

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client.name,
      address: client.address,
      vat: client.vat,
      iban: client.iban,
      currency: client.currency || 'EUR',
      language: client.language || 'English',
      invoiceNumberPrefix: client.invoiceNumberPrefix || '',
      hasVat: client.hasVat || false,
      maxExchangeRate: client.maxExchangeRate || undefined,
      maxExchangeRateDate: client.maxExchangeRateDate ? parseISO(client.maxExchangeRateDate) : undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset({
            name: client.name,
            address: client.address,
            vat: client.vat,
            iban: client.iban,
            currency: client.currency || 'EUR',
            language: client.language || 'English',
            invoiceNumberPrefix: client.invoiceNumberPrefix || '',
            hasVat: client.hasVat || false,
            maxExchangeRate: client.maxExchangeRate || undefined,
            maxExchangeRateDate: client.maxExchangeRateDate ? parseISO(client.maxExchangeRateDate) : undefined,
        });
    }
  }, [isOpen, client, form]);

  const onSubmit = (data: ClientFormValues) => {
    if (!firestore) return;
    const clientRef = doc(firestore, `clients`, client.id);

    const dataToSave: any = {
      ...data,
      logoUrl: client.logoUrl
    };

    if (data.maxExchangeRateDate) {
      dataToSave.maxExchangeRateDate = format(data.maxExchangeRateDate, 'yyyy-MM-dd');
    }

    setDocumentNonBlocking(clientRef, dataToSave, { merge: true });
    
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
                    <FormLabel>VAT Number</FormLabel>
                    <FormControl>
                        <Input placeholder="US123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Default Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {currencies.map(currency => (
                            <SelectItem key={currency} value={currency}>
                                {currency}
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
                name="iban"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                        <Input placeholder="DE89370400440532013000" {...field} />
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
                name="invoiceNumberPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="INV-" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2 rounded-lg border p-3 shadow-sm">
                 <div className="grid grid-cols-2 items-end gap-4">
                     <FormField
                        control={form.control}
                        name="maxExchangeRate"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Fixed Exchange Rate (RON)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 5.0" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="maxExchangeRateDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Date of Rate</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                 </div>
                 <p className="text-xs text-muted-foreground px-1">If set, this rate will always be used for this client's invoices.</p>
            </div>

             <FormField
                control={form.control}
                name="hasVat"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Apply VAT</FormLabel>
                            <p className="text-xs text-muted-foreground">
                               If checked, VAT will be added to this client's invoices based on your company's VAT rate.
                            </p>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
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
