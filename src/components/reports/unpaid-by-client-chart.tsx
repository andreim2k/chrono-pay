
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';

interface UnpaidByClientChartProps {
    invoices: Invoice[];
    selectedCurrency: string;
}

export function UnpaidByClientChart({ invoices, selectedCurrency }: UnpaidByClientChartProps) {
    const clientData = useMemo(() => {
        const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid');
        const amounts: { [clientName: string]: number } = {};

        unpaidInvoices.forEach(inv => {
            if (!amounts[inv.clientName]) {
                amounts[inv.clientName] = 0;
            }
            
            let totalInSelectedCurrency = 0;
            if (selectedCurrency === 'RON') {
                totalInSelectedCurrency = inv.totalRon || (inv.total * (inv.exchangeRate || 1));
            } else if (inv.currency === selectedCurrency) {
                totalInSelectedCurrency = inv.total;
            }

            if(totalInSelectedCurrency > 0) {
                amounts[inv.clientName] += totalInSelectedCurrency;
            }
        });

        return Object.entries(amounts)
            .filter(([, amount]) => amount > 0)
            .map(([clientName, totalAmount]) => ({
                client: clientName,
                amount: totalAmount,
            }))
            .sort((a, b) => b.amount - a.amount);

    }, [invoices, selectedCurrency]);

    const chartConfig = useMemo(() => ({
        amount: {
            label: `Unpaid (${selectedCurrency})`,
            color: 'hsl(var(--destructive))',
        },
    }), [selectedCurrency]);
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Balances ({selectedCurrency})</CardTitle>
        <CardDescription>Total unpaid amounts (including VAT) by client, shown in {selectedCurrency}.</CardDescription>
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
                        formatter={(value) => `${new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number)}`} 
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
                <p>No unpaid invoices to display for {selectedCurrency}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    