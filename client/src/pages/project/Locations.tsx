import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationApi } from '../../lib/api';
import { PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Location {
  id: string;
  name: string;
  location_type: string;
  address: string;
  description: string;
  significance: string;
  status: string;
}

export default function ProjectLocations() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selected, setSelected] = useState<Location | null>(null);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', projectId],
    queryFn: () => locationApi.list(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Location>) => locationApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', projectId] });
      setIsCreating(false);
      toast.success('Location created!');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Locations</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Location
        </button>
      </div>

      {isCreating && (
        <div className="card p-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            createMutation.mutate({
              name: data.get('name') as string,
              location_type: data.get('location_type') as string,
              address: data.get('address') as string,
              description: data.get('description') as string,
            });
          }} className="space-y-4">
            <h2 className="font-semibold text-white">New Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <input name="name" className="input" placeholder="Location name" required />
              <select name="location_type" className="input">
                <option value="physical">Physical</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hybrid</option>
                <option value="fictional">Fictional</option>
              </select>
              <input name="address" className="input col-span-2" placeholder="Address or URL" />
              <textarea name="description" className="input col-span-2" rows={3} placeholder="Description" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsCreating(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-4 animate-pulse h-32" />
              ))}
            </div>
          ) : locations?.length === 0 ? (
            <div className="card p-12 text-center">
              <MapPinIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No locations yet</h3>
              <button onClick={() => setIsCreating(true)} className="btn btn-primary">
                Add First Location
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {locations.map((loc: Location) => (
                <div
                  key={loc.id}
                  onClick={() => setSelected(loc)}
                  className={clsx(
                    'card-hover p-4 cursor-pointer',
                    selected?.id === loc.id && 'ring-2 ring-arg-purple-500'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white">{loc.name}</h3>
                    <span className={clsx(
                      'badge',
                      loc.location_type === 'physical' ? 'badge-green' :
                      loc.location_type === 'virtual' ? 'badge-cyan' :
                      'badge-gray'
                    )}>
                      {loc.location_type}
                    </span>
                  </div>
                  {loc.address && (
                    <p className="text-sm text-gray-400 truncate">{loc.address}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="w-96 card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{selected.name}</h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="text-white ml-2 capitalize">{selected.location_type}</span>
              </div>
              {selected.address && (
                <div>
                  <span className="text-gray-500">Address:</span>
                  <p className="text-white mt-1">{selected.address}</p>
                </div>
              )}
              {selected.description && (
                <div>
                  <span className="text-gray-500">Description:</span>
                  <p className="text-gray-300 mt-1">{selected.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
