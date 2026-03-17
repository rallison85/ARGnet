import { useCallback, useEffect, memo, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Connection,
  NodeProps,
  Handle,
  Position,
  ReactFlowProvider,
  MarkerType,
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
import CustomTrailEdge, { CustomEdgeData } from './components/CustomTrailEdge';
import {
  TrailMapNode,
  TrailMapEdge,
  TrailMapNodeType,
  TrailMapEdgeType,
} from './types/trail';

// Re-export types for existing consumers
export type { TrailMapNode, TrailMapEdge, TrailMapNodeType, TrailMapEdgeType } from './types/trail';
export type { UnlockConditionType } from './types/trail';

interface TrailMapCanvasProps {
  projectId: string;
  nodes: TrailMapNode[];
  edges: TrailMapEdge[];
  onNodeClick?: (node: TrailMapNode) => void;
  onNodeDoubleClick?: (node: TrailMapNode) => void;
  onNodeContextMenu?: (node: TrailMapNode, event: React.MouseEvent) => void;
  onNodePositionChange?: (nodeId: string, x: number, y: number) => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  onEdgeClick?: (edge: TrailMapEdge) => void;
  onEdgeContextMenu?: (edge: TrailMapEdge, event: React.MouseEvent) => void;
  onEdgeDelete?: (edgeId: string) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  readOnly?: boolean;
  onFitViewReady?: (fitViewFn: () => void) => void;
  layerFilter?: 'narrative' | 'physical' | 'both' | 'validation';
  highlightedNodes?: Map<string, 'unreachable' | 'orphan' | 'circular'>;
  validationNodeIds?: string[];
}

export type ValidationIssueType = 'unreachable' | 'orphan' | 'circular' | null;

// Stable references for default props to avoid re-render cascades
const EMPTY_HIGHLIGHTED_NODES = new Map<string, 'unreachable' | 'orphan' | 'circular'>();
const EMPTY_VALIDATION_NODE_IDS: string[] = [];

interface CustomNodeData {
  originalNode: TrailMapNode;
  name: string;
  node_type: TrailMapNodeType;
  hasContent: boolean;
  content_type: string | null;
  isLocked: boolean;
  is_required: boolean;
  highlightType: ValidationIssueType;
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
          'hover:shadow-xl hover:scale-105 cursor-pointer',
          getNodeBorderColor(data.node_type),
          selected && 'ring-2 ring-arg-purple-500',
          // Validation issue highlights with different colors
          data.highlightType === 'unreachable' && 'ring-2 ring-red-500 animate-pulse shadow-red-500/50 shadow-lg',
          data.highlightType === 'orphan' && 'ring-2 ring-orange-500 animate-pulse shadow-orange-500/50 shadow-lg',
          data.highlightType === 'circular' && 'ring-2 ring-yellow-500 animate-pulse shadow-yellow-500/50 shadow-lg'
        )}
        title={`${data.name} (${data.node_type})${data.highlightType ? ` - ${data.highlightType} issue` : ''}`}
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

        {/* Validation issue badge */}
        {data.highlightType && (
          <div
            className={cn(
              'mt-2 px-2 py-1 rounded text-xs font-medium text-center',
              data.highlightType === 'unreachable' && 'bg-red-500/30 text-red-300 border border-red-500/50',
              data.highlightType === 'orphan' && 'bg-orange-500/30 text-orange-300 border border-orange-500/50',
              data.highlightType === 'circular' && 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
            )}
          >
            {data.highlightType === 'unreachable' && 'Unreachable'}
            {data.highlightType === 'orphan' && 'Orphan Node'}
            {data.highlightType === 'circular' && 'Circular Path'}
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
// EDGE TYPES CONFIG
// ============================================================================

const edgeTypes = {
  customTrailEdge: CustomTrailEdge,
};

// ============================================================================
// MINIMAP NODE COLOR
// ============================================================================

const MINIMAP_NODE_COLORS: Record<TrailMapNodeType, string> = {
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

const getMinimapNodeColor = (node: Node<CustomNodeData>): string =>
  MINIMAP_NODE_COLORS[node.data.node_type] || '#6b7280';

// ============================================================================
// MAIN TRAIL MAP CANVAS COMPONENT (INNER - HAS ACCESS TO useReactFlow)
// ============================================================================

function TrailMapCanvasInner({
  nodes: trailNodes,
  edges: trailEdges,
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  onNodePositionChange,
  onEdgeCreate,
  onEdgeClick,
  onEdgeContextMenu,
  onEdgeDelete,
  selectedNodeId,
  selectedEdgeId,
  readOnly = false,
  onFitViewReady,
  layerFilter = 'both',
  highlightedNodes = EMPTY_HIGHLIGHTED_NODES,
  validationNodeIds = EMPTY_VALIDATION_NODE_IDS,
}: TrailMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const hasInitialFit = useRef(false);

  // Expose fitView function to parent
  useEffect(() => {
    if (onFitViewReady) {
      onFitViewReady(() => fitView({ padding: 0.2, maxZoom: 1 }));
    }
  }, [fitView, onFitViewReady]);

  // Memoize validation node set for efficient lookup
  const validationNodeSet = useMemo(() => new Set(validationNodeIds), [validationNodeIds]);

  // Memoize filtered nodes by layer
  const filteredTrailNodes = useMemo(() => {
    if (layerFilter === 'both') {
      return trailNodes;
    }
    if (layerFilter === 'validation') {
      // Show only nodes with validation issues
      return trailNodes.filter((node) => validationNodeSet.has(node.id));
    }
    return trailNodes.filter((node) => node.layer === layerFilter);
  }, [trailNodes, layerFilter, validationNodeSet]);

  // Memoize filtered edges (only include edges connecting visible nodes)
  const filteredTrailEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredTrailNodes.map((n) => n.id));
    return trailEdges.filter(
      (edge) => visibleNodeIds.has(edge.source_node_id) && visibleNodeIds.has(edge.target_node_id)
    );
  }, [trailEdges, filteredTrailNodes]);

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  // Transform trail nodes to ReactFlow nodes
  // When layer filter or highlights change, we need to rebuild the node list
  useEffect(() => {
    const newNodes = filteredTrailNodes.map((node) => ({
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
        highlightType: highlightedNodes.get(node.id) || null,
      },
      selected: false,
    }));
    setNodes(newNodes);
  }, [filteredTrailNodes, setNodes, highlightedNodes]);

  // Handle node selection separately (without resetting positions)
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  // Transform trail edges to ReactFlow edges (only when trail data changes)
  useEffect(() => {
    const flowEdges: Edge<CustomEdgeData>[] = filteredTrailEdges.map((edge) => {
      // Get edge color for marker
      const colorMap: Record<TrailMapEdgeType, string> = {
        automatic: '#6b7280',
        choice: '#eab308',
        puzzle: '#a855f7',
        time: '#3b82f6',
        manual: '#22c55e',
        conditional: '#f97316',
      };
      const edgeColor = colorMap[edge.edge_type] || '#6b7280';

      return {
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        type: 'customTrailEdge',
        animated: ['puzzle', 'time'].includes(edge.edge_type),
        selected: false,
        data: {
          edge_type: edge.edge_type,
          is_bidirectional: edge.is_bidirectional,
          label: edge.label,
          is_active: edge.is_active,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: edgeColor,
        },
      };
    });
    setEdges(flowEdges);
  }, [filteredTrailEdges, setEdges]);

  // Handle edge selection separately
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        selected: edge.id === selectedEdgeId,
      }))
    );
  }, [selectedEdgeId, setEdges]);

  // Fit view only once on initial load
  useEffect(() => {
    if (!hasInitialFit.current && filteredTrailNodes.length > 0) {
      // Small delay to ensure nodes are rendered
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, maxZoom: 1 });
        hasInitialFit.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filteredTrailNodes.length, fitView]);

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
   * Handle node double-click to edit
   */
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<CustomNodeData>) => {
      if (readOnly || !onNodeDoubleClick) return;
      if (node.data.originalNode) {
        onNodeDoubleClick(node.data.originalNode);
      }
    },
    [readOnly, onNodeDoubleClick]
  );

  /**
   * Handle node context menu (right-click)
   */
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<CustomNodeData>) => {
      event.preventDefault();
      if (readOnly || !onNodeContextMenu) return;
      if (node.data.originalNode) {
        onNodeContextMenu(node.data.originalNode, event);
      }
    },
    [readOnly, onNodeContextMenu]
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
   * Handle edge click for selection
   */
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge<CustomEdgeData>) => {
      if (!onEdgeClick) return;
      // Find the original trail edge
      const trailEdge = trailEdges.find(e => e.id === edge.id);
      if (trailEdge) {
        onEdgeClick(trailEdge);
      }
    },
    [onEdgeClick, trailEdges]
  );

  /**
   * Handle edge context menu (right-click)
   */
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge<CustomEdgeData>) => {
      event.preventDefault();
      if (readOnly || !onEdgeContextMenu) return;
      // Find the original trail edge
      const trailEdge = trailEdges.find(e => e.id === edge.id);
      if (trailEdge) {
        onEdgeContextMenu(trailEdge, event);
      }
    },
    [readOnly, onEdgeContextMenu, trailEdges]
  );

  /**
   * Handle connection creation
   * Note: We intentionally do NOT add the edge to local state here.
   * The parent component opens an EdgeForm modal, and on save the server
   * round-trip + query invalidation populates the edge. Adding a local edge
   * here would create a phantom edge if the user cancels the modal.
   */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;

      if (connection.source && connection.target && onEdgeCreate) {
        onEdgeCreate(connection.source, connection.target);
      }
    },
    [onEdgeCreate, readOnly]
  );

  /**
   * Handle edge changes (including keyboard delete)
   */
  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      // Intercept remove changes to call the delete API
      for (const change of changes) {
        if (change.type === 'remove' && onEdgeDelete) {
          onEdgeDelete(change.id);
        }
      }
      // Apply the changes to local state
      onEdgesChange(changes);
    },
    [onEdgesChange, onEdgeDelete]
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
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        onConnect={handleConnect}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={true}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'customTrailEdge',
        }}
        connectionLineStyle={{
          stroke: '#a855f7',
          strokeWidth: 2,
        }}
      >
        <Background color="#374151" gap={20} />
        <Controls className="!bg-gray-800 !border-gray-700" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          maskColor="rgba(0, 0, 0, 0.6)"
          nodeColor={getMinimapNodeColor}
        />
      </ReactFlow>
    </div>
  );
}

// ============================================================================
// OUTER COMPONENT (PROVIDES ReactFlowProvider)
// ============================================================================

export default memo(function TrailMapCanvas(props: TrailMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <TrailMapCanvasInner {...props} />
    </ReactFlowProvider>
  );
});
