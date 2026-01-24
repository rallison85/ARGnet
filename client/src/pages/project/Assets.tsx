import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetApi } from '../../lib/api';
import { PlusIcon, PhotoIcon, DocumentIcon, MusicalNoteIcon, FilmIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  file_path: string;
  file_size: number;
  status: string;
  tags: string[];
}

export default function ProjectAssets() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('all');

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', projectId],
    queryFn: () => assetApi.list(projectId!).then(res => res.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      return assetApi.upload(projectId!, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
      toast.success('Asset uploaded!');
    },
    onError: () => {
      toast.error('Upload failed');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return PhotoIcon;
      case 'video': return FilmIcon;
      case 'audio': return MusicalNoteIcon;
      default: return DocumentIcon;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const types = ['all', 'image', 'video', 'audio', 'document', 'other'];
  const filtered = assets?.filter((a: Asset) => filter === 'all' || a.asset_type === filter) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Assets</h1>
        <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Upload Asset
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex gap-2">
        {types.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm capitalize',
              filter === type ? 'bg-arg-purple-500/20 text-arg-purple-300' : 'bg-gray-800 text-gray-400'
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {uploadMutation.isPending && (
        <div className="card p-4 flex items-center gap-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-arg-purple-500" />
          <span className="text-gray-400">Uploading...</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card p-4 animate-pulse aspect-square" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <PhotoIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No assets yet</h3>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
            Upload First Asset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((asset: Asset) => {
            const Icon = getIcon(asset.asset_type);
            return (
              <div key={asset.id} className="card-hover p-4 text-center">
                {asset.asset_type === 'image' ? (
                  <img src={asset.file_path} alt={asset.name} className="w-full h-24 object-cover rounded mb-2" />
                ) : (
                  <div className="w-full h-24 bg-gray-800 rounded mb-2 flex items-center justify-center">
                    <Icon className="w-10 h-10 text-gray-600" />
                  </div>
                )}
                <p className="text-sm text-white truncate">{asset.name}</p>
                <p className="text-xs text-gray-500">{formatSize(asset.file_size)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
