
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';
import { parseISO, getYear } from 'date-fns';

interface VatChartYearlyProps {
    invoices: Invoice[];
    selectedCurrency: string;
}

export function VatChartYearly({ invoices, selectedCurrency }: VatChartYearlyProps) {
    const chartConfig = useMemo(() => ({
        vat: {
            label: `VAT (${selectedCurrency})`,
            color: 'hsl(var(--chart-5))',
        },
    }), [selectedCurrency]) satisfies ChartConfig;

    const chartData = useMemo(() => {
        const yearlyData: { [year: number]: { vat: number } } = {};

        invoices.forEach(invoice => {
            const vatAmount = invoice.vatAmount || 0;
            if (vatAmount === 0) return;
            
            const invoiceDate = parseISO(invoice.date);
            const year = getYear(invoiceDate);
            
            if (!yearlyData[year]) {
                yearlyData[year] = { vat: 0 };
            }

            let vatInSelectedCurrency = 0;
            if (selectedCurrency === 'RON') {
                const exchangeRate = invoice.currency === 'RON' ? 1 : (invoice.exchangeRate || 1);
                vatInSelectedCurrency = vatAmount * exchangeRate;
            } else if (invoice.currency === selectedCurrency) {
                vatInSelectedCurrency = vatAmount;
            }

            if (vatInSelectedCurrency > 0) {
                yearlyData[year].vat += vatInSelectedCurrency;
            }
        });

        return Object.entries(yearlyData).map(([year, data]) => ({
            year: String(year),
            vat: data.vat,
        })).sort((a,b) => parseInt(a.year) - parseInt(b.year));

    }, [invoices, selectedCurrency]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>VAT Accrued per Year ({selectedCurrency})</CardTitle>
        <CardDescription>
          Total VAT in {selectedCurrency} from all invoices, grouped by year.
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
                    const formattedValue = new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: selectedCurrency,
                      notation: 'compact',
                      compactDisplay: 'short'
                    }).format(value);
                    return formattedValue;
                }}
              />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" formatter={(value) => {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number);
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
                <p>No invoices with VAT to display for {selectedCurrency}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    