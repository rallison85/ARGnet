import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyApi } from '../../lib/api';
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface StoryBeat {
  id: string;
  title: string;
  content: string;
  summary: string;
  beat_type: string;
  sequence_order: number;
  status: string;
  parent_id: string | null;
  children?: StoryBeat[];
}

export default function ProjectStory() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [selectedBeat, setSelectedBeat] = useState<StoryBeat | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedBeats, setExpandedBeats] = useState<Set<string>>(new Set());

  const { data: storyTree, isLoading } = useQuery({
    queryKey: ['story-tree', projectId],
    queryFn: () => storyApi.getTree(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<StoryBeat>) => storyApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-tree', projectId] });
      setIsCreating(false);
      toast.success('Story beat created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StoryBeat> }) =>
      storyApi.update(projectId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-tree', projectId] });
      toast.success('Story beat updated!');
    },
  });

  const toggleExpand = (beatId: string) => {
    setExpandedBeats(prev => {
      const next = new Set(prev);
      if (next.has(beatId)) {
        next.delete(beatId);
      } else {
        next.add(beatId);
      }
      return next;
    });
  };

  const renderBeat = (beat: StoryBeat, depth: number = 0) => {
    const hasChildren = beat.children && beat.children.length > 0;
    const isExpanded = expandedBeats.has(beat.id);

    return (
      <div key={beat.id}>
        <div
          className={clsx(
            'flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors',
            selectedBeat?.id === beat.id
              ? 'bg-arg-purple-500/20 border border-arg-purple-500/50'
              : 'hover:bg-gray-800'
          )}
          style={{ marginLeft: depth * 24 }}
          onClick={() => setSelectedBeat(beat)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(beat.id);
              }}
              className="p-1"
            >
              <ChevronRightIcon
                className={clsx(
                  'w-4 h-4 text-gray-400 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <span className={clsx(
            'badge text-xs',
            beat.beat_type === 'act' ? 'badge-purple' :
            beat.beat_type === 'chapter' ? 'badge-cyan' :
            'badge-gray'
          )}>
            {beat.beat_type}
          </span>

          <span className="flex-1 text-white truncate">{beat.title}</span>

          <span className={clsx(
            'badge text-xs',
            beat.status === 'approved' ? 'badge-green' :
            beat.status === 'review' ? 'badge-yellow' :
            'badge-gray'
          )}>
            {beat.status}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {beat.children!.map(child => renderBeat(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Story Tree */}
      <div className="w-1/3 card p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Story Structure</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-ghost p-2"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : storyTree?.length > 0 ? (
          <div className="space-y-1">
            {storyTree.map((beat: StoryBeat) => renderBeat(beat))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No story beats yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-primary"
            >
              Create First Beat
            </button>
          </div>
        )}
      </div>

      {/* Beat Editor */}
      <div className="flex-1 card p-6 overflow-y-auto">
        {isCreating ? (
          <BeatEditor
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreating(false)}
            isLoading={createMutation.isPending}
          />
        ) : selectedBeat ? (
          <BeatEditor
            beat={selectedBeat}
            onSave={(data) => updateMutation.mutate({ id: selectedBeat.id, data })}
            onCancel={() => setSelectedBeat(null)}
            isLoading={updateMutation.isPending}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a story beat to edit or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

function BeatEditor({
  beat,
  onSave,
  onCancel,
  isLoading,
}: {
  beat?: StoryBeat;
  onSave: (data: Partial<StoryBeat>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    title: beat?.title || '',
    content: beat?.content || '',
    summary: beat?.summary || '',
    beat_type: beat?.beat_type || 'chapter',
    status: beat?.status || 'draft',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {beat ? 'Edit Story Beat' : 'New Story Beat'}
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div>
        <label className="label">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input"
          placeholder="Story beat title"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select
            value={form.beat_type}
            onChange={(e) => setForm({ ...form, beat_type: e.target.value })}
            className="input"
          >
            <option value="act">Act</option>
            <option value="chapter">Chapter</option>
            <option value="scene">Scene</option>
            <option value="moment">Moment</option>
            <option value="flashback">Flashback</option>
            <option value="parallel">Parallel</option>
          </select>
        </div>

        <div>
          <label className="label">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="input"
          >
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Summary</label>
        <input
          type="text"
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          className="input"
          placeholder="Brief summary..."
        />
      </div>

      <div>
        <label className="label">Content</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="input min-h-[300px]"
          placeholder="Full story content..."
        />
      </div>
    </form>
  );
}
