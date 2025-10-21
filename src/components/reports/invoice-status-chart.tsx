
'use client';

import { Pie, PieChart, ResponsiveContainer, Cell, Label } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Invoice } from '@/lib/types';
import { useMemo } from 'react';

const chartConfig = {
  Paid: {
    label: 'Paid',
    color: 'hsl(var(--chart-2))',
  },
  Sent: {
    label: 'Sent',
    color: 'hsl(var(--chart-1))',
  },
  Created: {
    label: 'Created',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

export function InvoiceStatusChart({ invoices }: { invoices: Invoice[] }) {
    const { statusData, totalInvoices } = useMemo(() => {
        const counts = {
            Paid: 0,
            Sent: 0,
            Created: 0,
        };
        invoices.forEach(inv => {
            counts[inv.status]++;
        });

        const data = Object.entries(counts).map(([status, count]) => ({
            status,
            count,
            fill: chartConfig[status as keyof typeof chartConfig].color,
        })).filter(item => item.count > 0);
        
        const total = data.reduce((acc, curr) => acc + curr.count, 0);

        return { statusData: data, totalInvoices: total };

    }, [invoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Status Overview</CardTitle>
        <CardDescription>A real-time breakdown of all your invoices by their current status.</CardDescription>
      </CardHeader>
      <CardContent>
        {statusData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        strokeWidth={5}
                    >
                        {statusData.map((entry) => (
                            <Cell key={`cell-${entry.status}`} fill={entry.fill} className="focus:outline-none" />
                        ))}
                         <Label
                            content={({ viewBox }) => {
                                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                return (
                                    <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    >
                                    <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="fill-foreground text-3xl font-bold"
                                    >
                                        {totalInvoices}
                                    </tspan>
                                    <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 24}
                                        className="fill-muted-foreground"
                                    >
                                        Invoices
                                    </tspan>
                                    </text>
                                )
                                }
                                return null;
                            }}
                        />
                    </Pie>
                     <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No invoices to display status information.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
