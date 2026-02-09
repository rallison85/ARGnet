import {
  PlusIcon,
  ArrowsPointingOutIcon,
  ShieldCheckIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';

interface TrailMapToolbarProps {
  onAddNode: () => void;
  onFitView: () => void;
  onValidate: () => void;
  connectMode: boolean;
  onConnectModeToggle: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function TrailMapToolbar({
  onAddNode,
  onFitView,
  onValidate,
  connectMode,
  onConnectModeToggle,
  isSaving,
  lastSaved,
}: TrailMapToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={onAddNode}
          className="btn btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
        >
          <PlusIcon className="w-4 h-4" />
          Add Node
        </button>

        <button
          onClick={onConnectModeToggle}
          className={cn(
            'btn flex items-center gap-1.5 text-sm py-1.5 px-3',
            connectMode ? 'btn-primary' : 'btn-ghost'
          )}
        >
          <LinkIcon className="w-4 h-4" />
          Connect
        </button>

        <button
          onClick={onFitView}
          className="btn btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
        >
          <ArrowsPointingOutIcon className="w-4 h-4" />
          Fit View
        </button>

        <button
          onClick={onValidate}
          className="btn btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
        >
          <ShieldCheckIcon className="w-4 h-4" />
          Validate
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        {isSaving ? (
          <>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span>Saving...</span>
          </>
        ) : lastSaved ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span>Saved {formatTimeAgo(lastSaved)}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
