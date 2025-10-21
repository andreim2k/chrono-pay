
import { redirect } from 'next/navigation';

export default function ProjectsPage() {
  redirect('/settings?tab=projects');
  return null;
}
