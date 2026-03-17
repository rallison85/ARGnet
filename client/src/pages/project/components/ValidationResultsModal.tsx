import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';
import Modal from './Modal';

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: string;
  issueType: 'unreachable' | 'orphan' | 'circular' | 'entry_point';
  message: string;
  nodeId?: string;
  nodeName?: string;
  nodeIds?: string[];
  path?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  stats?: {
    totalNodes: number;
    totalEdges: number;
    entryPoints: number;
    finales: number;
    orphanCount: number;
    unreachableCount: number;
  };
}

interface ValidationResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ValidationResult | null;
  onHighlightNode?: (nodeId: string) => void;
  highlightIssues: boolean;
  onToggleHighlight: (enabled: boolean) => void;
}

export default function ValidationResultsModal({
  isOpen,
  onClose,
  result,
  onHighlightNode,
  highlightIssues,
  onToggleHighlight,
}: ValidationResultsModalProps) {
  if (!result) return null;

  // Group issues by category
  const issuesByCategory = result.issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);

  const categoryLabels: Record<string, string> = {
    entry_point: 'Entry Points',
    orphan_nodes: 'Orphan Nodes',
    unreachable_nodes: 'Unreachable Nodes',
    circular_paths: 'Circular Paths',
    dead_ends: 'Dead Ends',
    missing_finale: 'Finale Nodes',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    entry_point: <MapPinIcon className="w-4 h-4" />,
    orphan_nodes: <ExclamationTriangleIcon className="w-4 h-4" />,
    unreachable_nodes: <XCircleIcon className="w-4 h-4" />,
    circular_paths: <ExclamationTriangleIcon className="w-4 h-4" />,
    dead_ends: <ExclamationTriangleIcon className="w-4 h-4" />,
    missing_finale: <MapPinIcon className="w-4 h-4" />,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Validation Results" size="lg">
      <div className="space-y-6">
        {/* Overall Status */}
        <div
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg',
            result.isValid
              ? 'bg-green-900/30 border border-green-800'
              : 'bg-red-900/30 border border-red-800'
          )}
        >
          {result.isValid ? (
            <>
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="font-semibold text-green-400">Trail Map is Valid</h3>
                <p className="text-sm text-gray-400">No structural issues detected.</p>
              </div>
            </>
          ) : (
            <>
              <XCircleIcon className="w-8 h-8 text-red-400" />
              <div>
                <h3 className="font-semibold text-red-400">Issues Found</h3>
                <p className="text-sm text-gray-400">
                  {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} detected.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Highlight Toggle */}
        {result.issues.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-300">Highlight issues on canvas</span>
            <button
              onClick={() => onToggleHighlight(!highlightIssues)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                highlightIssues ? 'bg-arg-purple-600' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  highlightIssues ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        )}

        {/* Issues by Category */}
        {Object.entries(issuesByCategory).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(issuesByCategory).map(([category, issues]) => (
              <div key={category} className="border border-gray-800 rounded-lg overflow-hidden">
                {/* Category Header */}
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2',
                    issues.some((i) => i.type === 'error')
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  )}
                >
                  {categoryIcons[category] || <ExclamationTriangleIcon className="w-4 h-4" />}
                  <span className="font-medium">
                    {categoryLabels[category] || category}
                  </span>
                  <span className="ml-auto text-sm opacity-75">
                    {issues.length} issue{issues.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Issue List */}
                <div className="divide-y divide-gray-800">
                  {issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-2">
                        {issue.type === 'error' ? (
                          <XCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 shrink-0" />
                        )}
                        <span className="text-sm text-gray-300">{issue.message}</span>
                      </div>
                      {issue.nodeId && onHighlightNode && (
                        <button
                          onClick={() => onHighlightNode(issue.nodeId!)}
                          className="text-xs text-arg-purple-400 hover:text-arg-purple-300 px-2 py-1 rounded hover:bg-arg-purple-900/30"
                        >
                          Show
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          result.isValid && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-400" />
              <p>Your trail map structure looks good!</p>
            </div>
          )
        )}

        {/* Stats Summary */}
        {result.stats && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-800">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{result.stats.totalNodes}</div>
              <div className="text-xs text-gray-500">Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">{result.stats.totalEdges}</div>
              <div className="text-xs text-gray-500">Edges</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{result.stats.entryPoints}</div>
              <div className="text-xs text-gray-500">Entry Points</div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
