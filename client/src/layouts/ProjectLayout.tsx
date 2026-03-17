import { useEffect } from 'react';
import { Outlet, Link, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { projectApi } from '../lib/api';
import { connectSocket, disconnectSocket, joinProject, leaveProject } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';
import { ProjectErrorFallback } from '../components/ErrorFallback';
import clsx from 'clsx';
import {
  HomeIcon,
  BookOpenIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
  MapIcon,
  CalendarDaysIcon,
  PhotoIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  ClockIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const projectNav = [
  { path: '', label: 'Overview', icon: HomeIcon },
  { path: 'story', label: 'Story', icon: BookOpenIcon },
  { path: 'characters', label: 'Characters', icon: UserGroupIcon },
  { path: 'puzzles', label: 'Puzzles', icon: PuzzlePieceIcon },
  { path: 'trail', label: 'Trail Map', icon: MapIcon },
  { path: 'events', label: 'Events', icon: CalendarDaysIcon },
  { path: 'locations', label: 'Locations', icon: MapPinIcon },
  { path: 'digital-properties', label: 'Digital Properties', icon: DevicePhoneMobileIcon },
  { path: 'assets', label: 'Assets', icon: PhotoIcon },
  { path: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon },
  { path: 'lore', label: 'Lore', icon: GlobeAltIcon },
  { path: 'timeline', label: 'Timeline', icon: ClockIcon },
];

const projectNavBottom = [
  { path: 'team', label: 'Team', icon: UsersIcon },
  { path: 'settings', label: 'Settings', icon: Cog6ToothIcon },
];

export default function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId!).then(res => res.data),
    enabled: !!projectId,
  });

  // Socket connection for real-time collaboration
  useEffect(() => {
    if (projectId) {
      connectSocket();
      joinProject(projectId);

      return () => {
        leaveProject(projectId);
        disconnectSocket();
      };
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-arg-purple-500"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-red-400">Project not found</h1>
        <Link to="/projects" className="btn btn-primary">
          Back to Projects
        </Link>
      </div>
    );
  }

  const currentPath = location.pathname.split('/').pop() || '';
  const isProjectRoot = location.pathname === `/project/${projectId}`;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900/50 border-r border-gray-800 flex flex-col">
        {/* Back to projects */}
        <div className="p-4 border-b border-gray-800">
          <Link
            to="/projects"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>All Projects</span>
          </Link>
        </div>

        {/* Project info */}
        <div className="p-4 border-b border-gray-800">
          {project.cover_image_url ? (
            <img
              src={project.cover_image_url}
              alt={project.name}
              className="w-full h-24 object-cover rounded-lg mb-3"
            />
          ) : (
            <div className="w-full h-24 bg-gradient-to-br from-arg-purple-500/20 to-arg-cyan-500/20 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-3xl font-bold gradient-text">
                {project.name[0]}
              </span>
            </div>
          )}
          <h1 className="text-lg font-bold text-white truncate">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx(
              'badge',
              project.status === 'live' ? 'badge-green' :
              project.status === 'development' ? 'badge-yellow' :
              project.status === 'planning' ? 'badge-purple' :
              'badge-gray'
            )}>
              {project.status}
            </span>
            {project.genre && (
              <span className="badge badge-cyan">{project.genre}</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {projectNav.map((item) => {
            const isActive = isProjectRoot
              ? item.path === ''
              : currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={`/project/${projectId}/${item.path}`}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                  isActive
                    ? 'bg-arg-purple-500/20 text-arg-purple-300'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 border-t border-gray-800 mt-4 space-y-1">
            {projectNavBottom.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.path}
                  to={`/project/${projectId}/${item.path}`}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-arg-purple-500/20 text-arg-purple-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-arg-purple-500 to-arg-cyan-500 flex items-center justify-center text-white text-sm font-medium">
              {user?.display_name?.[0] || user?.username?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.display_name || user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {project.currentUserRole}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Sign out"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <ErrorBoundary
            FallbackComponent={ProjectErrorFallback}
            onReset={() => window.location.reload()}
          >
            <Outlet context={{ project }} />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
