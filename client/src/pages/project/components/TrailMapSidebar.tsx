import {
  FlagIcon,
  TrophyIcon,
  MapPinIcon,
  ArrowsRightLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';
import TrailMapLegend from './TrailMapLegend';

interface TrailNode {
  id: string;
  name: string;
  node_type: string;
  description?: string;
  position_x: number;
  position_y: number;
  layer: string;
  content_type?: string;
  content_id?: string;
  unlock_condition_type?: string;
  is_required?: number;
  is_unlocked?: number;
  visibility?: string;
}

interface TrailEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
}

interface TrailMapSidebarProps {
  selectedNode: TrailNode | null;
  nodes: TrailNode[];
  edges: TrailEdge[];
  onEdit: (node: TrailNode) => void;
  onDelete: (nodeId: string) => void;
}

const nodeTypeColors: Record<string, string> = {
  entry_point: 'bg-green-500/20 text-green-400',
  waypoint: 'bg-gray-500/20 text-gray-400',
  branch: 'bg-blue-500/20 text-blue-400',
  gate: 'bg-yellow-500/20 text-yellow-400',
  merge: 'bg-cyan-500/20 text-cyan-400',
  secret: 'bg-purple-500/20 text-purple-400',
  bonus: 'bg-pink-500/20 text-pink-400',
  finale: 'bg-red-500/20 text-red-400',
  dead_end: 'bg-gray-700/20 text-gray-500',
  hub: 'bg-cyan-500/20 text-cyan-300',
  convergence: 'bg-cyan-500/20 text-cyan-400',
};

export default function TrailMapSidebar({
  selectedNode,
  nodes,
  edges,
  onEdit,
  onDelete,
}: TrailMapSidebarProps) {
  const entryPoints = nodes.filter(n => n.node_type === 'entry_point').length;
  const finales = nodes.filter(n => n.node_type === 'finale').length;

  return (
    <div className="w-80 card p-4 overflow-y-auto flex flex-col gap-4">
      {/* Quick Stats */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <MapPinIcon className="w-4 h-4 text-gray-500" />
            <span>{nodes.length} nodes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <FlagIcon className="w-4 h-4 text-green-500" />
            <span>{entryPoints} entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <TrophyIcon className="w-4 h-4 text-red-500" />
            <span>{finales} finales</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <ArrowsRightLeftIcon className="w-4 h-4 text-gray-500" />
            <span>{edges.length} connections</span>
          </div>
        </div>
      </div>

      <hr className="border-gray-700" />

      {/* Selected Node Details */}
      {selectedNode ? (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">Selected Node</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-base font-semibold text-gray-100">{selectedNode.name}</h4>
              <span className={cn(
                'inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium',
                nodeTypeColors[selectedNode.node_type] || 'bg-gray-500/20 text-gray-400'
              )}>
                {selectedNode.node_type.replace(/_/g, ' ')}
              </span>
            </div>

            {selectedNode.description && (
              <p className="text-sm text-gray-400 leading-relaxed">{selectedNode.description}</p>
            )}

            {/* Indicators */}
            <div className="flex flex-wrap gap-2">
              {selectedNode.content_type && selectedNode.content_id && (
                <div className="flex items-center gap-1 text-xs text-cyan-300">
                  <DocumentTextIcon className="w-3.5 h-3.5" />
                  <span>{selectedNode.content_type}</span>
                </div>
              )}
              {selectedNode.unlock_condition_type && selectedNode.unlock_condition_type !== 'always' && (
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <LockClosedIcon className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </div>
              )}
              {selectedNode.is_required === 1 && (
                <div className="flex items-center gap-1 text-xs text-red-300">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                  <span>Required</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onEdit(selectedNode)}
                className="btn btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => onDelete(selectedNode.id)}
                className="btn btn-ghost text-red-400 hover:text-red-300 flex items-center gap-1.5 text-sm py-1.5 px-3"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4">
          Click a node to view details
        </div>
      )}

      <hr className="border-gray-700" />

      {/* Legend */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">Legend</h3>
        <TrailMapLegend />
      </div>
    </div>
  );
}
