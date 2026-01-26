import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmButtonClass = 'btn-danger',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
          </div>
        </div>

        {/* Message */}
        <p className="text-center text-gray-300">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn ${confirmButtonClass} flex-1`}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
