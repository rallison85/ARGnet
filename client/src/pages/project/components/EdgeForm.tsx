import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { puzzleApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import { TrailMapEdge, TrailMapEdgeType } from '../types/trail';

export type { TrailMapEdge } from '../types/trail';

interface EdgeFormProps {
  edge?: TrailMapEdge;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  onSave: (data: Partial<TrailMapEdge>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading: boolean;
}

const EDGE_TYPES: { value: TrailMapEdgeType; label: string; description: string }[] = [
  { value: 'automatic', label: 'Automatic', description: 'Transition happens automatically' },
  { value: 'choice', label: 'Choice', description: 'Player makes a choice to follow' },
  { value: 'puzzle', label: 'Puzzle', description: 'Requires solving a puzzle' },
  { value: 'time', label: 'Time', description: 'Unlocks after a delay or at a specific time' },
  { value: 'manual', label: 'Manual', description: 'Triggered manually by game master' },
  { value: 'conditional', label: 'Conditional', description: 'Based on custom conditions' },
];

export default function EdgeForm({
  edge,
  projectId,
  sourceNodeId,
  targetNodeId,
  onSave,
  onCancel,
  onDelete,
  isLoading,
}: EdgeFormProps) {
  const [form, setForm] = useState({
    edge_type: (edge?.edge_type || 'automatic') as TrailMapEdgeType,
    label: edge?.label || '',
    is_bidirectional: edge?.is_bidirectional || 0,
    condition_config: edge?.condition_config || '',
  });

  // Parse condition config for conditional inputs
  const [conditionConfig, setConditionConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (form.condition_config) {
      try {
        setConditionConfig(JSON.parse(form.condition_config));
      } catch {
        setConditionConfig({});
      }
    }
  }, []);

  // Load puzzles for puzzle edge type
  const { data: puzzles } = useQuery({
    queryKey: ['puzzles', projectId],
    queryFn: () => puzzleApi.list(projectId).then(res => res.data),
    enabled: form.edge_type === 'puzzle',
  });

  const handleEdgeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TrailMapEdgeType;
    setForm({ ...form, edge_type: newType, condition_config: '' });
    setConditionConfig({});
  };

  const handleConditionConfigChange = (key: string, value: unknown) => {
    const newConfig = { ...conditionConfig, [key]: value };
    setConditionConfig(newConfig);
    setForm({ ...form, condition_config: JSON.stringify(newConfig) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for puzzle type
    if (form.edge_type === 'puzzle' && !conditionConfig.puzzle_id) {
      toast.error('Please select a puzzle');
      return;
    }

    // Validation for time type
    if (form.edge_type === 'time' && !conditionConfig.delay_minutes && !conditionConfig.datetime) {
      toast.error('Please specify a delay or datetime');
      return;
    }

    const data: Partial<TrailMapEdge> = {
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      edge_type: form.edge_type,
      label: form.label.trim() || null,
      is_bidirectional: form.is_bidirectional,
      condition_config: form.condition_config || null,
    };

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Edge Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Edge Type <span className="text-red-400">*</span>
        </label>
        <select
          value={form.edge_type}
          onChange={handleEdgeTypeChange}
          className="input w-full"
        >
          {EDGE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {EDGE_TYPES.find(t => t.value === form.edge_type)?.description}
        </p>
      </div>

      {/* Puzzle Selector (for puzzle type) */}
      {form.edge_type === 'puzzle' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Required Puzzle <span className="text-red-400">*</span>
          </label>
          <select
            value={(conditionConfig.puzzle_id as string) || ''}
            onChange={(e) => handleConditionConfigChange('puzzle_id', e.target.value)}
            className="input w-full"
          >
            <option value="">Select puzzle...</option>
            {puzzles?.map((p: { id: string; title: string }) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Time Configuration (for time type) */}
      {form.edge_type === 'time' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Delay (minutes)
            </label>
            <input
              type="number"
              value={(conditionConfig.delay_minutes as number) || ''}
              onChange={(e) => handleConditionConfigChange('delay_minutes', parseInt(e.target.value) || null)}
              className="input w-full"
              placeholder="Minutes after source node completion"
              min="1"
            />
          </div>
          <div className="text-center text-gray-500 text-sm">or</div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Specific Date/Time
            </label>
            <input
              type="datetime-local"
              value={(conditionConfig.datetime as string) || ''}
              onChange={(e) => handleConditionConfigChange('datetime', e.target.value)}
              className="input w-full"
            />
          </div>
        </div>
      )}

      {/* Conditional Configuration (for conditional type) */}
      {form.edge_type === 'conditional' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Condition Expression
          </label>
          <textarea
            value={(conditionConfig.expression as string) || ''}
            onChange={(e) => handleConditionConfigChange('expression', e.target.value)}
            className="input w-full"
            rows={3}
            placeholder="e.g., player.score >= 100 && player.hasItem('key')"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter a condition expression that must be true for this edge to be traversable.
          </p>
        </div>
      )}

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Label
        </label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="input w-full"
          placeholder="Optional label shown on edge"
        />
      </div>

      {/* Bidirectional Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_bidirectional === 1}
          onChange={(e) => setForm({ ...form, is_bidirectional: e.target.checked ? 1 : 0 })}
          className="rounded border-gray-600 text-arg-purple-500 focus:ring-arg-purple-500"
        />
        <span className="text-gray-300">Bidirectional</span>
        <span className="text-gray-500 text-sm">(allows traversal in both directions)</span>
      </label>

      {/* Form Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-700">
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
          {isLoading ? 'Saving...' : edge ? 'Update' : 'Create'}
        </button>
        {edge && onDelete && (
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
