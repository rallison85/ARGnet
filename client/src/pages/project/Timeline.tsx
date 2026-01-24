import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timelineApi } from '../../lib/api';
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: string;
  significance: string;
  is_public: boolean;
}

export default function ProjectTimeline() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['timeline', projectId],
    queryFn: () => timelineApi.list(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<TimelineEvent>) => timelineApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', projectId] });
      setIsCreating(false);
      toast.success('Timeline event created!');
    },
  });

  const significanceColors: Record<string, string> = {
    critical: 'border-red-500 bg-red-500/10',
    major: 'border-yellow-500 bg-yellow-500/10',
    moderate: 'border-blue-500 bg-blue-500/10',
    minor: 'border-gray-500 bg-gray-500/10',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">In-Universe Timeline</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {isCreating && (
        <div className="card p-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            createMutation.mutate({
              title: data.get('title') as string,
              event_date: data.get('event_date') as string,
              description: data.get('description') as string,
              significance: data.get('significance') as string,
            });
          }} className="space-y-4">
            <h2 className="font-semibold text-white">New Timeline Event</h2>
            <div className="grid grid-cols-2 gap-4">
              <input name="title" className="input col-span-2" placeholder="Event title" required />
              <input name="event_date" className="input" placeholder="Date (e.g., 2024-03-15, 300 years ago)" required />
              <select name="significance" className="input">
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
              <textarea name="description" className="input col-span-2" rows={3} placeholder="Description" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsCreating(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : events?.length === 0 ? (
        <div className="card p-12 text-center">
          <ClockIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No timeline events yet</h3>
          <button onClick={() => setIsCreating(true)} className="btn btn-primary">
            Add First Event
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-800" />
          <div className="space-y-4">
            {events.map((event: TimelineEvent) => (
              <div key={event.id} className="relative pl-20">
                <div className="absolute left-6 top-4 w-4 h-4 rounded-full bg-arg-purple-500 border-4 border-arg-dark" />
                <div className={clsx(
                  'card p-4 border-l-4',
                  significanceColors[event.significance]
                )}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-arg-purple-300 text-sm font-mono mb-1">{event.event_date}</p>
                      <h3 className="font-semibold text-white">{event.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{event.description}</p>
                    </div>
                    <span className="badge badge-gray">{event.significance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
