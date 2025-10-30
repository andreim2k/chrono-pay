
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth, isSameMonth, isSameYear, getDate } from 'date-fns';
import { Calendar } from '../ui/calendar';
import type { Client, Project, Timecard } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import type { DateRange } from 'react-day-picker';

const timecardSchema = z.object({
  projectId: z.string().min(1, 'Please select a project'),
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date().optional(),
  }),
  hours: z.coerce.number().min(0.25, 'Minimum hours is 0.25').max(1000, 'Maximum hours is 1000'),
  description: z.string().optional(),
});

type TimecardFormValues = z.infer<typeof timecardSchema>;

interface AddTimecardDialogProps {
    projects: Project[];
    clients: Client[];
    timecardToEdit?: Timecard | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

function calculateWorkHours(startDate?: Date, endDate?: Date): number {
    if (!startDate) return 0;
    const effectiveEndDate = endDate || startDate;

    const days = eachDayOfInterval({ start: startDate, end: effectiveEndDate });
    const workdays = days.filter(day => !isWeekend(day));
    
    return workdays.length * 8;
}

export function AddTimecardDialog({ projects, clients, timecardToEdit, isOpen, onOpenChange }: AddTimecardDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<TimecardFormValues>({
    resolver: zodResolver(timecardSchema),
    defaultValues: {
      projectId: '',
      dateRange: { from: new Date(), to: undefined },
      hours: 8,
      description: '',
    },
  });

  useEffect(() => {
    if (timecardToEdit) {
        form.reset({
            projectId: timecardToEdit.projectId,
            dateRange: { 
                from: new Date(timecardToEdit.startDate.replace(/-/g, '/')), 
                to: new Date(timecardToEdit.endDate.replace(/-/g, '/')) 
            },
            hours: timecardToEdit.hours,
            description: timecardToEdit.description || '',
        });
    } else {
        const today = new Date();
        form.reset({
            projectId: '',
            dateRange: { from: today, to: today },
            hours: 8,
            description: '',
        });
    }
  }, [timecardToEdit, form, isOpen]);

  const watchedDateRange = form.watch("dateRange");

  useEffect(() => {
      const { from, to } = watchedDateRange || {};
      const calculatedHours = calculateWorkHours(from, to);
      if (calculatedHours > 0) {
          form.setValue('hours', calculatedHours, { shouldValidate: true });
      } else if (from && !to) {
           form.setValue('hours', 8);
      }
  }, [watchedDateRange, form]);
  
  const disabledDates = useMemo(() => {
    if (watchedDateRange?.from) {
      const start = startOfMonth(watchedDateRange.from);
      const end = endOfMonth(watchedDateRange.from);
      return (date: Date) => date < start || date > end;
    }
    return undefined;
  }, [watchedDateRange?.from]);

  const onSubmit = (data: TimecardFormValues) => {
    if (!firestore || !user || !data.dateRange.from) return;
    
    const project = projects.find(p => p.id === data.projectId);
    const client = clients.find(c => c.id === project?.clientId);

    if (!project || !client) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find client or project.' });
        return;
    }

    const timecardData = {
      projectId: project.id,
      projectName: project.name,
      clientId: client.id,
      clientName: client.name,
      startDate: format(data.dateRange.from, 'yyyy-MM-dd'),
      endDate: format(data.dateRange.to || data.dateRange.from, 'yyyy-MM-dd'),
      hours: data.hours,
      description: data.description,
      status: 'Unbilled' as const,
    };

    if (timecardToEdit) {
        const timecardRef = doc(firestore, `users/${user.uid}/timecards`, timecardToEdit.id);
        setDocumentNonBlocking(timecardRef, timecardData, { merge: true });
        toast({
            title: 'Timecard Updated',
            description: `Your time entry has been updated.`,
        });
    } else {
        const timecardsCollection = collection(firestore, `users/${user.uid}/timecards`);
        addDocumentNonBlocking(timecardsCollection, timecardData);
        toast({
            title: 'Timecard Logged',
            description: `${data.hours} hours logged for ${project.name}.`,
        });
    }
    
    onOpenChange(false);
  };
  
  const formatDateDisplay = (from: Date, to?: Date) => {
    if (!to || from.getTime() === to.getTime()) {
      return `${getDate(from)} of ${format(from, "MMM yyyy")}`;
    }
    
    if (isSameMonth(from, to) && isSameYear(from, to)) {
      return `${getDate(from)} - ${getDate(to)} of ${format(from, "MMM yyyy")}`;
    }
    
    return `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {!timecardToEdit && (
        <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Time Entry
            </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{timecardToEdit ? 'Edit Time Entry' : 'Add New Time Entry'}</DialogTitle>
          <DialogDescription>
            {timecardToEdit ? 'Update the details of your time entry.' : 'Log your work hours for a project.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} ({project.clientName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date Range</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value.from && "text-muted-foreground"
                              )}
                            >
                               {field.value.from ? (
                                    formatDateDisplay(field.value.from, field.value.to)
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value.from}
                            selected={{from: field.value.from, to: field.value.to}}
                            onSelect={field.onChange}
                            numberOfMonths={1}
                            disabled={disabledDates}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.25" placeholder="8" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Worked on feature X, attended meeting Y..." {...field} value={field.value ?? ''}/>
                  </FormControl>
                   <FormDescription>
                    Optional notes about the work performed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{timecardToEdit ? 'Save Changes' : 'Add Entry'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
