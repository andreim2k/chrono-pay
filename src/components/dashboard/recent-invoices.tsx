
'use client';
import {
    Avatar,
    AvatarFallback,
  } from "@/components/ui/avatar"
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import type { Invoice, User, Client, Project } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { format, parseISO, isPast, isFuture, differenceInDays } from "date-fns";
import type { VariantProps } from "class-variance-authority";
import { useMemo } from "react";

const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON',
};

export function RecentInvoices({ invoices, myCompany, clients, projects }: { invoices: Invoice[], myCompany: User | null, clients: Client[], projects: Project[] }) {

    const clientsById = useMemo(() => {
        return new Map(clients.map(c => [c.id, c]));
    }, [clients]);

    const projectsById = useMemo(() => {
        return new Map(projects.map(p => [p.id, p]));
    }, [projects]);

    const getBadgeVariant = (status: Invoice['status']): VariantProps<typeof badgeVariants>['variant'] => {
        switch (status) {
          case 'Paid':
            return 'success';
          case 'Sent':
            return 'warning';
          case 'Created':
            return 'info';
          default:
            return 'secondary';
        }
    };
    
    const getServiceMonth = (invoice: Invoice) => {
        const description = invoice.items?.[0]?.description;
        if (!description) return '';

        const periodRegex = /period ([\d\.]+) -/;
        const match = description.match(periodRegex);

        if (match && match[1]) {
            try {
                // Assuming format is dd.MM.yyyy
                const startDate = parseISO(match[1].split('.').reverse().join('-'));
                return `for ${format(startDate, 'MMMM')}`;
            } catch (e) {
                return ''; // Date parsing failed
            }
        }
        return '';
    };

    const getDueDateStyles = (invoice: Invoice) => {
        if (invoice.status === 'Paid') return '';
        const dueDate = parseISO(invoice.dueDate);
        const today = new Date();
        // Reset hours to compare dates only
        today.setHours(0, 0, 0, 0);

        if (isPast(dueDate) && format(dueDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
            return 'text-destructive';
        }
        if (isFuture(dueDate) && differenceInDays(dueDate, today) <= 7) {
            return 'text-amber-600 dark:text-amber-500';
        }
        return '';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Your 5 most recent invoices.</CardDescription>
            </CardHeader>
            <CardContent>
            {invoices.length > 0 ? (
                <div className="space-y-4">
                    {invoices.map((invoice) => {
                        const project = projectsById.get(invoice.projectId);
                        const client = clientsById.get(project?.clientId || '');
                        const displayInRon = client?.preferredCompanyIbanCurrency === 'RON' && invoice.currency !== 'RON';

                        let totalDisplay, vatDisplay;
                        if (displayInRon && invoice.totalRon) {
                            totalDisplay = `${invoice.totalRon.toFixed(2)} RON`;
                            const vatInRon = (invoice.vatAmount || 0) * (invoice.exchangeRate || 1);
                            vatDisplay = `incl. VAT ${vatInRon.toFixed(2)} RON`;
                        } else {
                            const currencySymbol = currencySymbols[invoice.currency] || invoice.currency;
                            totalDisplay = `${currencySymbol}${invoice.total.toFixed(2)}`;
                             if (invoice.vatAmount && invoice.vatAmount > 0) {
                                vatDisplay = `incl. VAT ${currencySymbol}${invoice.vatAmount.toFixed(2)}`;
                            }
                        }

                        return (
                            <div key={invoice.id} className="flex items-center gap-4">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>{getInitials(invoice.clientName)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1 flex-1">
                                    <p className="text-sm font-medium leading-none">{invoice.clientName}</p>
                                    <p className="text-xs text-muted-foreground">
                                    {invoice.invoiceNumber} &middot; {format(parseISO(invoice.date), 'MMM d, yyyy')}
                                    <span className='italic mx-1'>{getServiceMonth(invoice)}</span>
                                    &middot; <span className={cn('font-medium', getDueDateStyles(invoice))}>Due {format(parseISO(invoice.dueDate), 'MMM d, yyyy')}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right w-36">
                                        <p className="font-medium">
                                           {totalDisplay}
                                        </p>
                                        {vatDisplay && (
                                            <p className="text-xs text-muted-foreground">
                                                {vatDisplay}
                                            </p>
                                        )}
                                    </div>
                                    <Badge variant={getBadgeVariant(invoice.status)} className="w-20 justify-center">{invoice.status}</Badge>
                                </div>
                            </div>
                        )
                    })}
                </div>
             ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <p>No recent invoices to display.</p>
                </div>
            )}
            </CardContent>
        </Card>
    )
}
