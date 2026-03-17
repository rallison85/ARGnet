import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { digitalPropertyApi } from '../../lib/api';
import { PlusIcon, DevicePhoneMobileIcon, GlobeAltIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface DigitalProperty {
  id: string;
  name: string;
  property_type: string;
  platform: string;
  url: string;
  username: string;
  description: string;
  status: string;
  owner_character_name: string;
}

export default function ProjectDigitalProperties() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const { data: properties, isLoading, isError } = useQuery({
    queryKey: ['digital-properties', projectId],
    queryFn: () => digitalPropertyApi.list(projectId!).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DigitalProperty>) => digitalPropertyApi.create(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-properties', projectId] });
      setIsCreating(false);
      toast.success('Digital property created!');
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'website': return GlobeAltIcon;
      case 'email': return EnvelopeIcon;
      default: return DevicePhoneMobileIcon;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Digital Properties</h1>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Property
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
              property_type: data.get('property_type') as string,
              platform: data.get('platform') as string,
              url: data.get('url') as string,
              username: data.get('username') as string,
              description: data.get('description') as string,
            });
          }} className="space-y-4">
            <h2 className="font-semibold text-white">New Digital Property</h2>
            <div className="grid grid-cols-2 gap-4">
              <input name="name" className="input" placeholder="Property name" required />
              <select name="property_type" className="input" required>
                <option value="website">Website</option>
                <option value="social_media">Social Media</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="app">App</option>
                <option value="video_channel">Video Channel</option>
                <option value="podcast">Podcast</option>
              </select>
              <input name="platform" className="input" placeholder="Platform (e.g., Twitter, Instagram)" />
              <input name="username" className="input" placeholder="Username/Handle" />
              <input name="url" className="input col-span-2" placeholder="URL" />
              <textarea name="description" className="input col-span-2" rows={2} placeholder="Description/Purpose" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsCreating(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : isError ? (
        <div className="card p-12 text-center">
          <DevicePhoneMobileIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to load digital properties</h3>
          <p className="text-gray-400 mb-4">There was an error loading the data. Please try again.</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['digital-properties', projectId] })} className="btn btn-primary">
            Retry
          </button>
        </div>
      ) : !properties || properties.length === 0 ? (
        <div className="card p-12 text-center">
          <DevicePhoneMobileIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No digital properties yet</h3>
          <p className="text-gray-400 mb-4">Create in-game websites, social media accounts, and more</p>
          <button onClick={() => setIsCreating(true)} className="btn btn-primary">
            Add First Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {properties.map((prop: DigitalProperty) => {
            const Icon = getIcon(prop.property_type);
            return (
              <div key={prop.id} className="card-hover p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-arg-purple-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-arg-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{prop.name}</h3>
                    <p className="text-sm text-gray-400">{prop.platform || prop.property_type}</p>
                    {prop.username && (
                      <p className="text-sm text-arg-cyan-400">@{prop.username}</p>
                    )}
                  </div>
                  <span className={clsx(
                    'badge',
                    prop.status === 'active' ? 'badge-green' :
                    prop.status === 'created' ? 'badge-cyan' :
                    'badge-gray'
                  )}>
                    {prop.status}
                  </span>
                </div>
                {prop.owner_character_name && (
                  <p className="text-xs text-gray-500 mt-2">Owner: {prop.owner_character_name}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
