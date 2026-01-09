
'use client';

import * as React from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Invoice, User } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';

const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON'
};

const multiCurrencyChartColors = [
    { net: 'hsl(var(--chart-2))', vat: 'hsl(var(--chart-1))' },
    { net: 'hsl(var(--chart-4))', vat: 'hsl(var(--chart-3))' },
    { net: 'hsl(var(--chart-5))', vat: 'hsl(var(--chart-2))' },
];

export function RevenueChart({ invoices, myCompany }: { invoices: Invoice[], myCompany: User | null }) {
    const { chartData, chartConfig, isRonOnly, currencies } = useMemo(() => {
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        const shouldShowRon = myCompany?.companyIbans && 'RON' in myCompany.companyIbans;

        if (shouldShowRon) {
            // RON-centric view
            const revenueByMonth: { [month: string]: { month: string, subtotal: number, vat: number } } = {};
            paidInvoices.forEach(invoice => {
                const month = format(parseISO(invoice.date), 'yyyy-MM');
                if (!revenueByMonth[month]) {
                    revenueByMonth[month] = { month, subtotal: 0, vat: 0 };
                }
                const exchangeRate = invoice.exchangeRate || 1;
                revenueByMonth[month].subtotal += invoice.subtotal * exchangeRate;
                revenueByMonth[month].vat += (invoice.vatAmount || 0) * exchangeRate;
            });
            const sortedChartData = Object.values(revenueByMonth)
                .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
                .map(item => ({ ...item, month: format(new Date(item.month), 'MMM') }));
            
            const ronChartConfig: ChartConfig = {
                subtotal: { label: 'Net (RON)', color: 'hsl(var(--chart-2))' },
                vat: { label: 'VAT (RON)', color: 'hsl(var(--chart-1))' },
            };
            return { chartData: sortedChartData, chartConfig: ronChartConfig, isRonOnly: true, currencies: ['RON'] };
        } else {
            // Multi-currency view
            const revenueByMonth: { [month: string]: { [key: string]: number | string } } = {};
            const allCurrencies = new Set<string>();

            paidInvoices.forEach(invoice => {
                const month = format(parseISO(invoice.date), 'yyyy-MM');
                allCurrencies.add(invoice.currency);

                if (!revenueByMonth[month]) {
                    revenueByMonth[month] = { month };
                }

                const subtotalKey = `${invoice.currency}-subtotal`;
                const vatKey = `${invoice.currency}-vat`;
                
                (revenueByMonth[month][subtotalKey] as number) = ((revenueByMonth[month][subtotalKey] as number) || 0) + invoice.subtotal;
                (revenueByMonth[month][vatKey] as number) = ((revenueByMonth[month][vatKey] as number) || 0) + (invoice.vatAmount || 0);
            });

            const sortedChartData = Object.values(revenueByMonth)
                .sort((a, b) => new Date(a.month as string).getTime() - new Date(b.month as string).getTime())
                .map(item => ({
                    ...item,
                    month: format(new Date(item.month as string), 'MMM'),
                }));
            
            const currencyList = Array.from(allCurrencies);
            const newChartConfig: ChartConfig = {};
            currencyList.forEach((currency, index) => {
                const colors = multiCurrencyChartColors[index % multiCurrencyChartColors.length];
                newChartConfig[`${currency}-subtotal`] = {
                    label: `${currency} (Net)`,
                    color: colors.net,
                };
                newChartConfig[`${currency}-vat`] = {
                    label: `${currency} (VAT)`,
                    color: colors.vat,
                };
            });

            return { chartData: sortedChartData, chartConfig: newChartConfig, isRonOnly: false, currencies: currencyList };
        }
    }, [invoices, myCompany]);


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
                    const primaryCurrency = isRonOnly ? 'RON' : currencies[0] || '';
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
                        const currency = isRonOnly ? 'RON' : (name as string).split('-')[0];
                        const symbol = currencySymbols[currency] || currency;
                        return `${symbol}${(value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    }}
                />}
              />
               <ChartLegend content={<ChartLegendContent />} />
               {isRonOnly ? (
                    <>
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
                    </>
               ) : (
                <>
                    {currencies.map((currency) => (
                        <defs key={`def-${currency}`}>
                            <linearGradient id={`fill-${currency}-subtotal`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={`var(--color-${currency}-subtotal)`} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={`var(--color-${currency}-subtotal)`} stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id={`fill-${currency}-vat`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={`var(--color-${currency}-vat)`} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={`var(--color-${currency}-vat)`} stopOpacity={0.1}/>
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
                </>
               )}
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
