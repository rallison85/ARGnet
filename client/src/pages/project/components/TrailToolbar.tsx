import {
  ArrowsPointingOutIcon,
  LinkIcon,
  ShieldCheckIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';

interface TrailToolbarProps {
  connectMode: boolean;
  onConnectModeToggle: () => void;
  onFitView: () => void;
  onValidate: () => void;
  isSaving: boolean;
  isValidating?: boolean;
}

export default function TrailToolbar({
  connectMode,
  onConnectModeToggle,
  onFitView,
  onValidate,
  isSaving,
  isValidating = false,
}: TrailToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Connect Mode Toggle */}
      <button
        onClick={onConnectModeToggle}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          connectMode
            ? 'bg-arg-purple-600 text-white shadow-lg shadow-arg-purple-500/25'
            : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
        )}
        title={connectMode ? 'Exit connect mode' : 'Enter connect mode to draw edges'}
      >
        <LinkIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Connect</span>
        {connectMode && (
          <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">ON</span>
        )}
      </button>

      {/* Fit View Button */}
      <button
        onClick={onFitView}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
        title="Fit all nodes in view"
      >
        <ArrowsPointingOutIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Fit View</span>
      </button>

      {/* Validate Button */}
      <button
        onClick={onValidate}
        disabled={isValidating}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          isValidating
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
        )}
        title="Validate trail map structure"
      >
        <ShieldCheckIcon className={cn('w-4 h-4', isValidating && 'animate-pulse')} />
        <span className="hidden sm:inline">
          {isValidating ? 'Checking...' : 'Validate'}
        </span>
      </button>

      {/* Save Indicator */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm',
          isSaving ? 'text-arg-cyan-400' : 'text-green-400'
        )}
      >
        {isSaving ? (
          <>
            <CloudArrowUpIcon className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">Saving...</span>
          </>
        ) : (
          <>
            <CheckCircleIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Saved</span>
          </>
        )}
      </div>
    </div>
  );
}
