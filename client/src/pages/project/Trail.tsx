import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { trailApi } from '../../lib/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Modal from './components/Modal';
import ConfirmDialog from './components/ConfirmDialog';
import NodeForm from './components/NodeForm';
import NodeContextMenu from './components/NodeContextMenu';

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

interface TrailConnection {
  id: string;
  from_node_id?: string; // Legacy field
  to_node_id?: string; // Legacy field
  source_node_id: string; // New field
  target_node_id: string; // New field
  connection_type?: string; // Legacy field
  edge_type: string; // New field
}

export default function ProjectTrail() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Modal state
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [editingNode, setEditingNode] = useState<TrailNode | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    node: TrailNode;
    x: number;
    y: number;
  } | null>(null);

  const { data: trailData, isLoading } = useQuery({
    queryKey: ['trail', projectId],
    queryFn: () => trailApi.get(projectId!).then(res => res.data),
  });

  const createNodeMutation = useMutation({
    mutationFn: (data: Partial<TrailNode>) => trailApi.createNode(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setIsCreatingNode(false);
      toast.success('Node created!');
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
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => trailApi.deleteNode(projectId!, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      setNodeToDelete(null);
      toast.success('Node deleted!');
    },
  });

  const updatePositionsMutation = useMutation({
    mutationFn: (nodes: { id: string; position_x: number; position_y: number }[]) =>
      trailApi.updatePositions(projectId!, nodes),
  });

  const createConnectionMutation = useMutation({
    mutationFn: (data: { from_node_id: string; to_node_id: string; source_node_id?: string; target_node_id?: string }) =>
      trailApi.createConnection(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      toast.success('Connection created!');
    },
  });

  useEffect(() => {
    if (trailData) {
      const flowNodes: Node[] = trailData.nodes.map((node: TrailNode) => {
        // Determine colors based on node type
        let bgColor = '#374151'; // default gray for waypoint
        let borderColor = '#4b5563'; // default border

        if (node.node_type === 'entry_point') {
          bgColor = '#22c55e'; // green
          borderColor = '#16a34a'; // darker green
        } else if (node.node_type === 'finale') {
          bgColor = '#ef4444'; // red
          borderColor = '#dc2626'; // darker red
        } else if (node.node_type === 'secret') {
          bgColor = '#a855f7'; // purple
          borderColor = '#9333ea'; // darker purple
        }

        return {
          id: node.id,
          position: { x: node.position_x, y: node.position_y },
          data: { label: node.name, type: node.node_type },
          type: 'default',
          style: {
            background: bgColor,
            backgroundColor: bgColor,
            color: '#ffffff',
            border: `2px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '10px 15px',
            minWidth: '150px',
            textAlign: 'center' as const,
          },
        };
      });

      // Support both old 'connections' and new 'edges' format
      const connections = trailData.edges || trailData.connections || [];
      const flowEdges: Edge[] = connections.map((conn: TrailConnection) => {
        // Support both old and new field names
        const sourceId = conn.source_node_id || conn.from_node_id;
        const targetId = conn.target_node_id || conn.to_node_id;
        const edgeType = conn.edge_type || conn.connection_type;

        return {
          id: conn.id,
          source: sourceId,
          target: targetId,
          animated: edgeType === 'secret',
          style: {
            stroke: edgeType === 'secret' ? '#a855f7' :
                    edgeType === 'optional' ? '#eab308' : '#6b7280',
          },
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [trailData, setNodes, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      createConnectionMutation.mutate({
        from_node_id: connection.source,
        to_node_id: connection.target,
      });
      setEdges((eds) => addEdge({ ...connection, animated: false }, eds));
    }
  }, [createConnectionMutation, setEdges]);

  const onNodesChangeHandler = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes);

    const positionChanges = changes.filter(
      (change): change is { type: 'position'; id: string; position?: { x: number; y: number }; dragging?: boolean } =>
        change.type === 'position' && !change.dragging && !!change.position
    );

    if (positionChanges.length > 0) {
      updatePositionsMutation.mutate(
        positionChanges.map((change) => ({
          id: change.id,
          position_x: change.position!.x,
          position_y: change.position!.y,
        }))
      );
    }
  }, [onNodesChange, updatePositionsMutation]);

  const addNode = () => {
    setIsCreatingNode(true);
  };

  const handleNodeDoubleClick = (_event: React.MouseEvent, node: Node) => {
    const trailNode = trailData?.nodes.find((n: TrailNode) => n.id === node.id);
    if (trailNode) {
      setEditingNode(trailNode);
    }
  };

  const handleNodeContextMenu = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const trailNode = trailData?.nodes.find((n: TrailNode) => n.id === node.id);
    if (trailNode) {
      setContextMenu({
        node: trailNode,
        x: event.clientX,
        y: event.clientY,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-arg-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Trail Map</h1>
        <button onClick={addNode} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Node
        </button>
      </div>

      <div className="card h-[calc(100vh-16rem)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeHandler}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          fitView
        >
          <Background color="#374151" gap={20} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <div className="flex gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded" /> Entry Point
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-gray-600 rounded" /> Waypoint
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-arg-purple-500 rounded" /> Secret
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded" /> Finale
        </span>
      </div>

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
          defaultPosition={{ x: 250, y: 250 }}
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

      {/* Delete Confirmation */}
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

      {/* Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          node={contextMenu.node}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          isOpen={true}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            setEditingNode(contextMenu.node);
            setContextMenu(null);
          }}
          onDelete={() => {
            setNodeToDelete(contextMenu.node.id);
            setContextMenu(null);
          }}
          onToggleUnlock={() => {
            updateNodeMutation.mutate({
              id: contextMenu.node.id,
              data: { is_unlocked: contextMenu.node.is_unlocked === 1 ? 0 : 1 },
            });
            setContextMenu(null);
          }}
          onViewContent={() => {
            toast('View content feature - to be implemented');
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
