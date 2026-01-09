
'use client';

import * as React from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';

const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON'
};

interface RevenueChartProps {
    invoices: Invoice[];
    selectedCurrency: string;
}

export function RevenueChart({ invoices, selectedCurrency }: RevenueChartProps) {
    const { chartData, chartConfig } = useMemo(() => {
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        const revenueByMonth: { [month: string]: { month: string, subtotal: number, vat: number } } = {};
        
        paidInvoices.forEach(invoice => {
            const month = format(parseISO(invoice.date), 'yyyy-MM');
            if (!revenueByMonth[month]) {
                revenueByMonth[month] = { month, subtotal: 0, vat: 0 };
            }

            let subtotal = invoice.subtotal;
            let vat = invoice.vatAmount || 0;

            if (selectedCurrency === 'RON') {
                const exchangeRate = invoice.currency === 'RON' ? 1 : (invoice.exchangeRate || 1);
                subtotal *= exchangeRate;
                vat *= exchangeRate;
            } else {
                if (invoice.currency !== selectedCurrency) return;
            }
            
            revenueByMonth[month].subtotal += subtotal;
            revenueByMonth[month].vat += vat;
        });

        const sortedChartData = Object.values(revenueByMonth)
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
            .map(item => ({ ...item, month: format(new Date(item.month), 'MMM') }));
        
        const config: ChartConfig = {
            subtotal: { label: `Net (${selectedCurrency})`, color: 'hsl(var(--chart-2))' },
            vat: { label: `VAT (${selectedCurrency})`, color: 'hsl(var(--chart-1))' },
        };
        
        return { chartData: sortedChartData, chartConfig: config };

    }, [invoices, selectedCurrency]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
        <CardDescription>Total revenue from paid invoices, broken down by subtotal (Net) and VAT.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <AreaChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                    const symbol = currencySymbols[selectedCurrency] || selectedCurrency;
                    if (value >= 1000) return `${symbol}${value / 1000}k`;
                    return `${symbol}${String(value)}`;
                }}
              />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                    indicator="dot" 
                    formatter={(value) => {
                        const symbol = currencySymbols[selectedCurrency] || selectedCurrency;
                        return `${symbol}${(value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    }}
                />}
              />
               <ChartLegend content={<ChartLegendContent />} />
                <defs>
                    <linearGradient id="fill-subtotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-subtotal)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-subtotal)" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="fill-vat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-vat)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-vat)" stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                <Area type="natural" dataKey="subtotal" stackId="1" stroke="var(--color-subtotal)" fill="url(#fill-subtotal)" fillOpacity={0.4} />
                <Area type="natural" dataKey="vat" stackId="1" stroke="var(--color-vat)" strokeDasharray="3 3" fill="url(#fill-vat)" fillOpacity={0.4} />
            </AreaChart>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No paid invoices yet to display revenue for {selectedCurrency}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    