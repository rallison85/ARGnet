import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loreApi } from '../../lib/api';
import { PlusIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LoreEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  is_public: boolean;
}

export default function ProjectLore() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<LoreEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: loreTree, isLoading } = useQuery({
    queryKey: ['lore-tree', projectId],
    queryFn: () => loreApi.getTree(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LoreEntry>) => loreApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lore-tree', projectId] });
      setIsCreating(false);
      toast.success('Lore entry created!');
    },
  });

  const categories = loreTree ? Object.keys(loreTree) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">World Lore</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Entry
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
              category: data.get('category') as string,
              content: data.get('content') as string,
            });
          }} className="space-y-4">
            <h2 className="font-semibold text-white">New Lore Entry</h2>
            <input name="title" className="input" placeholder="Title" required />
            <input name="category" className="input" placeholder="Category (e.g., history, technology)" />
            <textarea name="content" className="input" rows={6} placeholder="Content..." />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsCreating(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-6">
        <div className="w-1/3 space-y-4">
          {isLoading ? (
            <div className="card p-4 animate-pulse h-48" />
          ) : categories.length === 0 ? (
            <div className="card p-8 text-center">
              <BookOpenIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No lore entries yet</p>
            </div>
          ) : (
            categories.map(category => (
              <div key={category} className="card p-4">
                <h3 className="font-semibold text-white mb-2 capitalize">{category}</h3>
                <div className="space-y-1">
                  {loreTree[category].map((entry: LoreEntry) => (
                    <button
                      key={entry.id}
                      onClick={() => setSelected(entry)}
                      className={`w-full text-left px-2 py-1 rounded text-sm ${
                        selected?.id === entry.id
                          ? 'bg-arg-purple-500/20 text-arg-purple-300'
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {entry.title}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex-1 card p-6">
          {selected ? (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">{selected.title}</h2>
              <span className="badge badge-gray mb-4">{selected.category}</span>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 whitespace-pre-wrap">{selected.content}</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a lore entry to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
