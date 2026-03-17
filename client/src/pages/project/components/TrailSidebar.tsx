import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  CheckCircleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';
import { TrailMapNode, TrailMapEdge, TrailMapNodeType, TrailMapEdgeType } from '../TrailMapCanvas';

interface TrailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: TrailMapNode | null;
  selectedEdge: TrailMapEdge | null;
  nodes: TrailMapNode[];
  edges: TrailMapEdge[];
  onEditNode: (node: TrailMapNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onEditEdge: (edge: TrailMapEdge) => void;
  onDeleteEdge: (edgeId: string) => void;
}

const nodeTypeLabels: Record<TrailMapNodeType, string> = {
  entry_point: 'Entry Point',
  waypoint: 'Waypoint',
  branch: 'Branch',
  gate: 'Gate',
  merge: 'Merge',
  secret: 'Secret',
  bonus: 'Bonus',
  finale: 'Finale',
  dead_end: 'Dead End',
  hub: 'Hub',
  convergence: 'Convergence',
};

const nodeTypeColors: Record<TrailMapNodeType, string> = {
  entry_point: 'bg-green-500/20 text-green-400',
  waypoint: 'bg-gray-500/20 text-gray-400',
  branch: 'bg-blue-500/20 text-blue-400',
  gate: 'bg-yellow-500/20 text-yellow-400',
  merge: 'bg-cyan-500/20 text-cyan-400',
  secret: 'bg-purple-500/20 text-purple-400',
  bonus: 'bg-pink-500/20 text-pink-400',
  finale: 'bg-red-500/20 text-red-400',
  dead_end: 'bg-gray-600/20 text-gray-500',
  hub: 'bg-cyan-500/20 text-cyan-400',
  convergence: 'bg-cyan-500/20 text-cyan-400',
};

const edgeTypeLabels: Record<TrailMapEdgeType, string> = {
  automatic: 'Automatic',
  choice: 'Choice',
  puzzle: 'Puzzle',
  time: 'Time-Based',
  manual: 'Manual',
  conditional: 'Conditional',
};

const edgeTypeColors: Record<TrailMapEdgeType, string> = {
  automatic: 'bg-gray-500/20 text-gray-400',
  choice: 'bg-yellow-500/20 text-yellow-400',
  puzzle: 'bg-purple-500/20 text-purple-400',
  time: 'bg-blue-500/20 text-blue-400',
  manual: 'bg-green-500/20 text-green-400',
  conditional: 'bg-orange-500/20 text-orange-400',
};

export default function TrailSidebar({
  isOpen,
  onClose,
  selectedNode,
  selectedEdge,
  nodes,
  edges,
  onEditNode,
  onDeleteNode,
  onEditEdge,
  onDeleteEdge,
}: TrailSidebarProps) {
  if (!isOpen) return null;

  // Calculate stats
  const stats = {
    totalNodes: nodes.length,
    nodesByType: nodes.reduce((acc, node) => {
      acc[node.node_type] = (acc[node.node_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalEdges: edges.length,
    entryPoints: nodes.filter((n) => n.node_type === 'entry_point').length,
    // Simple orphan detection: nodes with no edges
    orphanNodes: nodes.filter((node) => {
      const hasIncoming = edges.some((e) => e.target_node_id === node.id);
      const hasOutgoing = edges.some((e) => e.source_node_id === node.id);
      return !hasIncoming && !hasOutgoing && node.node_type !== 'entry_point';
    }).length,
  };

  // Get node name by ID
  const getNodeName = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node?.name || 'Unknown';
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">
          {selectedNode ? 'Node Details' : selectedEdge ? 'Edge Details' : 'Trail Stats'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode ? (
          <NodeDetails
            node={selectedNode}
            onEdit={() => onEditNode(selectedNode)}
            onDelete={() => onDeleteNode(selectedNode.id)}
          />
        ) : selectedEdge ? (
          <EdgeDetails
            edge={selectedEdge}
            getNodeName={getNodeName}
            onEdit={() => onEditEdge(selectedEdge)}
            onDelete={() => onDeleteEdge(selectedEdge.id)}
          />
        ) : (
          <StatsView stats={stats} />
        )}
      </div>
    </div>
  );
}

interface NodeDetailsProps {
  node: TrailMapNode;
  onEdit: () => void;
  onDelete: () => void;
}

function NodeDetails({ node, onEdit, onDelete }: NodeDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Name and badges */}
      <div>
        <h4 className="text-lg font-medium text-white mb-2">{node.name}</h4>
        <div className="flex flex-wrap gap-2">
          <span className={cn('px-2 py-1 text-xs rounded-full', nodeTypeColors[node.node_type])}>
            {nodeTypeLabels[node.node_type]}
          </span>
          <span className={cn(
            'px-2 py-1 text-xs rounded-full',
            node.layer === 'narrative' ? 'bg-arg-purple-500/20 text-arg-purple-400' : 'bg-arg-cyan-500/20 text-arg-cyan-400'
          )}>
            {node.layer}
          </span>
        </div>
      </div>

      {/* Description */}
      {node.description && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <p className="text-sm text-gray-300">{node.description}</p>
        </div>
      )}

      {/* Unlock Condition */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Unlock Condition</label>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <LockClosedIcon className="w-4 h-4 text-yellow-400" />
          <span className="capitalize">{node.unlock_condition_type.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Completion Condition */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Completion Condition</label>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <CheckCircleIcon className="w-4 h-4 text-green-400" />
          <span className="capitalize">{node.completion_condition_type.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Content Link */}
      {node.content_type && node.content_id && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Linked Content</label>
          <div className="flex items-center gap-2 text-sm text-cyan-400">
            <LinkIcon className="w-4 h-4" />
            <span className="capitalize">{node.content_type}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-800">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 hover:text-red-300 rounded-lg text-sm transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

interface EdgeDetailsProps {
  edge: TrailMapEdge;
  getNodeName: (nodeId: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}

function EdgeDetails({ edge, getNodeName, onEdit, onDelete }: EdgeDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Edge Type Badge */}
      <div>
        <span className={cn('px-2 py-1 text-xs rounded-full', edgeTypeColors[edge.edge_type])}>
          {edgeTypeLabels[edge.edge_type]}
        </span>
      </div>

      {/* Source -> Target */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Connection</label>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-medium">{getNodeName(edge.source_node_id)}</span>
          <ArrowsRightLeftIcon className="w-4 h-4 text-gray-500" />
          <span className="text-white font-medium">{getNodeName(edge.target_node_id)}</span>
        </div>
      </div>

      {/* Label */}
      {edge.label && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <p className="text-sm text-gray-300">{edge.label}</p>
        </div>
      )}

      {/* Bidirectional Indicator */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Direction</label>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          {edge.is_bidirectional ? (
            <>
              <ArrowsRightLeftIcon className="w-4 h-4 text-arg-purple-400" />
              <span>Bidirectional</span>
            </>
          ) : (
            <span>One-way</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-800">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 hover:text-red-300 rounded-lg text-sm transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

interface StatsViewProps {
  stats: {
    totalNodes: number;
    nodesByType: Record<string, number>;
    totalEdges: number;
    entryPoints: number;
    orphanNodes: number;
  };
}

function StatsView({ stats }: StatsViewProps) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{stats.totalNodes}</div>
          <div className="text-xs text-gray-500">Total Nodes</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{stats.totalEdges}</div>
          <div className="text-xs text-gray-500">Total Edges</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">{stats.entryPoints}</div>
          <div className="text-xs text-gray-500">Entry Points</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className={cn(
            'text-2xl font-bold',
            stats.orphanNodes > 0 ? 'text-yellow-400' : 'text-white'
          )}>
            {stats.orphanNodes}
          </div>
          <div className="text-xs text-gray-500">Orphan Nodes</div>
        </div>
      </div>

      {/* Nodes by Type */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Nodes by Type</h4>
        <div className="space-y-2">
          {Object.entries(stats.nodesByType).map(([type, count]) => (
            <div
              key={type}
              className="flex items-center justify-between text-sm"
            >
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                nodeTypeColors[type as TrailMapNodeType] || 'bg-gray-500/20 text-gray-400'
              )}>
                {nodeTypeLabels[type as TrailMapNodeType] || type}
              </span>
              <span className="text-gray-300">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Helpful message */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-800">
        Click a node or edge to see its details here.
      </div>
    </div>
  );
}
