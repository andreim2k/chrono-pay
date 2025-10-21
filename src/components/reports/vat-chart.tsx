
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO, getYear, getMonth } from 'date-fns';

const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON'
};

const chartConfig = {
  vat: {
    label: 'VAT',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

interface VatChartProps {
    invoices: Invoice[];
    selectedYear: number | 'all';
}

export function VatChart({ invoices, selectedYear }: VatChartProps) {
    const chartData = useMemo(() => {
        const yearData = Array.from({ length: 12 }, (_, i) => ({
            month: format(new Date(2000, i), 'MMM'), // Dummy year, we only need the month name
            vat: 0,
            monthIndex: i,
        }));

        invoices.forEach(invoice => {
            if (!invoice.vatAmount || invoice.vatAmount === 0) return;
            
            const invoiceDate = parseISO(invoice.date);
            const monthIndex = getMonth(invoiceDate);

            // Simple aggregation for the bar value. A more robust impl would convert currencies.
            yearData[monthIndex].vat += invoice.vatAmount;
        });

        return yearData.filter(d => d.vat > 0);

    }, [invoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>VAT Accrued per Month</CardTitle>
        <CardDescription>
          {`Total VAT from all invoices created for ${selectedYear === 'all' ? 'the selected period' : selectedYear}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                    const symbol = currencySymbols.EUR; // Assuming EUR for axis formatting
                    if (value >= 1000) return `${symbol}${value / 1000}k`;
                    return `${symbol}${value}`;
                }}
              />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" formatter={(value) => {
                    const symbol = currencySymbols.EUR; // Assuming EUR for tooltip display
                    return `${symbol}${(value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                }} />}
              />
              <Bar 
                dataKey="vat" 
                fill="var(--color-vat)" 
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No invoices with VAT to display for {selectedYear}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
