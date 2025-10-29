
'use client';

import React, { useState, useEffect } from 'react';
import type { Project, Invoice, Timecard } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { GripVertical, MoreVertical } from 'lucide-react';
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
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { EditProjectDialog } from './edit-project-dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProjectListProps {
  projects: Project[];
}

function SortableProjectItem({ project, onEdit, onDelete }: { project: Project, onEdit: (project: Project) => void, onDelete: (project: Project) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className='flex items-center gap-4'>
            <button {...attributes} {...listeners} className="cursor-grab p-2 text-muted-foreground hover:bg-accent rounded-md">
              <GripVertical className="h-5 w-5" />
            </button>
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
              <DropdownMenuItem onSelect={() => onEdit(project)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDelete(project)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
      </Card>
    </div>
  );
}

export function ProjectList({ projects: initialProjects }: ProjectListProps) {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const invoicesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/invoices`) : null),
    [firestore, user]
  );
  const { data: allInvoices } = useCollection<Invoice>(invoicesQuery, `users/${user?.uid}/invoices`);

  const timecardsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, `users/${user.uid}/timecards`) : null),
    [firestore, user]
  );
  const { data: allTimecards } = useCollection<Timecard>(timecardsQuery, `users/${user?.uid}/timecards`);


  useEffect(() => {
    const sortedProjects = [...initialProjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setActiveProjects(sortedProjects);
  }, [initialProjects]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = async () => {
    if (!firestore || !projectToDelete || !user || !allInvoices || !allTimecards) return;
    
    const batch = writeBatch(firestore);

    // 1. Delete the project document
    const projectRef = doc(firestore, `users/${user.uid}/projects`, projectToDelete.id);
    batch.delete(projectRef);

    // 2. Find and delete all associated invoices
    const invoicesToDelete = allInvoices.filter(inv => inv.projectId === projectToDelete.id);
    invoicesToDelete.forEach(invoice => {
      const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoice.id);
      batch.delete(invoiceRef);
    });

    // 3. Find and delete all associated timecards
    const timecardsToDelete = allTimecards.filter(tc => tc.projectId === projectToDelete.id);
    timecardsToDelete.forEach(timecard => {
        const timecardRef = doc(firestore, `users/${user.uid}/timecards`, timecard.id);
        batch.delete(timecardRef);
    });

    try {
      await batch.commit();
      toast({
        title: 'Project and Data Deleted',
        description: `${projectToDelete.name} and its associated invoices and timecards have been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting project and associated data:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the project and its data. Please try again.',
      });
    }

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
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setActiveProjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over!.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update order in Firestore
        if (firestore && user) {
          const batch = writeBatch(firestore);
          newOrder.forEach((project, index) => {
            const projectRef = doc(firestore, `users/${user.uid}/projects`, project.id);
            batch.update(projectRef, { order: index });
          });
          batch.commit().catch(err => {
             toast({
              variant: 'destructive',
              title: 'Error updating order',
              description: 'Could not save the new project order.',
            });
            // Revert local state on failure
            setActiveProjects(items);
          });
        }
        
        return newOrder;
      });
    }
  };


  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <AddProjectDialog />
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={activeProjects} strategy={rectSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map((project) => (
                <SortableProjectItem 
                  key={project.id} 
                  project={project}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project <span className='font-bold'>{projectToDelete?.name}</span> and all of its associated invoices and timecards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete Project & Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
