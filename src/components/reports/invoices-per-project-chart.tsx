
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice, Project } from '@/lib/types';
import { useMemo } from 'react';

export function InvoicesPerProjectChart({ invoices, projects }: { invoices: Invoice[], projects: Project[] }) {
    const projectData = useMemo(() => {
        const counts: { [projectId: string]: number } = {};
        invoices.forEach(inv => {
            if (counts[inv.projectId]) {
                counts[inv.projectId]++;
            } else {
                counts[inv.projectId] = 1;
            }
        });

        return Object.entries(counts).map(([projectId, count]) => {
            const project = projects.find(p => p.id === projectId);
            return {
                project: project ? `${project.name} (${project.clientName})` : `Unknown Project (${projectId})`,
                invoices: count,
            }
        }).sort((a, b) => b.invoices - a.invoices);

    }, [invoices, projects]);

    const chartConfig = {
        invoices: {
            label: 'Total Invoices',
            color: 'hsl(var(--chart-3))',
        },
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume by Project</CardTitle>
        <CardDescription>Total number of invoices issued for each project.</CardDescription>
      </CardHeader>
      <CardContent>
        {projectData.length > 0 ? (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart accessibilityLayer data={projectData} layout="vertical" margin={{ left: 10 }}>
                <YAxis
                    dataKey="project"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-muted-foreground text-xs"
                    width={150}
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
                <p>No invoices to display project data.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
