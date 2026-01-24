import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { projectApi } from '../lib/api';
import toast from 'react-hot-toast';

interface ProjectForm {
  name: string;
  description: string;
  tagline: string;
  genre: string;
  themes: string;
  visibility: string;
}

const genres = [
  'mystery',
  'horror',
  'sci-fi',
  'fantasy',
  'thriller',
  'drama',
  'comedy',
  'romance',
  'historical',
  'cyberpunk',
  'supernatural',
  'other',
];

export default function NewProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ProjectForm>({
    defaultValues: {
      visibility: 'private',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectForm) => {
      const themes = data.themes
        ? data.themes.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      return projectApi.create({ ...data, themes });
    },
    onSuccess: (response) => {
      toast.success('Project created!');
      navigate(`/project/${response.data.id}`);
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create project'
        : 'Failed to create project';
      toast.error(message);
    },
  });

  const onSubmit = (data: ProjectForm) => {
    createMutation.mutate(data);
  };

  const watchedName = watch('name');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-header mb-2">Create New Project</h1>
      <p className="text-gray-400 mb-8">Set up your ARG collaboration space</p>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Basic Info', 'Details', 'Settings'].map((label, i) => (
          <div key={label} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step > i + 1 ? 'bg-arg-purple-500 text-white' :
                step === i + 1 ? 'bg-arg-purple-500/20 text-arg-purple-300 ring-2 ring-arg-purple-500' :
                'bg-gray-800 text-gray-500'}
            `}>
              {i + 1}
            </div>
            <span className={`ml-2 text-sm hidden sm:block ${step >= i + 1 ? 'text-white' : 'text-gray-500'}`}>
              {label}
            </span>
            {i < 2 && (
              <div className={`w-12 sm:w-24 h-0.5 mx-4 ${step > i + 1 ? 'bg-arg-purple-500' : 'bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card p-6 space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <div>
                <label htmlFor="name" className="label">Project Name *</label>
                <input
                  {...register('name', {
                    required: 'Project name is required',
                    maxLength: { value: 100, message: 'Name must be 100 characters or less' },
                  })}
                  type="text"
                  id="name"
                  className={`input ${errors.name ? 'input-error' : ''}`}
                  placeholder="The Hollow Network"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="tagline" className="label">Tagline</label>
                <input
                  {...register('tagline', {
                    maxLength: { value: 200, message: 'Tagline must be 200 characters or less' },
                  })}
                  type="text"
                  id="tagline"
                  className={`input ${errors.tagline ? 'input-error' : ''}`}
                  placeholder="What lies beneath the surface?"
                />
                {errors.tagline && (
                  <p className="mt-1 text-sm text-red-400">{errors.tagline.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">A short hook for your ARG</p>
              </div>

              <div>
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  {...register('description', {
                    maxLength: { value: 2000, message: 'Description must be 2000 characters or less' },
                  })}
                  id="description"
                  rows={4}
                  className={`input ${errors.description ? 'input-error' : ''}`}
                  placeholder="Describe your ARG concept..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <>
              <div>
                <label htmlFor="genre" className="label">Genre</label>
                <select
                  {...register('genre')}
                  id="genre"
                  className="input"
                >
                  <option value="">Select a genre</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="themes" className="label">Themes</label>
                <input
                  {...register('themes')}
                  type="text"
                  id="themes"
                  className="input"
                  placeholder="technology, conspiracy, identity"
                />
                <p className="mt-1 text-xs text-gray-500">Comma-separated list of themes</p>
              </div>
            </>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <>
              <div>
                <label className="label">Visibility</label>
                <div className="space-y-3">
                  {[
                    { value: 'private', label: 'Private', desc: 'Only visible to team members' },
                    { value: 'team', label: 'Team', desc: 'Visible to team members and invited users' },
                    { value: 'public', label: 'Public', desc: 'Visible to everyone' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                      <input
                        {...register('visibility')}
                        type="radio"
                        value={option.value}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-white">{option.label}</p>
                        <p className="text-sm text-gray-400">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <h3 className="font-medium text-white mb-2">Project Summary</h3>
                <p className="text-sm text-gray-400">
                  <span className="text-white">{watchedName || 'Untitled Project'}</span>
                </p>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn btn-ghost"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !watchedName}
                className="btn btn-primary"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
