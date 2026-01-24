import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { puzzleApi } from '../../lib/api';
import { PlusIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Puzzle {
  id: string;
  title: string;
  description: string;
  puzzle_type: string;
  difficulty: number;
  status: string;
  setup: string;
  solution: string;
  hints: string[];
}

export default function ProjectPuzzles() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: puzzles, isLoading } = useQuery({
    queryKey: ['puzzles', projectId],
    queryFn: () => puzzleApi.list(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Puzzle>) => puzzleApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puzzles', projectId] });
      setIsCreating(false);
      toast.success('Puzzle created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Puzzle> }) =>
      puzzleApi.update(projectId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puzzles', projectId] });
      toast.success('Puzzle updated!');
    },
  });

  const difficultyColors = ['', 'badge-green', 'badge-cyan', 'badge-yellow', 'badge-red', 'badge-purple'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Puzzles</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Puzzle
        </button>
      </div>

      <div className="flex gap-6">
        {/* Puzzle List */}
        <div className="flex-1 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : puzzles?.length === 0 ? (
            <div className="card p-12 text-center">
              <PuzzlePieceIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No puzzles yet</h3>
              <button onClick={() => setIsCreating(true)} className="btn btn-primary">
                Create First Puzzle
              </button>
            </div>
          ) : (
            puzzles.map((puzzle: Puzzle) => (
              <div
                key={puzzle.id}
                onClick={() => setSelectedPuzzle(puzzle)}
                className={clsx(
                  'card-hover p-4 cursor-pointer',
                  selectedPuzzle?.id === puzzle.id && 'ring-2 ring-arg-purple-500'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">{puzzle.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{puzzle.description}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className="badge badge-gray">{puzzle.puzzle_type}</span>
                    <span className={clsx('badge', difficultyColors[puzzle.difficulty])}>
                      Lvl {puzzle.difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className={clsx(
                    'badge',
                    puzzle.status === 'live' ? 'badge-green' :
                    puzzle.status === 'approved' ? 'badge-cyan' :
                    puzzle.status === 'testing' ? 'badge-yellow' :
                    'badge-gray'
                  )}>
                    {puzzle.status}
                  </span>
                  {puzzle.hints?.length > 0 && (
                    <span>{puzzle.hints.length} hints</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        {(selectedPuzzle || isCreating) && (
          <div className="w-[500px] card p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
            <PuzzleEditor
              puzzle={isCreating ? undefined : selectedPuzzle!}
              onSave={(data) => {
                if (isCreating) {
                  createMutation.mutate(data);
                } else {
                  updateMutation.mutate({ id: selectedPuzzle!.id, data });
                }
              }}
              onCancel={() => {
                setIsCreating(false);
                setSelectedPuzzle(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PuzzleEditor({
  puzzle,
  onSave,
  onCancel,
  isLoading,
}: {
  puzzle?: Puzzle;
  onSave: (data: Partial<Puzzle>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    title: puzzle?.title || '',
    description: puzzle?.description || '',
    puzzle_type: puzzle?.puzzle_type || 'cipher',
    difficulty: puzzle?.difficulty || 3,
    status: puzzle?.status || 'draft',
    setup: puzzle?.setup || '',
    solution: puzzle?.solution || '',
    hints: puzzle?.hints?.join('\n') || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      hints: form.hints.split('\n').filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">{puzzle ? 'Edit Puzzle' : 'New Puzzle'}</h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">×</button>
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select
            value={form.puzzle_type}
            onChange={(e) => setForm({ ...form, puzzle_type: e.target.value })}
            className="input"
          >
            <option value="cipher">Cipher</option>
            <option value="code">Code</option>
            <option value="riddle">Riddle</option>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
            <option value="social">Social</option>
            <option value="meta">Meta</option>
            <option value="audio">Audio</option>
            <option value="visual">Visual</option>
            <option value="coordinates">Coordinates</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Difficulty (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: parseInt(e.target.value) })}
            className="input"
          />
        </div>
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
        <label className="label">Setup (How it's presented)</label>
        <textarea
          value={form.setup}
          onChange={(e) => setForm({ ...form, setup: e.target.value })}
          className="input"
          rows={3}
        />
      </div>

      <div>
        <label className="label">Solution</label>
        <textarea
          value={form.solution}
          onChange={(e) => setForm({ ...form, solution: e.target.value })}
          className="input"
          rows={2}
        />
      </div>

      <div>
        <label className="label">Hints (one per line)</label>
        <textarea
          value={form.hints}
          onChange={(e) => setForm({ ...form, hints: e.target.value })}
          className="input"
          rows={3}
          placeholder="Hint 1&#10;Hint 2&#10;Hint 3"
        />
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
          <option value="testing">Testing</option>
          <option value="approved">Approved</option>
          <option value="live">Live</option>
        </select>
      </div>

      <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
        {isLoading ? 'Saving...' : 'Save Puzzle'}
      </button>
    </form>
  );
}
