import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../../lib/api';
import {
  BookOpenIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string;
  tagline: string;
  status: string;
  genre: string;
  themes: string[];
  stats: {
    story_beats: number;
    characters: number;
    puzzles: number;
    events: number;
    tasks: number;
    tasks_completed: number;
  };
  members: Array<{
    id: string;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    role: string;
    department: string;
  }>;
}

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project } = useOutletContext<{ project: Project }>();

  const { data: activityData } = useQuery({
    queryKey: ['project-activity-summary', projectId],
    queryFn: () => activityApi.getSummary(projectId!, 7).then(res => res.data),
  });

  const stats = [
    { label: 'Story Beats', value: project.stats.story_beats, icon: BookOpenIcon, color: 'text-arg-purple-400', link: 'story' },
    { label: 'Characters', value: project.stats.characters, icon: UserGroupIcon, color: 'text-arg-cyan-400', link: 'characters' },
    { label: 'Puzzles', value: project.stats.puzzles, icon: PuzzlePieceIcon, color: 'text-yellow-400', link: 'puzzles' },
    { label: 'Events', value: project.stats.events, icon: CalendarDaysIcon, color: 'text-green-400', link: 'events' },
  ];

  const taskProgress = project.stats.tasks > 0
    ? Math.round((project.stats.tasks_completed / project.stats.tasks) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div>
        <h1 className="page-header">{project.name}</h1>
        {project.tagline && (
          <p className="text-lg text-arg-purple-300 mt-2">{project.tagline}</p>
        )}
        {project.description && (
          <p className="text-gray-400 mt-4 max-w-3xl">{project.description}</p>
        )}
        {project.themes && project.themes.length > 0 && (
          <div className="flex gap-2 mt-4">
            {project.themes.map((theme, i) => (
              <span key={i} className="badge badge-gray">#{theme}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={`/project/${projectId}/${stat.link}`}
            className="card-hover p-4"
          >
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Progress */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5" />
              Task Progress
            </h2>
            <Link to={`/project/${projectId}/tasks`} className="text-sm link">
              View all
            </Link>
          </div>

          <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden mb-2">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-arg-purple-500 to-arg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${taskProgress}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {project.stats.tasks_completed} of {project.stats.tasks} tasks
            </span>
            <span className="text-arg-purple-300">{taskProgress}%</span>
          </div>
        </div>

        {/* Team Members */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              Team
            </h2>
            <Link to={`/project/${projectId}/team`} className="text-sm link">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {project.members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-arg-purple-500 to-arg-cyan-500 flex items-center justify-center text-sm font-medium text-white">
                  {member.display_name?.[0] || member.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {member.display_name || member.username}
                  </p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
              </div>
            ))}
            {project.members.length > 5 && (
              <p className="text-sm text-gray-500">
                +{project.members.length - 5} more
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Activity</h2>
          </div>

          {activityData?.recentActivity?.length > 0 ? (
            <div className="space-y-3">
              {activityData.recentActivity.slice(0, 5).map((activity: {
                id: string;
                action: string;
                entity_type: string;
                entity_name: string;
                username: string;
                display_name: string;
                created_at: string;
              }) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">
                      <span className="text-white">{activity.display_name || activity.username}</span>
                      {' '}{activity.action}{' '}
                      <span className="text-arg-purple-300">{activity.entity_name || activity.entity_type}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Add Story Beat', link: 'story', icon: BookOpenIcon },
          { label: 'Create Character', link: 'characters', icon: UserGroupIcon },
          { label: 'Design Puzzle', link: 'puzzles', icon: PuzzlePieceIcon },
          { label: 'Plan Event', link: 'events', icon: CalendarDaysIcon },
        ].map((action) => (
          <Link
            key={action.label}
            to={`/project/${projectId}/${action.link}`}
            className="card-hover p-4 flex items-center gap-3"
          >
            <action.icon className="w-5 h-5 text-arg-purple-400" />
            <span className="text-sm text-gray-300">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
