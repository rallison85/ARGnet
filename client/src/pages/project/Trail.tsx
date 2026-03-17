import { useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { trailApi } from '../../lib/api';
import { PlusIcon, Bars3BottomRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { CanvasErrorFallback } from '../../components/ErrorFallback';
import Modal from './components/Modal';
import ConfirmDialog from './components/ConfirmDialog';
import NodeForm from './components/NodeForm';
import NodeContextMenu from './components/NodeContextMenu';
import EdgeForm, { TrailMapEdge } from './components/EdgeForm';
import EdgeContextMenu from './components/EdgeContextMenu';
import TrailMapCanvas, { TrailMapNode, TrailMapEdge as CanvasEdge } from './TrailMapCanvas';
import LayerToggle, { LayerOption } from './components/LayerToggle';
import TrailToolbar from './components/TrailToolbar';
import TrailSidebar from './components/TrailSidebar';
import ValidationResultsModal, { ValidationResult } from './components/ValidationResultsModal';

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
  unlock_condition_config?: string;
  completion_condition_type?: string;
  completion_condition_config?: string;
  estimated_duration_minutes?: number | null;
  is_required?: number;
  visibility?: string;
  is_unlocked?: number;
}

type TrailMapEdgeType =
  | 'automatic'
  | 'choice'
  | 'puzzle'
  | 'time'
  | 'manual'
  | 'conditional';

interface TrailEdge {
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

export default function ProjectTrail() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const fitViewFnRef = useRef<(() => void) | null>(null);

  // Layer and toolbar state
  const [selectedLayer, setSelectedLayer] = useState<LayerOption>('both');
  const [connectMode, setConnectMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Validation state
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [highlightIssues, setHighlightIssues] = useState(false);

  // Node modal state
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [editingNode, setEditingNode] = useState<TrailNode | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    node: TrailNode;
    x: number;
    y: number;
  } | null>(null);

  // Edge modal state
  const [editingEdge, setEditingEdge] = useState<TrailEdge | null>(null);
  const [edgeToDelete, setEdgeToDelete] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    edge: TrailEdge;
    x: number;
    y: number;
  } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);

  const { data: trailData, isLoading } = useQuery({
    queryKey: ['trail', projectId],
    queryFn: () => trailApi.get(projectId!).then(res => res.data),
  });

  // Node mutations
  const createNodeMutation = useMutation({
    mutationFn: (data: Partial<TrailNode>) => trailApi.createNode(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setIsCreatingNode(false);
      toast.success('Node created!');
    },
    onError: () => {
      toast.error('Failed to create node');
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrailNode> }) =>
      trailApi.updateNode(projectId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setEditingNode(null);
      toast.success('Node updated!');
    },
    onError: () => {
      toast.error('Failed to update node');
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => trailApi.deleteNode(projectId!, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setNodeToDelete(null);
      setSelectedNodeId(null);
      toast.success('Node deleted!');
    },
    onError: () => {
      toast.error('Failed to delete node');
    },
  });

  const updatePositionsMutation = useMutation({
    mutationFn: (nodes: { id: string; position_x: number; position_y: number }[]) => {
      console.log('Saving positions:', JSON.stringify(nodes));
      return trailApi.updatePositions(projectId!, nodes);
    },
    onSuccess: () => {
      console.log('Positions saved successfully');
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error || error?.response?.data?.errors || error.message;
      console.error('Position save failed:', errorMsg, error?.response?.data);
      toast.error(`Failed to save: ${JSON.stringify(errorMsg)}`);
    },
  });

  // Edge mutations
  const createEdgeMutation = useMutation({
    mutationFn: (data: Partial<TrailMapEdge>) => trailApi.createEdge(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setPendingConnection(null);
      toast.success('Edge created!');
    },
    onError: () => {
      toast.error('Failed to create edge');
      setPendingConnection(null);
    },
  });

  const updateEdgeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrailMapEdge> }) =>
      trailApi.updateEdge(projectId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setEditingEdge(null);
      toast.success('Edge updated!');
    },
    onError: () => {
      toast.error('Failed to update edge');
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: (edgeId: string) => trailApi.deleteEdge(projectId!, edgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setEdgeToDelete(null);
      setSelectedEdgeId(null);
      toast.success('Edge deleted!');
    },
    onError: () => {
      toast.error('Failed to delete edge');
    },
  });

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: () => trailApi.validate(projectId!),
    onSuccess: (response) => {
      // Transform backend response to frontend format
      const backendData = response.data as {
        valid: boolean;
        issues: {
          orphanNodes: Array<{ id: string; name: string }>;
          unreachableNodes: Array<{ id: string; name: string }>;
          missingEntryPoint: boolean;
          circularPaths: string[][];
        };
      };

      const transformedIssues: ValidationResult['issues'] = [];

      // Missing entry point
      if (backendData.issues.missingEntryPoint) {
        transformedIssues.push({
          type: 'warning',
          category: 'entry_point',
          issueType: 'entry_point',
          message: 'No entry point defined. Players need a starting node.',
        });
      }

      // Orphan nodes
      backendData.issues.orphanNodes.forEach((node) => {
        transformedIssues.push({
          type: 'warning',
          category: 'orphan_nodes',
          issueType: 'orphan',
          message: `"${node.name}" has no connections`,
          nodeId: node.id,
          nodeName: node.name,
        });
      });

      // Unreachable nodes
      backendData.issues.unreachableNodes.forEach((node) => {
        transformedIssues.push({
          type: 'error',
          category: 'unreachable_nodes',
          issueType: 'unreachable',
          message: `"${node.name}" cannot be reached from any entry point`,
          nodeId: node.id,
          nodeName: node.name,
        });
      });

      // Circular paths - convert IDs to human-readable names
      const allNodes = trailData?.nodes || [];
      const nodeNameMap = new Map(allNodes.map((n: TrailNode) => [n.id, n.name]));

      backendData.issues.circularPaths.forEach((path) => {
        const readablePath = path.map((id) => nodeNameMap.get(id) || 'Unknown');
        transformedIssues.push({
          type: 'warning',
          category: 'circular_paths',
          issueType: 'circular',
          message: `Circular path: ${readablePath.join(' → ')}`,
          nodeIds: path, // Store all node IDs in the circular path
          path,
        });
      });

      const allEdges = trailData?.edges || trailData?.connections || [];

      const result: ValidationResult = {
        isValid: backendData.valid,
        issues: transformedIssues,
        stats: {
          totalNodes: allNodes.length,
          totalEdges: allEdges.length,
          entryPoints: allNodes.filter((n: TrailNode) => n.node_type === 'entry_point').length,
          finales: allNodes.filter((n: TrailNode) => n.node_type === 'finale').length,
          orphanCount: backendData.issues.orphanNodes.length,
          unreachableCount: backendData.issues.unreachableNodes.length,
        },
      };

      setValidationResults(result);
      setShowValidationModal(true);
    },
    onError: () => {
      toast.error('Validation failed');
    },
  });

  // Node handlers
  const handleNodeClick = useCallback((node: TrailMapNode) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const handleNodeDoubleClick = useCallback((node: TrailMapNode) => {
    const trailNode = trailData?.nodes.find((n: TrailNode) => n.id === node.id);
    if (trailNode) {
      setEditingNode(trailNode);
    }
  }, [trailData]);

  const handleNodeContextMenu = useCallback((node: TrailMapNode, event: React.MouseEvent) => {
    const trailNode = trailData?.nodes.find((n: TrailNode) => n.id === node.id);
    if (trailNode) {
      setNodeContextMenu({
        node: trailNode,
        x: event.clientX,
        y: event.clientY,
      });
    }
  }, [trailData]);

  const handleNodePositionChange = useCallback((nodeId: string, x: number, y: number) => {
    updatePositionsMutation.mutate([{ id: nodeId, position_x: x, position_y: y }]);
  }, [updatePositionsMutation]);

  // Edge handlers
  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    // Open EdgeForm modal to configure the new edge
    setPendingConnection({ sourceId, targetId });
  }, []);

  const handleEdgeClick = useCallback((edge: TrailEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const handleEdgeContextMenu = useCallback((edge: TrailEdge, event: React.MouseEvent) => {
    setEdgeContextMenu({
      edge,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleEdgeReverse = useCallback((edge: TrailEdge) => {
    updateEdgeMutation.mutate({
      id: edge.id,
      data: {
        source_node_id: edge.target_node_id,
        target_node_id: edge.source_node_id,
      },
    });
  }, [updateEdgeMutation]);

  // Direct edge delete (for keyboard delete, no confirmation)
  const handleEdgeDeleteDirect = useCallback((edgeId: string) => {
    deleteEdgeMutation.mutate(edgeId);
  }, [deleteEdgeMutation]);

  // Stable callback for TrailMapCanvas fitView registration
  const handleFitViewReady = useCallback((fn: () => void) => {
    fitViewFnRef.current = fn;
  }, []);

  // Toolbar handlers
  const handleFitView = useCallback(() => {
    if (fitViewFnRef.current) {
      fitViewFnRef.current();
    }
  }, []);

  const handleValidate = useCallback(() => {
    validateMutation.mutate();
  }, [validateMutation]);

  const handleHighlightNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowValidationModal(false);
    // Optionally fit view to selected node
    handleFitView();
  }, [handleFitView]);

  // Sidebar handlers
  const handleSidebarEditNode = useCallback((node: TrailMapNode) => {
    const trailNode = trailData?.nodes.find((n: TrailNode) => n.id === node.id);
    if (trailNode) {
      setEditingNode(trailNode);
    }
  }, [trailData]);

  const handleSidebarDeleteNode = useCallback((nodeId: string) => {
    setNodeToDelete(nodeId);
  }, []);

  const handleSidebarEditEdge = useCallback((edge: CanvasEdge) => {
    const allEdges = trailData?.edges || trailData?.connections || [];
    const trailEdge = allEdges.find((e: TrailEdge) => e.id === edge.id);
    if (trailEdge) {
      setEditingEdge(trailEdge);
    }
  }, [trailData]);

  const handleSidebarDeleteEdge = useCallback((edgeId: string) => {
    setEdgeToDelete(edgeId);
  }, []);

  const addNode = () => {
    setIsCreatingNode(true);
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-arg-purple-500" />
      </div>
    );
  }

  // Prepare nodes and edges for TrailMapCanvas
  const nodes = trailData?.nodes || [];
  const edges = trailData?.edges || trailData?.connections || [];

  // Get selected node/edge objects for sidebar
  const selectedNode = selectedNodeId
    ? (nodes.find((n: TrailNode) => n.id === selectedNodeId) as TrailMapNode | undefined) || null
    : null;
  const selectedEdge = selectedEdgeId
    ? (edges.find((e: TrailEdge) => e.id === selectedEdgeId) as CanvasEdge | undefined) || null
    : null;

  // Calculate a smart default position for new nodes (offset from existing nodes)
  const getDefaultNodePosition = () => {
    if (nodes.length === 0) {
      return { x: 250, y: 100 };
    }
    // Find the rightmost node and place new node to its right
    const maxX = Math.max(...nodes.map((n: TrailNode) => n.position_x || 0));
    const avgY = nodes.reduce((sum: number, n: TrailNode) => sum + (n.position_y || 0), 0) / nodes.length;
    return { x: maxX + 250, y: avgY };
  };

  // Build highlighted nodes map and validation node IDs from validation results
  const { highlightedNodesMap, validationNodeIds } = useMemo(() => {
    const map = new Map<string, 'unreachable' | 'orphan' | 'circular'>();
    const nodeIds: string[] = [];

    if (validationResults && (highlightIssues || selectedLayer === 'validation')) {
      validationResults.issues.forEach((issue) => {
        if (issue.issueType === 'unreachable' || issue.issueType === 'orphan') {
          if (issue.nodeId) {
            map.set(issue.nodeId, issue.issueType);
            nodeIds.push(issue.nodeId);
          }
        } else if (issue.issueType === 'circular' && issue.nodeIds) {
          issue.nodeIds.forEach((id) => {
            // Don't overwrite more severe issues
            if (!map.has(id)) {
              map.set(id, 'circular');
            }
            if (!nodeIds.includes(id)) {
              nodeIds.push(id);
            }
          });
        }
      });
    }

    return { highlightedNodesMap: map, validationNodeIds: nodeIds };
  }, [validationResults, highlightIssues, selectedLayer]);

  // Check if any mutations are pending (for save indicator)
  const isSaving =
    createNodeMutation.isPending ||
    updateNodeMutation.isPending ||
    deleteNodeMutation.isPending ||
    updatePositionsMutation.isPending ||
    createEdgeMutation.isPending ||
    updateEdgeMutation.isPending ||
    deleteEdgeMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="page-header">Trail Map</h1>
          <LayerToggle
            selectedLayer={selectedLayer}
            onLayerChange={setSelectedLayer}
            hasValidationIssues={validationResults ? validationResults.issues.length > 0 : false}
          />
        </div>
        <div className="flex items-center gap-3">
          <TrailToolbar
            connectMode={connectMode}
            onConnectModeToggle={() => setConnectMode(!connectMode)}
            onFitView={handleFitView}
            onValidate={handleValidate}
            isSaving={isSaving}
            isValidating={validateMutation.isPending}
          />
          <button onClick={addNode} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add Node
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <Bars3BottomRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Canvas */}
        <div className="flex-1 card overflow-hidden">
          <ErrorBoundary
            FallbackComponent={CanvasErrorFallback}
            onReset={() => queryClient.invalidateQueries({ queryKey: ['trail', projectId] })}
          >
            <TrailMapCanvas
              projectId={projectId!}
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeContextMenu={handleNodeContextMenu}
              onNodePositionChange={handleNodePositionChange}
              onEdgeCreate={handleEdgeCreate}
              onEdgeClick={handleEdgeClick}
              onEdgeContextMenu={handleEdgeContextMenu}
              onEdgeDelete={handleEdgeDeleteDirect}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onFitViewReady={handleFitViewReady}
              layerFilter={selectedLayer}
              highlightedNodes={highlightedNodesMap}
              validationNodeIds={validationNodeIds}
            />
          </ErrorBoundary>
        </div>

        {/* Sidebar */}
        <TrailSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          nodes={nodes as TrailMapNode[]}
          edges={edges as CanvasEdge[]}
          onEditNode={handleSidebarEditNode}
          onDeleteNode={handleSidebarDeleteNode}
          onEditEdge={handleSidebarEditEdge}
          onDeleteEdge={handleSidebarDeleteEdge}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 text-sm text-gray-400 space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-medium text-gray-300">Nodes:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded" /> Entry
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-600 rounded" /> Waypoint
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded" /> Branch
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-500 rounded" /> Gate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-cyan-500 rounded" /> Merge
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-500 rounded" /> Secret
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-pink-500 rounded" /> Bonus
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded" /> Finale
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-700 rounded" /> Dead End
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-cyan-400 rounded" /> Hub
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium text-gray-300">Edges:</span>
          <span className="flex items-center gap-2">
            <span className="w-6 h-0.5 bg-gray-500" /> Auto
          </span>
          <span className="flex items-center gap-2">
            <span className="w-6 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #eab308 0, #eab308 4px, transparent 4px, transparent 6px)' }} /> Choice
          </span>
          <span className="flex items-center gap-2">
            <span className="w-6 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #a855f7 0, #a855f7 2px, transparent 2px, transparent 4px)' }} /> Puzzle
          </span>
          <span className="flex items-center gap-2">
            <span className="w-6 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #3b82f6 0, #3b82f6 6px, transparent 6px, transparent 9px)' }} /> Time
          </span>
          <span className="flex items-center gap-2">
            <span className="w-6 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #22c55e 0, #22c55e 4px, transparent 4px, transparent 6px, #22c55e 6px, #22c55e 7px, transparent 7px, transparent 9px)' }} /> Manual
          </span>
          <span className="flex items-center gap-2">
            <span className="w-6 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 2px, transparent 2px, transparent 4px, #f97316 4px, #f97316 6px, transparent 6px, transparent 10px)' }} /> Conditional
          </span>
        </div>
      </div>

      {/* Validation Results Modal */}
      <ValidationResultsModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        result={validationResults}
        onHighlightNode={handleHighlightNode}
        highlightIssues={highlightIssues}
        onToggleHighlight={setHighlightIssues}
      />

      {/* Create Node Modal */}
      <Modal
        isOpen={isCreatingNode}
        onClose={() => setIsCreatingNode(false)}
        title="Create Node"
        size="lg"
      >
        <NodeForm
          projectId={projectId!}
          onSave={(data) => createNodeMutation.mutate(data)}
          onCancel={() => setIsCreatingNode(false)}
          isLoading={createNodeMutation.isPending}
          defaultPosition={getDefaultNodePosition()}
        />
      </Modal>

      {/* Edit Node Modal */}
      {editingNode && (
        <Modal
          isOpen={true}
          onClose={() => setEditingNode(null)}
          title="Edit Node"
          size="lg"
        >
          <NodeForm
            node={editingNode}
            projectId={projectId!}
            onSave={(data) => updateNodeMutation.mutate({ id: editingNode.id, data })}
            onCancel={() => setEditingNode(null)}
            onDelete={() => setNodeToDelete(editingNode.id)}
            isLoading={updateNodeMutation.isPending}
          />
        </Modal>
      )}

      {/* Create Edge Modal */}
      {pendingConnection && (
        <Modal
          isOpen={true}
          onClose={() => setPendingConnection(null)}
          title="Create Edge"
          size="md"
        >
          <EdgeForm
            projectId={projectId!}
            sourceNodeId={pendingConnection.sourceId}
            targetNodeId={pendingConnection.targetId}
            onSave={(data) => createEdgeMutation.mutate(data)}
            onCancel={() => setPendingConnection(null)}
            isLoading={createEdgeMutation.isPending}
          />
        </Modal>
      )}

      {/* Edit Edge Modal */}
      {editingEdge && (
        <Modal
          isOpen={true}
          onClose={() => setEditingEdge(null)}
          title="Edit Edge"
          size="md"
        >
          <EdgeForm
            edge={editingEdge}
            projectId={projectId!}
            sourceNodeId={editingEdge.source_node_id}
            targetNodeId={editingEdge.target_node_id}
            onSave={(data) => updateEdgeMutation.mutate({ id: editingEdge.id, data })}
            onCancel={() => setEditingEdge(null)}
            onDelete={() => setEdgeToDelete(editingEdge.id)}
            isLoading={updateEdgeMutation.isPending}
          />
        </Modal>
      )}

      {/* Delete Node Confirmation */}
      {nodeToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setNodeToDelete(null)}
          onConfirm={() => deleteNodeMutation.mutate(nodeToDelete)}
          title="Delete Node"
          message="Are you sure you want to delete this node? This action cannot be undone and will also remove all connected edges."
          confirmText="Delete"
          confirmButtonClass="btn-danger"
          isLoading={deleteNodeMutation.isPending}
        />
      )}

      {/* Delete Edge Confirmation */}
      {edgeToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setEdgeToDelete(null)}
          onConfirm={() => deleteEdgeMutation.mutate(edgeToDelete)}
          title="Delete Edge"
          message="Are you sure you want to delete this edge? This action cannot be undone."
          confirmText="Delete"
          confirmButtonClass="btn-danger"
          isLoading={deleteEdgeMutation.isPending}
        />
      )}

      {/* Node Context Menu */}
      {nodeContextMenu && (
        <NodeContextMenu
          node={nodeContextMenu.node}
          position={{ x: nodeContextMenu.x, y: nodeContextMenu.y }}
          isOpen={true}
          onClose={() => setNodeContextMenu(null)}
          onEdit={() => {
            setEditingNode(nodeContextMenu.node);
            setNodeContextMenu(null);
          }}
          onDelete={() => {
            setNodeToDelete(nodeContextMenu.node.id);
            setNodeContextMenu(null);
          }}
          onToggleUnlock={() => {
            updateNodeMutation.mutate({
              id: nodeContextMenu.node.id,
              data: { is_unlocked: nodeContextMenu.node.is_unlocked === 1 ? 0 : 1 },
            });
            setNodeContextMenu(null);
          }}
          onViewContent={() => {
            toast('View content feature - to be implemented');
            setNodeContextMenu(null);
          }}
        />
      )}

      {/* Edge Context Menu */}
      {edgeContextMenu && (
        <EdgeContextMenu
          edge={edgeContextMenu.edge}
          position={{ x: edgeContextMenu.x, y: edgeContextMenu.y }}
          isOpen={true}
          onClose={() => setEdgeContextMenu(null)}
          onEdit={() => {
            setEditingEdge(edgeContextMenu.edge);
            setEdgeContextMenu(null);
          }}
          onDelete={() => {
            setEdgeToDelete(edgeContextMenu.edge.id);
            setEdgeContextMenu(null);
          }}
          onReverse={() => {
            handleEdgeReverse(edgeContextMenu.edge);
            setEdgeContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
