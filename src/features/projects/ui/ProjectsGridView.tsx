import React from 'react';
import { ProjectCard } from './ProjectCard';
import { Project } from '@/features/projects/services/projectService';

interface ProjectsGridViewProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onStatusChange?: (projectId: string, status: string) => void;
  onPriorityChange?: (projectId: string, priority: string) => void;
  showVendor?: boolean;
}

export const ProjectsGridView: React.FC<ProjectsGridViewProps> = ({
  projects,
  onProjectClick,
  onStatusChange,
  onPriorityChange,
  showVendor = false,
}) => {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No projects found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick(project)}
          showVendor={showVendor}
          onStatusChange={onStatusChange ? (status) => onStatusChange(project.id, status) : undefined}
          onPriorityChange={
            onPriorityChange ? (priority) => onPriorityChange(project.id, priority) : undefined
          }
        />
      ))}
    </div>
  );
};

