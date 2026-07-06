import React from 'react';
import { useProject } from '@/context/ProjectContext';

export default function ProjectSelector() {
  const { currentProject, setCurrentProject, availableProjects, loadingProjects } = useProject();

  if (loadingProjects) {
    return <div className="text-sm text-gray-500">Loading projects...</div>;
  }

  if (availableProjects.length === 0) {
    return <div className="text-sm text-gray-500">No projects available</div>;
  }

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="project-select" className="text-sm font-medium text-gray-700">Project:</label>
      <select
        id="project-select"
        className="border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        value={currentProject?.id || ''}
        onChange={(e) => {
          const selectedId = Number(e.target.value);
          const project = availableProjects.find(p => p.id === selectedId);
          if (project) setCurrentProject(project);
        }}
      >
        {availableProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
