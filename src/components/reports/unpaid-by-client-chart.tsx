
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
        const amounts: { [clientName: string]: { [currency: string]: number } } = {};

        unpaidInvoices.forEach(inv => {
            if (!amounts[inv.clientName]) {
                amounts[inv.clientName] = {};
            }
            if (!amounts[inv.clientName][inv.currency]) {
                amounts[inv.clientName][inv.currency] = 0;
            }
            amounts[inv.clientName][inv.currency] += inv.total;
        });

        // For simplicity, we assume one currency per client or convert to a primary currency.
        // This implementation just picks the first currency found for a client.
        return Object.entries(amounts).map(([clientName, currencyAmounts]) => {
            const primaryCurrency = Object.keys(currencyAmounts)[0] || '';
            const totalAmount = Object.values(currencyAmounts).reduce((sum, amount) => sum + amount, 0);

            return {
                client: clientName,
                amount: totalAmount,
                currency: primaryCurrency,
            }
        }).sort((a, b) => b.amount - a.amount);

    }, [invoices]);

    const chartConfig = {
        amount: {
            label: 'Unpaid',
            color: 'hsl(var(--destructive))',
        },
    };
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Balances</CardTitle>
        <CardDescription>Total unpaid amounts (including VAT) by client.</CardDescription>
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
                        formatter={(value, name, props) => {
                            const { payload } = props;
                            const symbol = currencySymbols[payload.currency] || payload.currency;
                            return `${symbol}${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                        }} 
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
