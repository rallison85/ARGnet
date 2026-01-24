import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import {
  FolderIcon,
  PlusIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then(res => res.data),
  });

  const recentProjects = projects?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">
            Welcome back, {user?.display_name || user?.username}
          </h1>
          <p className="text-gray-400 mt-1">
            Here's what's happening with your ARG projects
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-arg-purple-500/20 flex items-center justify-center">
              <FolderIcon className="w-6 h-6 text-arg-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{projects?.length || 0}</p>
              <p className="text-sm text-gray-400">Total Projects</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {projects?.filter((p: { status: string }) => p.status === 'live').length || 0}
              </p>
              <p className="text-sm text-gray-400">Live ARGs</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-arg-cyan-500/20 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-arg-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {projects?.filter((p: { status: string }) => p.status === 'development').length || 0}
              </p>
              <p className="text-sm text-gray-400">In Development</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header">Recent Projects</h2>
          <Link to="/projects" className="text-sm link">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="card p-12 text-center">
            <FolderIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-4">
              Create your first ARG project to get started
            </p>
            <Link to="/projects/new" className="btn btn-primary inline-flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map((project: {
              id: string;
              name: string;
              description: string;
              status: string;
              genre: string;
              member_count: number;
            }) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="card-hover p-6 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white truncate">{project.name}</h3>
                  <span className={clsx(
                    'badge',
                    project.status === 'live' ? 'badge-green' :
                    project.status === 'development' ? 'badge-yellow' :
                    project.status === 'planning' ? 'badge-purple' :
                    'badge-gray'
                  )}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {project.genre && (
                    <span className="badge badge-cyan">{project.genre}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" />
                    {project.member_count} members
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Link
              to="/projects/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="w-5 h-5 text-arg-purple-400" />
              <span className="text-gray-300">Create a new ARG project</span>
            </Link>
            <Link
              to="/projects"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <FolderIcon className="w-5 h-5 text-arg-cyan-400" />
              <span className="text-gray-300">Browse all projects</span>
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Resources</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>ARG Studio helps you design and implement alternate reality games with your team.</p>
            <p className="mt-2">Features include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Story and narrative design</li>
              <li>Character and relationship management</li>
              <li>Puzzle design and testing</li>
              <li>Trail/rabbit hole mapping</li>
              <li>Live event planning</li>
              <li>Asset management</li>
              <li>Team collaboration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
