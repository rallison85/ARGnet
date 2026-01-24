import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { characterApi } from '../../lib/api';
import { PlusIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Character {
  id: string;
  name: string;
  aliases: string[];
  character_type: string;
  description: string;
  backstory: string;
  personality: string;
  status: string;
  avatar_url: string | null;
}

export default function ProjectCharacters() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const { data: characters, isLoading } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => characterApi.list(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Character>) => characterApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
      setIsCreating(false);
      toast.success('Character created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Character> }) =>
      characterApi.update(projectId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
      toast.success('Character updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => characterApi.delete(projectId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
      setSelectedCharacter(null);
      toast.success('Character deleted');
    },
  });

  const characterTypes = ['all', 'protagonist', 'antagonist', 'npc', 'puppet_master', 'ai', 'organization'];

  const filteredCharacters = characters?.filter((c: Character) =>
    filter === 'all' || c.character_type === filter
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Characters</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Character
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {characterTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors',
              filter === type
                ? 'bg-arg-purple-500/20 text-arg-purple-300'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Character Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4" />
                  <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="card p-12 text-center">
              <UserIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No characters yet</h3>
              <button onClick={() => setIsCreating(true)} className="btn btn-primary">
                Create First Character
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCharacters.map((character: Character) => (
                <div
                  key={character.id}
                  onClick={() => setSelectedCharacter(character)}
                  className={clsx(
                    'card-hover p-4 text-center cursor-pointer',
                    selectedCharacter?.id === character.id && 'ring-2 ring-arg-purple-500'
                  )}
                >
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-arg-purple-500 to-arg-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                    {character.name[0]}
                  </div>
                  <h3 className="font-medium text-white truncate">{character.name}</h3>
                  <span className={clsx(
                    'badge text-xs mt-2',
                    character.character_type === 'protagonist' ? 'badge-green' :
                    character.character_type === 'antagonist' ? 'badge-red' :
                    'badge-gray'
                  )}>
                    {character.character_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Character Details */}
        {(selectedCharacter || isCreating) && (
          <div className="w-96 card p-6">
            <CharacterEditor
              character={isCreating ? undefined : selectedCharacter!}
              onSave={(data) => {
                if (isCreating) {
                  createMutation.mutate(data);
                } else {
                  updateMutation.mutate({ id: selectedCharacter!.id, data });
                }
              }}
              onDelete={selectedCharacter ? () => deleteMutation.mutate(selectedCharacter.id) : undefined}
              onCancel={() => {
                setIsCreating(false);
                setSelectedCharacter(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterEditor({
  character,
  onSave,
  onDelete,
  onCancel,
  isLoading,
}: {
  character?: Character;
  onSave: (data: Partial<Character>) => void;
  onDelete?: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: character?.name || '',
    character_type: character?.character_type || 'npc',
    description: character?.description || '',
    backstory: character?.backstory || '',
    personality: character?.personality || '',
    status: character?.status || 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">
          {character ? 'Edit Character' : 'New Character'}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">
          ×
        </button>
      </div>

      <div>
        <label className="label">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
          required
        />
      </div>

      <div>
        <label className="label">Type</label>
        <select
          value={form.character_type}
          onChange={(e) => setForm({ ...form, character_type: e.target.value })}
          className="input"
        >
          <option value="protagonist">Protagonist</option>
          <option value="antagonist">Antagonist</option>
          <option value="npc">NPC</option>
          <option value="puppet_master">Puppet Master</option>
          <option value="ai">AI</option>
          <option value="organization">Organization</option>
        </select>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          rows={3}
        />
      </div>

      <div>
        <label className="label">Personality</label>
        <textarea
          value={form.personality}
          onChange={(e) => setForm({ ...form, personality: e.target.value })}
          className="input"
          rows={2}
        />
      </div>

      <div>
        <label className="label">Backstory</label>
        <textarea
          value={form.backstory}
          onChange={(e) => setForm({ ...form, backstory: e.target.value })}
          className="input"
          rows={4}
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete} className="btn btn-danger">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
