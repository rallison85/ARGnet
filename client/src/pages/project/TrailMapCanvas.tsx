import { useCallback, useEffect, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Connection,
  NodeProps,
  Handle,
  Position,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  FlagIcon,
  MapPinIcon,
  ArrowsPointingOutIcon,
  ShieldCheckIcon,
  ArrowsPointingInIcon,
  EyeSlashIcon,
  SparklesIcon,
  TrophyIcon,
  NoSymbolIcon,
  CircleStackIcon,
  LockClosedIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TrailMapNodeType =
  | 'entry_point'
  | 'waypoint'
  | 'branch'
  | 'gate'
  | 'merge'
  | 'secret'
  | 'bonus'
  | 'finale'
  | 'dead_end'
  | 'hub'
  | 'convergence';

export type UnlockConditionType =
  | 'always'
  | 'puzzle_solved'
  | 'time_reached'
  | 'node_completed'
  | 'manual_trigger'
  | 'player_count'
  | 'external_event';

export type TrailMapEdgeType =
  | 'automatic'
  | 'choice'
  | 'puzzle'
  | 'time'
  | 'manual'
  | 'conditional';

export interface TrailMapNode {
  id: string;
  project_id: string;
  name: string;
  node_type: TrailMapNodeType;
  description: string | null;
  position_x: number;
  position_y: number;
  layer: 'narrative' | 'physical';
  content_type: string | null;
  content_id: string | null;
  unlock_condition_type: UnlockConditionType;
  unlock_condition_config: string | null;
  completion_condition_type: string;
  completion_condition_config: string | null;
  estimated_duration_minutes: number | null;
  is_required: number;
  visibility: string;
  is_unlocked: number;
  is_completed: number;
  sort_order: number;
  discovery_method: string | null;
  estimated_discovery_time: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TrailMapEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: TrailMapEdgeType;
  condition_config: string | null;
  is_bidirectional: number;
  label: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface TrailMapCanvasProps {
  projectId: string;
  nodes: TrailMapNode[];
  edges: TrailMapEdge[];
  onNodeClick?: (node: TrailMapNode) => void;
  onNodePositionChange?: (nodeId: string, x: number, y: number) => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  selectedNodeId?: string | null;
  readOnly?: boolean;
}

interface CustomNodeData {
  originalNode: TrailMapNode;
  name: string;
  node_type: TrailMapNodeType;
  hasContent: boolean;
  content_type: string | null;
  isLocked: boolean;
  is_required: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get border color class based on node type
 */
const getNodeBorderColor = (nodeType: TrailMapNodeType): string => {
  const colorMap: Record<TrailMapNodeType, string> = {
    entry_point: 'border-green-500',
    waypoint: 'border-gray-600',
    branch: 'border-blue-500',
    gate: 'border-yellow-500',
    merge: 'border-cyan-500',
    secret: 'border-purple-500',
    bonus: 'border-pink-500',
    finale: 'border-red-500',
    dead_end: 'border-gray-700',
    hub: 'border-arg-cyan-500',
    convergence: 'border-cyan-500',
  };
  return colorMap[nodeType] || 'border-gray-600';
};

/**
 * Get icon color class based on node type
 */
const getNodeIconColor = (nodeType: TrailMapNodeType): string => {
  const colorMap: Record<TrailMapNodeType, string> = {
    entry_point: 'text-green-400',
    waypoint: 'text-gray-400',
    branch: 'text-blue-400',
    gate: 'text-yellow-400',
    merge: 'text-cyan-400',
    secret: 'text-purple-400',
    bonus: 'text-pink-400',
    finale: 'text-red-400',
    dead_end: 'text-gray-500',
    hub: 'text-arg-cyan-400',
    convergence: 'text-cyan-400',
  };
  return colorMap[nodeType] || 'text-gray-400';
};

/**
 * Get edge style based on edge type
 */
const getEdgeStyle = (edge: TrailMapEdge): React.CSSProperties => {
  const colorMap: Record<TrailMapEdgeType, string> = {
    automatic: '#6b7280', // gray
    choice: '#eab308',     // yellow
    puzzle: '#a855f7',     // purple
    time: '#3b82f6',       // blue
    manual: '#22c55e',     // green
    conditional: '#f97316', // orange
  };

  const baseStyle: React.CSSProperties = {
    stroke: colorMap[edge.edge_type] || '#6b7280',
    strokeWidth: 2,
  };

  // Add dashed line for choice type
  if (edge.edge_type === 'choice') {
    baseStyle.strokeDasharray = '5,5';
  }

  return baseStyle;
};

// ============================================================================
// NODE TYPE ICON COMPONENT
// ============================================================================

interface NodeTypeIconProps {
  type: TrailMapNodeType;
  className?: string;
}

const NodeTypeIcon = memo(({ type, className }: NodeTypeIconProps) => {
  const iconClass = cn('w-5 h-5', className);

  const icons: Record<TrailMapNodeType, JSX.Element> = {
    entry_point: <FlagIcon className={iconClass} />,
    waypoint: <MapPinIcon className={iconClass} />,
    branch: <ArrowsPointingOutIcon className={iconClass} />,
    gate: <ShieldCheckIcon className={iconClass} />,
    merge: <ArrowsPointingInIcon className={iconClass} />,
    secret: <EyeSlashIcon className={iconClass} />,
    bonus: <SparklesIcon className={iconClass} />,
    finale: <TrophyIcon className={iconClass} />,
    dead_end: <NoSymbolIcon className={iconClass} />,
    hub: <CircleStackIcon className={iconClass} />,
    convergence: <ArrowsPointingInIcon className={iconClass} />,
  };

  return icons[type] || <MapPinIcon className={iconClass} />;
});

NodeTypeIcon.displayName = 'NodeTypeIcon';

// ============================================================================
// CUSTOM TRAIL NODE COMPONENT
// ============================================================================

const CustomTrailNode = memo(({ data, selected }: NodeProps<CustomNodeData>) => {
  return (
    <>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={true}
        className="!w-3 !h-3 !bg-arg-purple-500 !border-2 !border-gray-900 hover:!w-4 hover:!h-4 transition-all cursor-crosshair"
      />

      <div
        className={cn(
          'relative min-w-[180px] rounded-lg border-2 p-3 shadow-lg',
          'bg-gray-900/90 backdrop-blur-sm',
          'transition-all duration-200',
          getNodeBorderColor(data.node_type),
          selected && 'ring-2 ring-arg-purple-500'
        )}
      >
        {/* Header with icon and name */}
        <div className="flex items-center gap-2 mb-2">
          <NodeTypeIcon
            type={data.node_type}
            className={getNodeIconColor(data.node_type)}
          />
          <span className="font-medium text-white text-sm line-clamp-2">
            {data.name}
          </span>
        </div>

        {/* Indicators row */}
        {(data.hasContent || data.isLocked || data.is_required) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Content indicator */}
            {data.hasContent && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300"
                title={`Has ${data.content_type || 'content'}`}
              >
                <DocumentTextIcon className="w-3 h-3" />
                <span className="text-xs">Content</span>
              </div>
            )}

            {/* Lock indicator */}
            {data.isLocked && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400"
                title="Locked - requires unlock condition"
              >
                <LockClosedIcon className="w-3 h-3" />
                <span className="text-xs">Locked</span>
              </div>
            )}

            {/* Required indicator */}
            {data.is_required && (
              <div
                className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs"
                title="Required for story completion"
              >
                Required
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={true}
        className="!w-3 !h-3 !bg-arg-purple-500 !border-2 !border-gray-900 hover:!w-4 hover:!h-4 transition-all cursor-crosshair"
      />
    </>
  );
});

CustomTrailNode.displayName = 'CustomTrailNode';

// ============================================================================
// NODE TYPES CONFIG
// ============================================================================

const nodeTypes = {
  trailNode: CustomTrailNode,
};

// ============================================================================
// MAIN TRAIL MAP CANVAS COMPONENT
// ============================================================================

export default function TrailMapCanvas({
  nodes: trailNodes,
  edges: trailEdges,
  onNodeClick,
  onNodePositionChange,
  onEdgeCreate,
  selectedNodeId,
  readOnly = false,
}: TrailMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  // Transform trail nodes to ReactFlow nodes
  useEffect(() => {
    const flowNodes: Node<CustomNodeData>[] = trailNodes.map((node) => ({
      id: node.id,
      type: 'trailNode',
      position: { x: node.position_x, y: node.position_y },
      data: {
        originalNode: node,
        name: node.name,
        node_type: node.node_type,
        hasContent: !!(node.content_type && node.content_id),
        content_type: node.content_type,
        isLocked: node.unlock_condition_type !== 'always',
        is_required: node.is_required === 1,
      },
      selected: node.id === selectedNodeId,
    }));
    setNodes(flowNodes);
  }, [trailNodes, selectedNodeId, setNodes]);

  // Transform trail edges to ReactFlow edges
  useEffect(() => {
    const flowEdges: Edge[] = trailEdges.map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      animated: ['puzzle', 'time'].includes(edge.edge_type),
      style: getEdgeStyle(edge),
      label: edge.label || undefined,
      labelStyle: {
        fill: '#e5e7eb',
        fontSize: 12,
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: '#1f2937',
        fillOpacity: 0.9,
      },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
    }));
    setEdges(flowEdges);
  }, [trailEdges, setEdges]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle node click for selection
   */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<CustomNodeData>) => {
      if (onNodeClick && node.data.originalNode) {
        onNodeClick(node.data.originalNode);
      }
    },
    [onNodeClick]
  );

  /**
   * Handle node drag stop to update position
   */
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (readOnly || !onNodePositionChange) return;
      onNodePositionChange(node.id, node.position.x, node.position.y);
    },
    [onNodePositionChange, readOnly]
  );

  /**
   * Handle connection creation
   */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;

      // Add edge to local state immediately for visual feedback
      setEdges((eds) => addEdge({
        ...connection,
        animated: false,
        style: {
          stroke: '#6b7280',
          strokeWidth: 2,
        },
        type: 'smoothstep',
      }, eds));

      // Call the optional callback for parent component to handle persistence
      if (connection.source && connection.target && onEdgeCreate) {
        onEdgeCreate(connection.source, connection.target);
      }
    },
    [onEdgeCreate, readOnly, setEdges]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={true}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        connectionLineStyle={{
          stroke: '#a855f7',
          strokeWidth: 2,
        }}
        connectionLineType="smoothstep"
      >
        <Background color="#374151" gap={20} />
        <Controls className="!bg-gray-800 !border-gray-700" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          maskColor="rgba(0, 0, 0, 0.6)"
          nodeColor={(node) => {
            const data = node.data as CustomNodeData;
            // Return color based on node type for minimap
            const colorMap: Record<TrailMapNodeType, string> = {
              entry_point: '#22c55e',
              waypoint: '#6b7280',
              branch: '#3b82f6',
              gate: '#eab308',
              merge: '#06b6d4',
              secret: '#a855f7',
              bonus: '#ec4899',
              finale: '#ef4444',
              dead_end: '#4b5563',
              hub: '#06b6d4',
              convergence: '#06b6d4',
            };
            return colorMap[data.node_type] || '#6b7280';
          }}
        />
      </ReactFlow>
    </div>
  );
}
