
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
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
];

export function RevenueChart({ invoices }: { invoices: Invoice[] }) {
    const { monthlyRevenue, currencies } = useMemo(() => {
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        
        const revenueByMonthAndCurrency: { 
            [month: string]: { [currency: string]: { subtotal: number, vat: number } } 
        } = {};

        paidInvoices.forEach(invoice => {
            const month = format(parseISO(invoice.date), 'MMM yyyy');
            if (!revenueByMonthAndCurrency[month]) {
                revenueByMonthAndCurrency[month] = {};
            }
            if (!revenueByMonthAndCurrency[month][invoice.currency]) {
                revenueByMonthAndCurrency[month][invoice.currency] = { subtotal: 0, vat: 0 };
            }
            revenueByMonthAndCurrency[month][invoice.currency].subtotal += invoice.subtotal;
            revenueByMonthAndCurrency[month][invoice.currency].vat += invoice.vatAmount || 0;
        });

        const monthKeys = Object.keys(revenueByMonthAndCurrency);
        if (monthKeys.length === 0) {
            return { monthlyRevenue: [], currencies: [] };
        }
        
        const sortedMonths = monthKeys.sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
        
        const allCurrencies = [...new Set(paidInvoices.map(inv => inv.currency))];

        const chartData = sortedMonths.map(month => {
            const entry: { month: string; [key: string]: any } = { month: format(new Date(month), 'MMM') };
            allCurrencies.forEach(currency => {
                const data = revenueByMonthAndCurrency[month][currency] || { subtotal: 0, vat: 0 };
                entry[`${currency}-subtotal`] = data.subtotal;
                entry[`${currency}-vat`] = data.vat;
            });
            return entry;
        });

        return { monthlyRevenue: chartData, currencies: allCurrencies };

    }, [invoices]);


    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        currencies.forEach((currency, index) => {
            const color = chartColors[index % chartColors.length];
            config[`${currency}-subtotal`] = {
                label: `${currency} (Net)`,
                color: color,
            };
            config[`${currency}-vat`] = {
                label: `${currency} (VAT)`,
                color: color,
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
                        const [currency, type] = (name as string).split('-');
                        const symbol = currencySymbols[currency] || currency;
                        return `${symbol}${(value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    }}
                />}
              />
              {currencies.map((currency) => (
                <defs key={`def-${currency}`}>
                    <linearGradient id={`fill${currency}-subtotal`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={`var(--color-${currency}-subtotal)`} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={`var(--color-${currency}-subtotal)`} stopOpacity={0.1}/>
                    </linearGradient>
                     <linearGradient id={`fill${currency}-vat`} x1="0" y1="0" x2="0" y2="1">
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
                        stackId={currency}
                        stroke={`var(--color-${currency}-subtotal)`}
                        fill={`url(#fill${currency}-subtotal)`}
                        fillOpacity={0.4}
                    />
                     <Area 
                        type="natural" 
                        dataKey={`${currency}-vat`} 
                        stackId={currency}
                        stroke={`var(--color-${currency}-vat)`}
                        strokeDasharray="3 3"
                        fill={`url(#fill${currency}-vat)`}
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
