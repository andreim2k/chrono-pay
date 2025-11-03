
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
import { PlusCircle, CalendarIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, addDocumentNonBlocking, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Client, InvoiceTheme, Project } from '@/lib/types';
import { themeStyles } from '../invoices/invoice-html-preview';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';

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

export function AddProjectDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const clientsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/clients`) : null),
    [firestore, user]
  );
  const { data: clients } = useCollection<Client>(clientsQuery, `users/${user?.uid}/clients`);
  
  const projectsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `users/${user.uid}/projects`)) : null),
    [firestore, user]
  );
  const { data: projects } = useCollection<Project>(projectsQuery, `users/${user?.uid}/projects`);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      clientId: '',
      invoiceTheme: 'Classic',
      currency: 'EUR',
      invoiceNumberPrefix: '',
      rate: undefined,
      rateType: 'daily',
      hoursPerDay: 8,
      maxExchangeRate: undefined,
      maxExchangeRateDate: undefined,
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


  const onSubmit = (data: ProjectFormValues) => {
    if (!firestore || !user) return;
    const client = clients?.find(c => c.id === data.clientId);
    const projectsCollection = collection(firestore, `users/${user.uid}/projects`);
    
    const dataToSave: any = {
      ...data,
      name: data.name.trim(),
      invoiceNumberPrefix: data.invoiceNumberPrefix.trim(),
      clientName: client?.name,
      order: projects?.length || 0,
    };

    if (data.maxExchangeRateDate) {
      dataToSave.maxExchangeRateDate = format(data.maxExchangeRateDate, 'yyyy-MM-dd');
    }

    if (data.rateType === 'hourly') {
        delete dataToSave.hoursPerDay;
    }

    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === undefined || dataToSave[key] === '' || dataToSave[key] === null) {
        delete dataToSave[key];
      }
    });

    addDocumentNonBlocking(projectsCollection, dataToSave);

    toast({
      title: 'Project Added',
      description: `${data.name.trim()} has been added for ${client?.name}.`,
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Enter the details of the new project.
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
                        {clients?.map(client => (
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
                                <div className="h-4 w-6 rounded border flex overflow-hidden">
                                    <div className="w-1/2" style={{ backgroundColor: themeStyles[field.value].accentColor }} />
                                    <div className="w-1/2" style={{ backgroundColor: themeStyles[field.value].tableHeaderBgColor }} />
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
                             <div className="h-4 w-6 rounded border flex overflow-hidden">
                                <div className="w-1/2" style={{ backgroundColor: themeStyles[theme].accentColor }} />
                                <div className="w-1/2" style={{ backgroundColor: themeStyles[theme].tableHeaderBgColor }} />
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
