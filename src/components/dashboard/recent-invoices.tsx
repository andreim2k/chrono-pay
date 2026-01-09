
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
import type { Invoice, User } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { format, parseISO, isPast, isFuture, differenceInDays } from "date-fns";
import type { VariantProps } from "class-variance-authority";

const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON',
};

export function RecentInvoices({ invoices, myCompany }: { invoices: Invoice[], myCompany: User | null }) {

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
    
    const shouldShowRon = myCompany?.companyIbans && 'RON' in myCompany.companyIbans;


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
                        const displayInRon = shouldShowRon && invoice.currency !== 'RON' && invoice.totalRon;
                        const displayAmount = displayInRon ? invoice.totalRon : invoice.total;
                        const displayCurrency = displayInRon ? 'RON' : invoice.currency;
                        const currencySymbol = currencySymbols[displayCurrency] || displayCurrency;

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
                                    <div className="text-right w-32">
                                        <p className="font-medium">
                                            {displayCurrency === 'RON' ? `${displayAmount.toFixed(2)} RON` : `${currencySymbol}${displayAmount.toFixed(2)}`}
                                        </p>
                                        {typeof invoice.vatAmount === 'number' && invoice.vatAmount > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                            incl. VAT {displayInRon 
                                                ? `${((invoice.vatAmount || 0) * (invoice.exchangeRate || 1)).toFixed(2)} RON`
                                                : `${currencySymbols[invoice.currency] || invoice.currency}${invoice.vatAmount.toFixed(2)}`
                                        }
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
