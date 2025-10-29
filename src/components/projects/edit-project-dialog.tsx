
'use client';

import { useEffect, useMemo } from 'react';
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
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Client, Project, InvoiceTheme } from '@/lib/types';
import { themeStyles } from '../invoices/invoice-html-preview';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { CalendarIcon } from 'lucide-react';

const currencies = ['EUR', 'USD', 'GBP', 'RON'];
const invoiceThemes: InvoiceTheme[] = [
  'Classic', 'Modern', 'Sunset', 'Ocean', 'Monochrome', 'Minty', 'Velvet',
  'Corporate Blue', 'Earthy Tones', 'Creative', 'Slate Gray', 'Dark Charcoal',
  'Navy Blue', 'Forest Green', 'Burgundy', 'Teal', 'Coral', 'Lavender',
  'Golden', 'Steel Blue', 'Light Blue', 'Sky Blue', 'Mint Green', 'Lime',
  'Peach', 'Rose', 'Lilac', 'Sand', 'Olive', 'Maroon', 'Deep Purple',
  'Turquoise', 'Charcoal', 'Crimson', 'Sapphire'
];

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientId: z.string().min(1, 'Please select a client'),
  invoiceTheme: z.string().min(1, 'Please select a theme') as z.ZodType<InvoiceTheme>,
  currency: z.string().min(1, 'Currency is required'),
  invoiceNumberPrefix: z.string().min(1, 'Prefix is required'),
  maxExchangeRate: z.coerce.number().optional(),
  maxExchangeRateDate: z.date().optional(),
  rate: z.coerce.number().optional().refine(val => val === undefined || val > 0, {
    message: 'Rate must be greater than 0.',
  }),
  rateType: z.enum(['daily', 'hourly']).default('daily'),
  hoursPerDay: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if (data.rateType === 'daily' && (!data.hoursPerDay || data.hoursPerDay <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['hoursPerDay'],
            message: 'Hours per day must be > 0.',
        });
    }
});


type ProjectFormValues = z.infer<typeof projectSchema>;

interface EditProjectDialogProps {
    project: Project;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditProjectDialog({ project, isOpen, onOpenChange }: EditProjectDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const clientsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/clients`) : null),
    [firestore, user]
  );
  const { data: clients } = useCollection<Client>(clientsQuery, `users/${user?.uid}/clients`);
  
  const availableClients = useMemo(() => clients?.filter(c => c.id !== 'my-company-details') || [], [clients]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    mode: 'onChange',
    defaultValues: {
      name: project.name,
      clientId: project.clientId,
      invoiceTheme: project.invoiceTheme || 'Classic',
      currency: project.currency || 'EUR',
      invoiceNumberPrefix: project.invoiceNumberPrefix || '',
      maxExchangeRate: project.maxExchangeRate || undefined,
      maxExchangeRateDate: project.maxExchangeRateDate ? parseISO(project.maxExchangeRateDate) : undefined,
      rate: project.rate || undefined,
      rateType: project.rateType || 'daily',
      hoursPerDay: project.hoursPerDay || 8,
    },
  });
  
  const watchedClientId = useWatch({ control: form.control, name: 'clientId' });
  const watchedProjectName = useWatch({ control: form.control, name: 'name' });
  const watchedRateType = useWatch({ control: form.control, name: 'rateType' });

  const suggestedPrefix = useMemo(() => {
    const client = clients?.find(c => c.id === watchedClientId);
    if (!client || !watchedProjectName) return '';
    const clientInitial = client.name.charAt(0).toUpperCase();
    const projectInitial = watchedProjectName.charAt(0).toUpperCase();
    return `${clientInitial}${projectInitial}-`;
  }, [clients, watchedClientId, watchedProjectName]);


  useEffect(() => {
    if (isOpen) {
        form.reset({
            name: project.name,
            clientId: project.clientId,
            invoiceTheme: project.invoiceTheme || 'Classic',
            currency: project.currency || 'EUR',
            invoiceNumberPrefix: project.invoiceNumberPrefix || '',
            maxExchangeRate: project.maxExchangeRate || undefined,
            maxExchangeRateDate: project.maxExchangeRateDate ? parseISO(project.maxExchangeRateDate) : undefined,
            rate: project.rate || undefined,
            rateType: project.rateType || 'daily',
            hoursPerDay: project.hoursPerDay || 8,
        });
    }
  }, [isOpen, project, form]);


  const onSubmit = async (data: ProjectFormValues) => {
    if (!firestore || !user) return;
    const client = clients?.find(c => c.id === data.clientId);
    const projectRef = doc(firestore, `users/${user.uid}/projects`, project.id);
    
    const dataToSave: any = {
      ...project,
      ...data,
      clientName: client?.name
    };

    if (data.maxExchangeRateDate) {
      dataToSave.maxExchangeRateDate = format(data.maxExchangeRateDate, 'yyyy-MM-dd');
    }
    
    if (data.rateType === 'hourly') {
        dataToSave.hoursPerDay = null; // Explicitly nullify
    }

    Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined || dataToSave[key] === '') {
            delete dataToSave[key];
        }
    });

    await setDoc(projectRef, dataToSave, { merge: true });

    toast({
      title: 'Project Updated',
      description: `${data.name} has been updated.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the details for {project.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-3 gap-4 items-end">
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
                  name="invoiceNumberPrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefix</FormLabel>
                      <FormControl>
                        <Input placeholder={suggestedPrefix ? `e.g., ${suggestedPrefix}` : 'e.g. CP-'} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className={cn("grid gap-4 items-end", watchedRateType === 'daily' ? 'grid-cols-4' : 'grid-cols-3')}>
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Rate</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 500" {...field} value={field.value ?? ''} />
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
                      <FormLabel>Currency</FormLabel>
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
                <FormField
                  control={form.control}
                  name="rateType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>&nbsp;</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rate type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">per day</SelectItem>
                          <SelectItem value="hourly">per hour</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedRateType === 'daily' && (
                    <FormField
                    control={form.control}
                    name="hoursPerDay"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Hours/Day</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 8" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
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
                 <p className="text-xs text-muted-foreground px-1">If set, this rate will always be used for this project's invoices.</p>
            </div>
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

    
