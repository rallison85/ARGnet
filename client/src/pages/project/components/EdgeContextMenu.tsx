import {
  PencilIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';
import { TrailMapEdge } from '../types/trail';

interface EdgeContextMenuProps {
  edge: TrailMapEdge;
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReverse: () => void;
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm',
        'hover:bg-gray-800 transition-colors text-left',
        danger && 'text-red-400 hover:text-red-300'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default function EdgeContextMenu({
  position,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onReverse,
}: EdgeContextMenuProps) {
  if (!isOpen) return null;

  // Bounds checking to prevent menu going off-screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 160),
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
        className="fixed z-50 card p-2 min-w-[180px] shadow-xl"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
      >
        <MenuItem
          icon={PencilIcon}
          label="Edit Edge"
          onClick={() => {
            onEdit();
            onClose();
          }}
        />
        <MenuItem
          icon={ArrowsRightLeftIcon}
          label="Reverse Direction"
          onClick={() => {
            onReverse();
            onClose();
          }}
        />

        <div className="h-px bg-gray-700 my-1" />

        <MenuItem
          icon={TrashIcon}
          label="Delete Edge"
          onClick={() => {
            onDelete();
            onClose();
          }}
          danger
        />
      </div>
    </>
  );
}
