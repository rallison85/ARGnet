import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

interface ValidationIssue {
  type: string;
  message: string;
  nodeId?: string;
  nodeName?: string;
}

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ValidationIssue[];
  isValidating: boolean;
}

const issueCategories: Record<string, { label: string; color: string }> = {
  missing_entry: { label: 'Missing Entry Point', color: 'text-red-400' },
  orphan: { label: 'Orphan Nodes', color: 'text-yellow-400' },
  unreachable: { label: 'Unreachable Nodes', color: 'text-orange-400' },
  circular: { label: 'Circular Paths', color: 'text-purple-400' },
  missing_finale: { label: 'Missing Finale', color: 'text-red-400' },
  dead_end: { label: 'Dead Ends', color: 'text-gray-400' },
};

export default function ValidationModal({
  isOpen,
  onClose,
  issues,
  isValidating,
}: ValidationModalProps) {
  const isValid = issues.length === 0 && !isValidating;

  // Group issues by type
  const grouped = issues.reduce<Record<string, ValidationIssue[]>>((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = [];
    acc[issue.type].push(issue);
    return acc;
  }, {});

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trail Validation" size="md">
      {isValidating ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-arg-purple-500" />
          <span className="text-gray-400">Validating trail...</span>
        </div>
      ) : isValid ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <CheckCircleIcon className="w-16 h-16 text-green-400" />
          <span className="text-lg font-medium text-green-400">Trail is valid!</span>
          <p className="text-sm text-gray-400">No issues found. All paths are properly connected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Found {issues.length} issue{issues.length !== 1 ? 's' : ''} that should be addressed:
          </p>
          {Object.entries(grouped).map(([type, typeIssues]) => {
            const category = issueCategories[type] || { label: type, color: 'text-gray-400' };
            return (
              <div key={type}>
                <h4 className={`text-sm font-medium ${category.color} mb-1`}>
                  {category.label} ({typeIssues.length})
                </h4>
                <ul className="space-y-1">
                  {typeIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300 pl-2">
                      <ExclamationTriangleIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${category.color}`} />
                      <span>{issue.message}{issue.nodeName ? ` (${issue.nodeName})` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onClose} className="btn btn-ghost">
          Close
        </button>
      </div>
    </Modal>
  );
}
