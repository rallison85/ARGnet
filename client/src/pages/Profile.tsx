import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface ProfileForm {
  display_name: string;
  bio: string;
}

const skillOptions = [
  'writer',
  'artist',
  'programmer',
  'designer',
  'producer',
  'voice_actor',
  'video_editor',
  'sound_designer',
  'puzzle_designer',
  'community_manager',
];

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [selectedSkills, setSelectedSkills] = useState<string[]>(user?.skills || []);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      display_name: user?.display_name || '',
      bio: user?.bio || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm & { skills: string[] }) =>
      api.patch('/auth/me', data),
    onSuccess: (_, variables) => {
      updateUser({
        display_name: variables.display_name,
        bio: variables.bio,
        skills: variables.skills,
      });
      toast.success('Profile updated!');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const onSubmit = (data: ProfileForm) => {
    updateMutation.mutate({ ...data, skills: selectedSkills });
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-header mb-8">Profile Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Preview */}
        <div className="card p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-arg-purple-500 to-arg-cyan-500 flex items-center justify-center text-3xl font-bold text-white">
              {user?.display_name?.[0] || user?.username?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {user?.display_name || user?.username}
              </h2>
              <p className="text-gray-400">@{user?.username}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Basic Information</h3>

          <div>
            <label htmlFor="display_name" className="label">Display Name</label>
            <input
              {...register('display_name', {
                maxLength: { value: 100, message: 'Display name must be 100 characters or less' },
              })}
              type="text"
              id="display_name"
              className={`input ${errors.display_name ? 'input-error' : ''}`}
              placeholder="Your display name"
            />
            {errors.display_name && (
              <p className="mt-1 text-sm text-red-400">{errors.display_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="bio" className="label">Bio</label>
            <textarea
              {...register('bio', {
                maxLength: { value: 500, message: 'Bio must be 500 characters or less' },
              })}
              id="bio"
              rows={3}
              className={`input ${errors.bio ? 'input-error' : ''}`}
              placeholder="Tell us about yourself..."
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-400">{errors.bio.message}</p>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Skills & Expertise</h3>
          <p className="text-sm text-gray-400 mb-4">
            Select the skills you bring to ARG projects
          </p>
          <div className="flex flex-wrap gap-2">
            {skillOptions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-arg-purple-500/30 text-arg-purple-300 ring-1 ring-arg-purple-500'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {skill.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Username</span>
              <span className="text-white">@{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="text-white">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Role</span>
              <span className="badge badge-purple capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
