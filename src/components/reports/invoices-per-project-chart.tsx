
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice, Project } from '@/lib/types';
import { useMemo } from 'react';

export function InvoicesPerProjectChart({ invoices, projects }: { invoices: Invoice[], projects: Project[] }) {
    const projectData = useMemo(() => {
        if (!projects || projects.length === 0) {
            return [];
        }

        const projectMap = new Map(projects.map(p => [p.id, p]));
        const counts: { [projectId: string]: { count: number } } = {};
        
        invoices.forEach(inv => {
            if (inv.projectId) {
                if (!counts[inv.projectId]) {
                    counts[inv.projectId] = { count: 0 };
                }
                counts[inv.projectId].count++;
            }
        });

        return Object.entries(counts).map(([projectId, data]) => {
            const project = projectMap.get(projectId);
            const projectName = project ? project.name : 'Unknown Project';
            const clientName = project ? project.clientName : '';
            return {
                project: `${projectName} (${clientName})`,
                invoices: data.count,
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
