import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '../lib/api';
import {
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Projects() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then(res => res.data),
  });

  const filteredProjects = projects?.filter((project: {
    name: string;
    description: string;
    status: string;
  }) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const statuses = ['all', 'planning', 'development', 'testing', 'live', 'concluded', 'archived'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Projects</h1>
          <p className="text-gray-400 mt-1">
            Manage your ARG projects
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm capitalize transition-colors',
                statusFilter === status
                  ? 'bg-arg-purple-500/20 text-arg-purple-300'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {search || statusFilter !== 'all' ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-gray-400 mb-4">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first ARG project to get started'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link to="/projects/new" className="btn btn-primary inline-flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project: {
            id: string;
            name: string;
            description: string;
            tagline: string;
            status: string;
            genre: string;
            member_count: number;
            member_role: string;
            themes: string[];
          }) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="card-hover p-6 block"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-white truncate pr-2">{project.name}</h3>
                <span className={clsx(
                  'badge flex-shrink-0',
                  project.status === 'live' ? 'badge-green' :
                  project.status === 'development' ? 'badge-yellow' :
                  project.status === 'planning' ? 'badge-purple' :
                  project.status === 'testing' ? 'badge-cyan' :
                  'badge-gray'
                )}>
                  {project.status}
                </span>
              </div>

              {project.tagline && (
                <p className="text-sm text-arg-purple-300 mb-2">{project.tagline}</p>
              )}

              <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                {project.description || 'No description'}
              </p>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                {project.genre && (
                  <span className="badge badge-cyan">{project.genre}</span>
                )}
                <span className="flex items-center gap-1 text-gray-500">
                  <UsersIcon className="w-4 h-4" />
                  {project.member_count}
                </span>
                <span className="badge badge-gray">{project.member_role}</span>
              </div>

              {project.themes && project.themes.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {project.themes.slice(0, 3).map((theme: string, i: number) => (
                    <span key={i} className="text-xs text-gray-500">#{theme}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
