import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trailApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import Modal from './components/Modal';
import ConfirmDialog from './components/ConfirmDialog';
import NodeForm from './components/NodeForm';
import NodeContextMenu from './components/NodeContextMenu';
import EdgeForm, { TrailMapEdge } from './components/EdgeForm';
import EdgeContextMenu from './components/EdgeContextMenu';
import TrailMapCanvas, { TrailMapNode } from './TrailMapCanvas';
import TrailMapToolbar from './components/TrailMapToolbar';
import TrailMapSidebar from './components/TrailMapSidebar';
import ValidationModal from './components/ValidationModal';

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

type LayerFilter = 'narrative' | 'physical' | 'all';

const layerTabs: { value: LayerFilter; label: string }[] = [
  { value: 'all', label: 'Both' },
  { value: 'narrative', label: 'Narrative' },
  { value: 'physical', label: 'Physical' },
];

export default function ProjectTrail() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  // Layer & view state
  const [activeLayer, setActiveLayer] = useState<LayerFilter>('all');
  const [connectMode, setConnectMode] = useState(false);

  // Save indicator
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Validation state
  const [showValidation, setShowValidation] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // FitView ref
  const fitViewFnRef = useRef<(() => void) | null>(null);

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
    queryKey: ['trail', projectId, activeLayer],
    queryFn: () => trailApi.get(projectId!, activeLayer !== 'all' ? activeLayer : undefined).then(res => res.data),
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
    mutationFn: (nodes: { id: string; position_x: number; position_y: number }[]) =>
      trailApi.updatePositions(projectId!, nodes),
    onSuccess: () => {
      setLastSaved(new Date());
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

  // Validation handler
  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setShowValidation(true);
    try {
      const res = await trailApi.validate(projectId!);
      setValidationResults(res.data.issues || []);
    } catch {
      toast.error('Failed to validate trail');
      setValidationResults([]);
    } finally {
      setIsValidating(false);
    }
  }, [projectId]);

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

  const handleEdgeDeleteDirect = useCallback((edgeId: string) => {
    deleteEdgeMutation.mutate(edgeId);
  }, [deleteEdgeMutation]);

  // FitView callback from canvas
  const handleFitViewReady = useCallback((fn: () => void) => {
    fitViewFnRef.current = fn;
  }, []);

  // Sidebar handlers
  const handleSidebarEdit = useCallback((node: TrailNode) => {
    setEditingNode(node);
  }, []);

  const handleSidebarDelete = useCallback((nodeId: string) => {
    setNodeToDelete(nodeId);
  }, []);

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
  const selectedNode = selectedNodeId
    ? nodes.find((n: TrailNode) => n.id === selectedNodeId) || null
    : null;

  // Calculate a smart default position for new nodes
  const getDefaultNodePosition = () => {
    if (nodes.length === 0) {
      return { x: 250, y: 100 };
    }
    const maxX = Math.max(...nodes.map((n: TrailNode) => n.position_x || 0));
    const avgY = nodes.reduce((sum: number, n: TrailNode) => sum + (n.position_y || 0), 0) / nodes.length;
    return { x: maxX + 250, y: avgY };
  };

  return (
    <div className="space-y-3">
      {/* Header with layer toggle */}
      <div className="flex items-center justify-between">
        <h1 className="page-header">Trail Map</h1>
        <div className="flex items-center gap-1 bg-gray-800/50 border border-gray-700 rounded-lg p-1">
          {layerTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveLayer(tab.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                activeLayer === tab.value
                  ? 'bg-arg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <TrailMapToolbar
        onAddNode={() => setIsCreatingNode(true)}
        onFitView={() => fitViewFnRef.current?.()}
        onValidate={handleValidate}
        connectMode={connectMode}
        onConnectModeToggle={() => setConnectMode((m) => !m)}
        isSaving={updatePositionsMutation.isPending}
        lastSaved={lastSaved}
      />

      {/* Main area: Canvas + Sidebar */}
      <div className="flex gap-3 h-[calc(100vh-18rem)]">
        <div className="flex-1 card">
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
            onFitView={handleFitViewReady}
            layer={activeLayer !== 'all' ? activeLayer : undefined}
          />
        </div>

        <TrailMapSidebar
          selectedNode={selectedNode}
          nodes={nodes}
          edges={edges}
          onEdit={handleSidebarEdit}
          onDelete={handleSidebarDelete}
        />
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        issues={validationResults}
        isValidating={isValidating}
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
