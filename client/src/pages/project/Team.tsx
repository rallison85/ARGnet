import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../../lib/api';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Project {
  id: string;
  name: string;
  members: Array<{
    id: string;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    email: string;
    role: string;
    department: string;
    title: string;
  }>;
  currentUserRole: string;
}

export default function ProjectTeam() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project } = useOutletContext<{ project: Project }>();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');

  const addMemberMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      projectApi.addMember(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setIsAdding(false);
      setEmail('');
      toast.success('Member invited!');
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to add member'
        : 'Failed to add member';
      toast.error(message);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: { role?: string; department?: string; title?: string } }) =>
      projectApi.updateMember(projectId!, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member updated!');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => projectApi.removeMember(projectId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
  });

  const canManage = ['owner', 'admin'].includes(project.currentUserRole);

  const roleColors: Record<string, string> = {
    owner: 'badge-purple',
    admin: 'badge-red',
    lead: 'badge-yellow',
    contributor: 'badge-cyan',
    viewer: 'badge-gray',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Team</h1>
        {canManage && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5" />
            Add Member
          </button>
        )}
      </div>

      {isAdding && (
        <div className="card p-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            addMemberMutation.mutate({ email, role });
          }} className="space-y-4">
            <h2 className="font-semibold text-white">Invite Team Member</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Email address"
                required
              />
              <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="lead">Lead</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsAdding(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={addMemberMutation.isPending} className="btn btn-primary">
                {addMemberMutation.isPending ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Title</th>
              {canManage && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {project.members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-800/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-arg-purple-500 to-arg-cyan-500 flex items-center justify-center text-white font-medium">
                      {member.display_name?.[0] || member.username[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.display_name || member.username}</p>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {canManage && member.role !== 'owner' ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberMutation.mutate({
                        memberId: member.id,
                        data: { role: e.target.value }
                      })}
                      className="input py-1 text-sm w-32"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="contributor">Contributor</option>
                      <option value="lead">Lead</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={clsx('badge', roleColors[member.role])}>
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-300">{member.department || '-'}</td>
                <td className="px-6 py-4 text-gray-300">{member.title || '-'}</td>
                {canManage && (
                  <td className="px-6 py-4 text-right">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => {
                          if (confirm('Remove this member?')) {
                            removeMemberMutation.mutate(member.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
