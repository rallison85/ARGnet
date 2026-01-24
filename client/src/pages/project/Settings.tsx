import { useState } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  description: string;
  tagline: string;
  status: string;
  visibility: string;
  genre: string;
  themes: string[];
  currentUserRole: string;
}

export default function ProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project } = useOutletContext<{ project: Project }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: project.name,
    description: project.description || '',
    tagline: project.tagline || '',
    status: project.status,
    visibility: project.visibility,
    genre: project.genre || '',
    themes: project.themes?.join(', ') || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form & { themes: string[] }) =>
      projectApi.update(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Settings saved!');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectApi.delete(projectId!),
    onSuccess: () => {
      toast.success('Project deleted');
      navigate('/projects');
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      themes: form.themes.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  const canEdit = ['owner', 'admin'].includes(project.currentUserRole);
  const isOwner = project.currentUserRole === 'owner';

  if (!canEdit) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-400">You don't have permission to edit project settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="page-header">Project Settings</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <h2 className="font-semibold text-white">General</h2>

        <div>
          <label className="label">Project Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="input"
            placeholder="A short hook for your ARG"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="input"
            >
              <option value="planning">Planning</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
              <option value="live">Live</option>
              <option value="concluded">Concluded</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="label">Visibility</label>
            <select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
              className="input"
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Genre</label>
          <input
            type="text"
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
            className="input"
            placeholder="e.g., mystery, horror, sci-fi"
          />
        </div>

        <div>
          <label className="label">Themes</label>
          <input
            type="text"
            value={form.themes}
            onChange={(e) => setForm({ ...form, themes: e.target.value })}
            className="input"
            placeholder="Comma-separated themes"
          />
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="btn btn-primary"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {isOwner && (
        <div className="card p-6 border-red-500/20">
          <h2 className="font-semibold text-red-400 mb-4">Danger Zone</h2>
          <p className="text-gray-400 mb-4">
            Once you delete a project, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="btn btn-danger"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      )}
    </div>
  );
}
