
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';

export function InvoicesPerClientChart({ invoices }: { invoices: Invoice[] }) {
    const clientData = useMemo(() => {
        const counts: { [clientName: string]: number } = {};
        invoices.forEach(inv => {
            if (counts[inv.clientName]) {
                counts[inv.clientName]++;
            } else {
                counts[inv.clientName] = 1;
            }
        });

        return Object.entries(counts).map(([clientName, count]) => ({
            client: clientName,
            invoices: count,
        })).sort((a, b) => b.invoices - a.invoices);

    }, [invoices]);

    const chartConfig = {
        invoices: {
            label: 'Total Invoices',
            color: 'hsl(var(--chart-1))',
        },
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume by Client</CardTitle>
        <CardDescription>Total number of invoices issued to each client.</CardDescription>
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
                <XAxis dataKey="invoices" type="number" hide />
                 <Tooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar 
                    dataKey="invoices" 
                    fill="var(--color-invoices)" 
                    radius={5} 
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No invoices to display client data.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
