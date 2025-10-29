
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Timecard, Project } from '@/lib/types';
import { useMemo } from 'react';

export function HoursPerProjectChart({ timecards, projects }: { timecards: Timecard[], projects: Project[] }) {
    const projectData = useMemo(() => {
        const projectMap = new Map(projects.map(p => [p.id, p]));
        const hours: { [projectId: string]: number } = {};
        
        timecards.forEach(tc => {
            if (hours[tc.projectId]) {
                hours[tc.projectId] += tc.hours;
            } else {
                hours[tc.projectId] = tc.hours;
            }
        });

        return Object.entries(hours).map(([projectId, totalHours]) => {
            const project = projectMap.get(projectId);
            const projectName = project ? `${project.name} (${project.clientName})` : 'Unknown Project';
            return {
                project: projectName,
                hours: totalHours,
            };
        }).sort((a, b) => b.hours - a.hours);

    }, [timecards, projects]);

    const chartConfig = {
        hours: {
            label: 'Hours Logged',
            color: 'hsl(var(--chart-4))',
        },
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours Logged by Project</CardTitle>
        <CardDescription>Total hours logged for each project.</CardDescription>
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
                <XAxis dataKey="hours" type="number" hide />
                 <Tooltip
                    cursor={{fill: 'hsl(var(--muted))'}}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `${Number(value).toFixed(2)} hours`} />}
                />
                <Bar 
                    dataKey="hours" 
                    fill="var(--color-hours)" 
                    radius={5} 
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No timecards to display project data.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
