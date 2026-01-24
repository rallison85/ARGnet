import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventApi } from '../../lib/api';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Event {
  id: string;
  title: string;
  event_type: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  location_name: string;
  staff_count: number;
}

export default function ProjectEvents() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', projectId],
    queryFn: () => eventApi.list(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Event>) => eventApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', projectId] });
      setIsCreating(false);
      toast.success('Event created!');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Events</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Event
        </button>
      </div>

      {isCreating && (
        <div className="card p-6">
          <EventForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreating(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : events?.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No events yet</h3>
          <button onClick={() => setIsCreating(true)} className="btn btn-primary">
            Create First Event
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event: Event) => (
            <div key={event.id} className="card-hover p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white text-lg">{event.title}</h3>
                  <p className="text-gray-400 mt-1">{event.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className="badge badge-cyan">{event.event_type}</span>
                  <span className={clsx(
                    'badge',
                    event.status === 'completed' ? 'badge-green' :
                    event.status === 'confirmed' ? 'badge-cyan' :
                    event.status === 'in_progress' ? 'badge-yellow' :
                    'badge-gray'
                  )}>
                    {event.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-400">
                {event.scheduled_start && (
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {format(new Date(event.scheduled_start), 'PPp')}
                  </span>
                )}
                {event.location_name && <span>📍 {event.location_name}</span>}
                <span>👥 {event.staff_count} staff</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventForm({
  onSave,
  onCancel,
  isLoading,
}: {
  onSave: (data: Partial<Event>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    title: '',
    event_type: 'meetup',
    description: '',
    scheduled_start: '',
    scheduled_end: '',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <h2 className="font-semibold text-white text-lg">New Event</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Type</label>
          <select
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            className="input"
          >
            <option value="performance">Performance</option>
            <option value="installation">Installation</option>
            <option value="meetup">Meetup</option>
            <option value="drop">Drop</option>
            <option value="broadcast">Broadcast</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="label">Start Time</label>
          <input
            type="datetime-local"
            value={form.scheduled_start}
            onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
            className="input"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
            rows={3}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}
