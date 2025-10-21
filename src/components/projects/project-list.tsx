
'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreVertical } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { EditProjectDialog } from './edit-project-dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { getInitials } from '@/lib/utils';

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
    setIsAlertOpen(false);
  };
  
  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setIsAlertOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setProjectToEdit(project);
    setIsEditOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <AddProjectDialog />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <Card key={project.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className='flex items-center gap-4'>
                            <Avatar>
                                <AvatarFallback>{getInitials(project.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-lg">{project.name}</CardTitle>
                                <CardDescription>{project.clientName}</CardDescription>
                            </div>
                        </div>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => openEditDialog(project)}>
                            Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                            className="text-destructive focus:text-destructive" 
                            onSelect={() => openDeleteDialog(project)}
                            >
                            Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                </Card>
            ))}
        </div>
      </div>
      {projectToEdit && (
        <EditProjectDialog
            project={projectToEdit}
            isOpen={isEditOpen}
            onOpenChange={(open) => {
              setIsEditOpen(open);
              if (!open) {
                setProjectToEdit(null);
              }
            }}
        />
      )}
     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
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
    </>
  );
}
