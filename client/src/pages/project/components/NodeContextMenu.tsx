import {
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';

interface TrailMapNode {
  id: string;
  name: string;
  node_type: string;
  content_type?: string;
  content_id?: string;
  is_unlocked?: number;
}

interface NodeContextMenuProps {
  node: TrailMapNode;
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleUnlock: () => void;
  onViewContent: () => void;
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, danger, disabled }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm',
        'hover:bg-gray-800 transition-colors text-left',
        danger && 'text-red-400 hover:text-red-300',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default function NodeContextMenu({
  node,
  position,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleUnlock,
  onViewContent,
}: NodeContextMenuProps) {
  if (!isOpen) return null;

  // Bounds checking to prevent menu going off-screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 200),
  };

  return (
    <>
      {/* Invisible overlay to close on click */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className="fixed z-50 card p-2 min-w-[200px] shadow-xl"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
      >
        <MenuItem
          icon={PencilIcon}
          label="Edit Node"
          onClick={() => {
            onEdit();
            onClose();
          }}
        />
        <MenuItem
          icon={TrashIcon}
          label="Delete Node"
          onClick={() => {
            onDelete();
            onClose();
          }}
          danger
        />

        <div className="h-px bg-gray-700 my-1" />

        <MenuItem
          icon={node.is_unlocked === 1 ? LockClosedIcon : LockOpenIcon}
          label={node.is_unlocked === 1 ? 'Lock Node' : 'Unlock Node'}
          onClick={() => {
            onToggleUnlock();
            onClose();
          }}
        />
        <MenuItem
          icon={EyeIcon}
          label="View Content"
          onClick={() => {
            onViewContent();
            onClose();
          }}
          disabled={!node.content_type || !node.content_id}
        />
      </div>
    </>
  );
}
