
'use client';

import * as React from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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

const chartColors = [
    { net: 'hsl(var(--chart-1))', vat: 'hsl(var(--chart-2))' },
    { net: 'hsl(var(--chart-3))', vat: 'hsl(var(--chart-4))' },
    { net: 'hsl(var(--chart-5))', vat: 'hsl(var(--chart-1))' },
];


export function RevenueChart({ invoices }: { invoices: Invoice[] }) {
    const { monthlyRevenue, currencies } = useMemo(() => {
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        
        const revenueByMonthAndCurrency: { 
            [month: string]: { [key: string]: number } 
        } = {};
        
        const allCurrencies = [...new Set(paidInvoices.map(inv => inv.currency))];

        paidInvoices.forEach(invoice => {
            const month = format(parseISO(invoice.date), 'MMM yyyy');
            if (!revenueByMonthAndCurrency[month]) {
                revenueByMonthAndCurrency[month] = { month: new Date(month).getTime() };
            }
            
            const subtotalKey = `${invoice.currency}-subtotal`;
            const vatKey = `${invoice.currency}-vat`;

            if (!revenueByMonthAndCurrency[month][subtotalKey]) {
                revenueByMonthAndCurrency[month][subtotalKey] = 0;
            }
             if (!revenueByMonthAndCurrency[month][vatKey]) {
                revenueByMonthAndCurrency[month][vatKey] = 0;
            }

            revenueByMonthAndCurrency[month][subtotalKey] += invoice.subtotal;
            revenueByMonthAndCurrency[month][vatKey] += invoice.vatAmount || 0;
        });

        const sortedChartData = Object.values(revenueByMonthAndCurrency)
            .sort((a, b) => a.month - b.month)
            .map(item => ({
                ...item,
                month: format(new Date(item.month), 'MMM'),
            }));

        return { monthlyRevenue: sortedChartData, currencies: allCurrencies };
    }, [invoices]);


    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        currencies.forEach((currency, index) => {
            const colors = chartColors[index % chartColors.length];
            config[`${currency}-subtotal`] = {
                label: `${currency} (Net)`,
                color: colors.net,
            };
            config[`${currency}-vat`] = {
                label: `${currency} (VAT)`,
                color: colors.vat,
            };
        });
        return config;
    }, [currencies]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
        <CardDescription>Total revenue from paid invoices, broken down by subtotal (Net) and VAT.</CardDescription>
      </CardHeader>
      <CardContent>
        {monthlyRevenue.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <AreaChart accessibilityLayer data={monthlyRevenue}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                    const primaryCurrency = currencies[0] || '';
                    const symbol = currencySymbols[primaryCurrency] || '';
                    if (value >= 1000) return `${symbol}${value / 1000}k`;
                    return `${symbol}${String(value)}`;
                }}
              />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                    indicator="dot" 
                    formatter={(value, name) => {
                        const [currency] = (name as string).split('-');
                        const symbol = currencySymbols[currency] || currency;
                        return `${symbol}${(value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    }}
                />}
              />
              {currencies.map((currency) => (
                <defs key={`def-${currency}`}>
                    <linearGradient id={`fill-${currency}-subtotal`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={`var(--color-${currency}-subtotal)`} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={`var(--color-${currency}-subtotal)`} stopOpacity={0.1}/>
                    </linearGradient>
                     <linearGradient id={`fill-${currency}-vat`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={`var(--color-${currency}-vat)`} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={`var(--color-${currency}-vat)`} stopOpacity={0.3}/>
                    </linearGradient>
                </defs>
              ))}
               {currencies.map((currency) => (
                   <React.Fragment key={currency}>
                    <Area 
                        type="natural" 
                        dataKey={`${currency}-subtotal`} 
                        stackId={`${currency}-subtotal`}
                        stroke={`var(--color-${currency}-subtotal)`}
                        fill={`url(#fill-${currency}-subtotal)`}
                        fillOpacity={0.4}
                    />
                     <Area 
                        type="natural" 
                        dataKey={`${currency}-vat`} 
                        stackId={`${currency}-vat`}
                        stroke={`var(--color-${currency}-vat)`}
                        strokeDasharray="3 3"
                        fill={`url(#fill-${currency}-vat)`}
                        fillOpacity={0.4}
                    />
                   </React.Fragment>
              ))}
            </AreaChart>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No paid invoices yet to display revenue.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
