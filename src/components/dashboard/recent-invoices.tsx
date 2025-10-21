
'use client';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
                                <AvatarFallback>{invoice.clientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1 flex-1">
                                <p className="text-sm font-medium leading-none">{invoice.clientName}</p>
                                <p className="text-xs text-muted-foreground">
                                {invoice.invoiceNumber} &middot; {format(new Date(invoice.date), 'MMM d, yyyy')}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-medium text-right w-24">{currencySymbols[invoice.currency] || invoice.currency}{invoice.total.toFixed(2)}</p>
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
