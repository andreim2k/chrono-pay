
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';
import { parseISO, getYear } from 'date-fns';

const chartConfig = {
  vat: {
    label: 'VAT (RON)',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

interface VatChartYearlyProps {
    invoices: Invoice[];
}

export function VatChartYearly({ invoices }: VatChartYearlyProps) {
    const chartData = useMemo(() => {
        const yearlyData: { [year: number]: { vat: number } } = {};

        invoices.forEach(invoice => {
            if (!invoice.vatAmount || invoice.vatAmount === 0) return;
            
            const invoiceDate = parseISO(invoice.date);
            const year = getYear(invoiceDate);
            
            if (!yearlyData[year]) {
                yearlyData[year] = { vat: 0 };
            }

            const vatInRon = (invoice.vatAmount || 0) * (invoice.exchangeRate || 1);
            yearlyData[year].vat += vatInRon;
        });

        return Object.entries(yearlyData).map(([year, data]) => ({
            year: String(year),
            vat: data.vat,
        })).sort((a,b) => parseInt(a.year) - parseInt(b.year));

    }, [invoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>VAT Accrued per Year (RON)</CardTitle>
        <CardDescription>
          Total VAT in RON from all invoices, grouped by year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                    const formattedValue = new Intl.NumberFormat('ro-RO', {
                      style: 'currency',
                      currency: 'RON',
                      notation: 'compact',
                      compactDisplay: 'short'
                    }).format(value);
                    return formattedValue;
                }}
              />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" formatter={(value) => {
                    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(value as number);
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
                <p>No invoices with VAT to display.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
