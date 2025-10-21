
'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { AddProjectDialog } from './add-project-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { EditProjectDialog } from './edit-project-dialog';

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<string | false>(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const handleDelete = () => {
    if (!firestore || !projectToDelete) return;
    const projectRef = doc(firestore, `projects`, projectToDelete.id);
    deleteDocumentNonBlocking(projectRef);
    toast({
      title: 'Project Deleted',
      description: `${projectToDelete.name} has been deleted.`,
    });
    setProjectToDelete(null);
  };

  const handleDropdownOpenChange = (isOpen: boolean, projectId: string) => {
    setIsMenuOpen(isOpen ? projectId : false);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>A list of all your current projects.</CardDescription>
          </div>
          <AddProjectDialog />
        </div>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.clientName}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu open={isMenuOpen === project.id} onOpenChange={(open) => handleDropdownOpenChange(open, project.id)}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <EditProjectDialog project={project} onOpenChange={(dialogOpen) => !dialogOpen && handleDropdownOpenChange(false, project.id)}>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
                        </EditProjectDialog>
                        <DropdownMenuItem>View Tasks</DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => { e.preventDefault(); setProjectToDelete(project); }}>Delete</DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project
                and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
