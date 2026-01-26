import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../../lib/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to_name: string;
  due_date: string;
}

const statusColumns = ['todo', 'in_progress', 'review', 'done'];

export default function ProjectTasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const { data: board, isLoading } = useQuery({
    queryKey: ['task-board', projectId],
    queryFn: () => taskApi.getBoard(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => taskApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-board', projectId] });
      setIsCreating(false);
      toast.success('Task created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskApi.update(projectId!, id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-board', projectId] });
    },
  });

  const handleDrop = (taskId: string, newStatus: string) => {
    updateMutation.mutate({ id: taskId, status: newStatus });
  };

  const priorityColors: Record<string, string> = {
    urgent: 'border-l-red-500',
    high: 'border-l-yellow-500',
    medium: 'border-l-blue-500',
    low: 'border-l-gray-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Tasks</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Task
        </button>
      </div>

      {isCreating && (
        <div className="card p-6">
          <TaskForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreating(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-900/50 rounded-lg p-4 h-96 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {statusColumns.map(status => (
            <div
              key={status}
              className="bg-gray-900/50 rounded-lg p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = e.dataTransfer.getData('taskId');
                if (taskId) handleDrop(taskId, status);
              }}
            >
              <h3 className="font-semibold text-white mb-4 capitalize flex items-center gap-2">
                <span className={clsx(
                  'w-2 h-2 rounded-full',
                  status === 'done' ? 'bg-green-500' :
                  status === 'in_progress' ? 'bg-yellow-500' :
                  status === 'review' ? 'bg-blue-500' : 'bg-gray-500'
                )} />
                {status.replace('_', ' ')}
                <span className="text-gray-500 text-sm">({board?.[status]?.length || 0})</span>
              </h3>
              <div className="space-y-2">
                {board?.[status]?.map((task: Task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                    className={clsx(
                      'card p-3 cursor-move border-l-4',
                      priorityColors[task.priority]
                    )}
                  >
                    <p className="text-white text-sm font-medium">{task.title}</p>
                    {task.assigned_to_name && (
                      <p className="text-xs text-gray-500 mt-1">👤 {task.assigned_to_name}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-gray-500">📅 {task.due_date}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskForm({
  onSave,
  onCancel,
  isLoading,
}: {
  onSave: (data: Partial<Task>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <h2 className="font-semibold text-white text-lg">New Task</h2>
      <div>
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
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          rows={2}
        />
      </div>
      <div>
        <label className="label">Priority</label>
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="input"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
