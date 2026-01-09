
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';

const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON',
};

export function UnpaidByClientChart({ invoices }: { invoices: Invoice[] }) {
    const clientData = useMemo(() => {
        const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid');
        const amounts: { [clientName: string]: number } = {};

        unpaidInvoices.forEach(inv => {
            if (!amounts[inv.clientName]) {
                amounts[inv.clientName] = 0;
            }
            amounts[inv.clientName] += inv.totalRon || (inv.total * (inv.exchangeRate || 1));
        });

        return Object.entries(amounts).map(([clientName, totalAmount]) => ({
            client: clientName,
            amount: totalAmount,
        })).sort((a, b) => b.amount - a.amount);

    }, [invoices]);

    const chartConfig = {
        amount: {
            label: 'Unpaid (RON)',
            color: 'hsl(var(--destructive))',
        },
    };
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Balances (RON)</CardTitle>
        <CardDescription>Total unpaid amounts (including VAT) by client, shown in RON.</CardDescription>
      </CardHeader>
      <CardContent>
        {clientData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart accessibilityLayer data={clientData} layout="vertical" margin={{ left: 10 }}>
                <YAxis
                    dataKey="client"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-muted-foreground text-xs"
                    width={110}
                    interval={0}
                 />
                <XAxis dataKey="amount" type="number" hide />
                <Tooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    content={<ChartTooltipContent 
                        indicator="dot" 
                        formatter={(value) => `RON ${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                    />}
                />
                <Bar 
                    dataKey="amount" 
                    fill="var(--color-amount)" 
                    radius={5} 
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No unpaid invoices to display.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
