
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TimecardsPage() {
  return (
     <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timecards</h1>
        <p className="text-muted-foreground">
          Log and manage your work hours for all projects.
        </p>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>The ability to log and manage timecards is under construction.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Timecard management features will be available here.</p>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
