
'use client';
import {
    Avatar,
    AvatarFallback,
  } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import type { Invoice } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { format, parse } from "date-fns";

const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
};

export function RecentInvoices({ invoices }: { invoices: Invoice[] }) {

    const getBadgeVariant = (status: Invoice['status']) => {
        switch (status) {
          case 'Paid':
            return 'default';
          case 'Sent':
            return 'secondary';
          case 'Created':
            return 'outline';
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
                const startDate = parse(match[1], 'dd.MM.yyyy', new Date());
                return `for ${format(startDate, 'MMMM')}`;
            } catch (e) {
                return ''; // Date parsing failed
            }
        }
        return '';
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Your 5 most recent invoices.</CardDescription>
            </CardHeader>
            <CardContent>
            {invoices.length > 0 ? (
                <div className="space-y-4">
                    {invoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center gap-4">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback>{getInitials(invoice.clientName)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1 flex-1">
                                <p className="text-sm font-medium leading-none">{invoice.clientName}</p>
                                <p className="text-xs text-muted-foreground">
                                {invoice.invoiceNumber} &middot; {format(new Date(invoice.date), 'MMM d, yyyy')}
                                <span className='italic ml-1'>{getServiceMonth(invoice)}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right w-28">
                                    <p className="font-medium">
                                        {(currencySymbols[invoice.currency] || invoice.currency) + invoice.total.toFixed(2)}
                                    </p>
                                    {typeof invoice.vatAmount === 'number' && invoice.vatAmount > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                           incl. VAT {(currencySymbols[invoice.currency] || invoice.currency) + invoice.vatAmount.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                                <Badge variant={getBadgeVariant(invoice.status)} className="w-20 justify-center">{invoice.status}</Badge>
                            </div>
                        </div>
                    ))}
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
