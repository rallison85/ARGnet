import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { puzzleApi, eventApi, locationApi, storyApi } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface TrailMapNode {
  id: string;
  name: string;
  node_type: string;
  description?: string;
  layer: string;
  content_type?: string;
  content_id?: string;
  unlock_condition_type?: string;
  unlock_condition_config?: string;
  completion_condition_type?: string;
  completion_condition_config?: string;
  estimated_duration_minutes?: number | null;
  is_required?: number;
  visibility?: string;
  position_x: number;
  position_y: number;
  is_unlocked?: number;
}

interface NodeFormProps {
  node?: TrailMapNode;
  projectId: string;
  onSave: (data: Partial<TrailMapNode>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading: boolean;
  defaultPosition?: { x: number; y: number };
}

export default function NodeForm({
  node,
  projectId,
  onSave,
  onCancel,
  onDelete,
  isLoading,
  defaultPosition,
}: NodeFormProps) {
  const [form, setForm] = useState({
    name: node?.name || '',
    node_type: node?.node_type || 'waypoint',
    description: node?.description || '',
    layer: node?.layer || 'narrative',
    content_type: node?.content_type || '',
    content_id: node?.content_id || '',
    unlock_condition_type: node?.unlock_condition_type || 'always',
    unlock_condition_config: node?.unlock_condition_config || '',
    completion_condition_type: node?.completion_condition_type || 'automatic',
    completion_condition_config: node?.completion_condition_config || '',
    estimated_duration_minutes: node?.estimated_duration_minutes || null,
    is_required: node?.is_required || 0,
    visibility: node?.visibility || 'always_visible',
    position_x: node?.position_x || defaultPosition?.x || 0,
    position_y: node?.position_y || defaultPosition?.y || 0,
  });

  // Parse unlock condition config for conditional inputs
  const [unlockConfig, setUnlockConfig] = useState<Record<string, any>>({});
  const [completionConfig, setCompletionConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (form.unlock_condition_config) {
      try {
        setUnlockConfig(JSON.parse(form.unlock_condition_config));
      } catch {
        setUnlockConfig({});
      }
    }
  }, [form.unlock_condition_config]);

  useEffect(() => {
    if (form.completion_condition_config) {
      try {
        setCompletionConfig(JSON.parse(form.completion_condition_config));
      } catch {
        setCompletionConfig({});
      }
    }
  }, [form.completion_condition_config]);

  // Load content options based on type
  const { data: puzzles } = useQuery({
    queryKey: ['puzzles', projectId],
    queryFn: () => puzzleApi.list(projectId).then(res => res.data),
    enabled: form.content_type === 'puzzle',
  });

  const { data: events } = useQuery({
    queryKey: ['events', projectId],
    queryFn: () => eventApi.list(projectId).then(res => res.data),
    enabled: form.content_type === 'event',
  });

  const { data: locations } = useQuery({
    queryKey: ['locations', projectId],
    queryFn: () => locationApi.list(projectId).then(res => res.data),
    enabled: form.content_type === 'location',
  });

  const { data: storyBeats } = useQuery({
    queryKey: ['stories', projectId],
    queryFn: () => storyApi.list(projectId).then(res => res.data),
    enabled: form.content_type === 'story_beat',
  });

  // Load puzzles for unlock conditions
  const { data: unlockPuzzles } = useQuery({
    queryKey: ['puzzles', projectId],
    queryFn: () => puzzleApi.list(projectId).then(res => res.data),
    enabled: form.unlock_condition_type === 'puzzle_solved',
  });

  const handleContentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, content_type: e.target.value, content_id: '' });
  };

  const handleUnlockConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, unlock_condition_type: e.target.value, unlock_condition_config: '' });
    setUnlockConfig({});
  };

  const handleCompletionConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, completion_condition_type: e.target.value, completion_condition_config: '' });
    setCompletionConfig({});
  };

  const handleUnlockConfigChange = (key: string, value: any) => {
    const newConfig = { ...unlockConfig, [key]: value };
    setUnlockConfig(newConfig);
    setForm({ ...form, unlock_condition_config: JSON.stringify(newConfig) });
  };

  const handleCompletionConfigChange = (key: string, value: any) => {
    const newConfig = { ...completionConfig, [key]: value };
    setCompletionConfig(newConfig);
    setForm({ ...form, completion_condition_config: JSON.stringify(newConfig) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (form.content_type && !form.content_id) {
      toast.error('Please select a content item');
      return;
    }

    if (form.estimated_duration_minutes !== null && form.estimated_duration_minutes < 0) {
      toast.error('Duration must be positive');
      return;
    }

    // Prepare data
    const data: Partial<TrailMapNode> = {
      name: form.name.trim(),
      node_type: form.node_type,
      description: form.description.trim() || undefined,
      layer: form.layer,
      content_type: form.content_type || undefined,
      content_id: form.content_id || undefined,
      unlock_condition_type: form.unlock_condition_type,
      unlock_condition_config: form.unlock_condition_config || undefined,
      completion_condition_type: form.completion_condition_type,
      completion_condition_config: form.completion_condition_config || undefined,
      estimated_duration_minutes: form.estimated_duration_minutes,
      is_required: form.is_required,
      visibility: form.visibility,
      position_x: form.position_x,
      position_y: form.position_y,
    };

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input w-full"
            placeholder="Node name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Node Type
          </label>
          <select
            value={form.node_type}
            onChange={(e) => setForm({ ...form, node_type: e.target.value })}
            className="input w-full"
          >
            <option value="entry_point">Entry Point</option>
            <option value="waypoint">Waypoint</option>
            <option value="branch">Branch</option>
            <option value="gate">Gate</option>
            <option value="merge">Merge</option>
            <option value="secret">Secret</option>
            <option value="bonus">Bonus</option>
            <option value="finale">Finale</option>
            <option value="dead_end">Dead End</option>
            <option value="hub">Hub</option>
            <option value="convergence">Convergence</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Layer
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="layer"
                value="narrative"
                checked={form.layer === 'narrative'}
                onChange={(e) => setForm({ ...form, layer: e.target.value })}
                className="text-arg-purple-500 focus:ring-arg-purple-500"
              />
              <span className="text-gray-300">Narrative</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="layer"
                value="physical"
                checked={form.layer === 'physical'}
                onChange={(e) => setForm({ ...form, layer: e.target.value })}
                className="text-arg-purple-500 focus:ring-arg-purple-500"
              />
              <span className="text-gray-300">Physical</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input w-full"
            rows={3}
            placeholder="Optional description"
          />
        </div>
      </div>

      {/* Content Association */}
      <div className="space-y-4 pt-4 border-t border-gray-700">
        <h3 className="font-medium text-gray-200">Content Association</h3>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Content Type
          </label>
          <select
            value={form.content_type}
            onChange={handleContentTypeChange}
            className="input w-full"
          >
            <option value="">None</option>
            <option value="puzzle">Puzzle</option>
            <option value="event">Event</option>
            <option value="location">Location</option>
            <option value="story_beat">Story Beat</option>
          </select>
        </div>

        {form.content_type === 'puzzle' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Puzzle
            </label>
            <select
              value={form.content_id}
              onChange={(e) => setForm({ ...form, content_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select puzzle...</option>
              {puzzles?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {form.content_type === 'event' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Event
            </label>
            <select
              value={form.content_id}
              onChange={(e) => setForm({ ...form, content_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select event...</option>
              {events?.map((ev: any) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>
        )}

        {form.content_type === 'location' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Location
            </label>
            <select
              value={form.content_id}
              onChange={(e) => setForm({ ...form, content_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select location...</option>
              {locations?.map((loc: any) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        )}

        {form.content_type === 'story_beat' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Story Beat
            </label>
            <select
              value={form.content_id}
              onChange={(e) => setForm({ ...form, content_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select story beat...</option>
              {storyBeats?.map((beat: any) => (
                <option key={beat.id} value={beat.id}>{beat.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Unlock Conditions */}
      <Disclosure>
        {({ open }) => (
          <div className="pt-4 border-t border-gray-700">
            <Disclosure.Button className="flex items-center justify-between w-full">
              <span className="font-medium text-gray-200">Unlock Conditions</span>
              <ChevronDownIcon
                className={cn('w-5 h-5 transition-transform text-gray-400', open && 'rotate-180')}
              />
            </Disclosure.Button>
            <Disclosure.Panel className="space-y-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Unlock Type
                </label>
                <select
                  value={form.unlock_condition_type}
                  onChange={handleUnlockConditionChange}
                  className="input w-full"
                >
                  <option value="always">Always Unlocked</option>
                  <option value="puzzle_solved">Puzzle Solved</option>
                  <option value="time_reached">Time Reached</option>
                  <option value="node_completed">Node Completed</option>
                  <option value="manual_trigger">Manual Trigger</option>
                  <option value="player_count">Player Count</option>
                  <option value="external_event">External Event</option>
                </select>
              </div>

              {form.unlock_condition_type === 'puzzle_solved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Required Puzzle
                  </label>
                  <select
                    value={unlockConfig.puzzle_id || ''}
                    onChange={(e) => handleUnlockConfigChange('puzzle_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select puzzle...</option>
                    {unlockPuzzles?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.unlock_condition_type === 'time_reached' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Unlock Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={unlockConfig.datetime || ''}
                    onChange={(e) => handleUnlockConfigChange('datetime', e.target.value)}
                    className="input w-full"
                  />
                </div>
              )}

              {form.unlock_condition_type === 'node_completed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Node ID
                  </label>
                  <input
                    type="text"
                    value={unlockConfig.node_id || ''}
                    onChange={(e) => handleUnlockConfigChange('node_id', e.target.value)}
                    className="input w-full"
                    placeholder="Enter node ID"
                  />
                </div>
              )}

              {form.unlock_condition_type === 'player_count' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Minimum Players
                  </label>
                  <input
                    type="number"
                    value={unlockConfig.min_players || ''}
                    onChange={(e) => handleUnlockConfigChange('min_players', parseInt(e.target.value))}
                    className="input w-full"
                    min="1"
                  />
                </div>
              )}

              {form.unlock_condition_type === 'external_event' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={unlockConfig.event_name || ''}
                    onChange={(e) => handleUnlockConfigChange('event_name', e.target.value)}
                    className="input w-full"
                    placeholder="Enter event trigger name"
                  />
                </div>
              )}
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>

      {/* Completion Conditions */}
      <Disclosure>
        {({ open }) => (
          <div className="pt-4 border-t border-gray-700">
            <Disclosure.Button className="flex items-center justify-between w-full">
              <span className="font-medium text-gray-200">Completion Conditions</span>
              <ChevronDownIcon
                className={cn('w-5 h-5 transition-transform text-gray-400', open && 'rotate-180')}
              />
            </Disclosure.Button>
            <Disclosure.Panel className="space-y-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Completion Type
                </label>
                <select
                  value={form.completion_condition_type}
                  onChange={handleCompletionConditionChange}
                  className="input w-full"
                >
                  <option value="automatic">Automatic</option>
                  <option value="puzzle_solved">Puzzle Solved</option>
                  <option value="manual">Manual</option>
                  <option value="time_based">Time Based</option>
                </select>
              </div>

              {form.completion_condition_type === 'puzzle_solved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Required Puzzle
                  </label>
                  <select
                    value={completionConfig.puzzle_id || ''}
                    onChange={(e) => handleCompletionConfigChange('puzzle_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select puzzle...</option>
                    {puzzles?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.completion_condition_type === 'time_based' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={completionConfig.duration_minutes || ''}
                    onChange={(e) => handleCompletionConfigChange('duration_minutes', parseInt(e.target.value))}
                    className="input w-full"
                    min="1"
                  />
                </div>
              )}
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>

      {/* Additional Settings */}
      <Disclosure>
        {({ open }) => (
          <div className="pt-4 border-t border-gray-700">
            <Disclosure.Button className="flex items-center justify-between w-full">
              <span className="font-medium text-gray-200">Additional Settings</span>
              <ChevronDownIcon
                className={cn('w-5 h-5 transition-transform text-gray-400', open && 'rotate-180')}
              />
            </Disclosure.Button>
            <Disclosure.Panel className="space-y-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={form.estimated_duration_minutes ?? ''}
                  onChange={(e) => setForm({
                    ...form,
                    estimated_duration_minutes: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="input w-full"
                  placeholder="Optional"
                  min="0"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_required === 1}
                  onChange={(e) => setForm({ ...form, is_required: e.target.checked ? 1 : 0 })}
                  className="rounded border-gray-600 text-arg-purple-500 focus:ring-arg-purple-500"
                />
                <span className="text-gray-300">Required for story completion</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Visibility
                </label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="input w-full"
                >
                  <option value="always_visible">Always Visible</option>
                  <option value="hidden_until_unlocked">Hidden Until Unlocked</option>
                  <option value="teased">Teased</option>
                </select>
              </div>
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>

      {/* Form Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn btn-ghost flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary flex-1"
        >
          {isLoading ? 'Saving...' : node ? 'Update' : 'Create'}
        </button>
        {node && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading}
            className="btn btn-danger"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
