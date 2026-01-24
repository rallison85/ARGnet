import { useCallback, useEffect } from 'react';
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

interface TrailNode {
  id: string;
  name: string;
  node_type: string;
  description: string;
  position_x: number;
  position_y: number;
}

interface TrailConnection {
  id: string;
  from_node_id: string;
  to_node_id: string;
  connection_type: string;
}

export default function ProjectTrail() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: trailData, isLoading } = useQuery({
    queryKey: ['trail', projectId],
    queryFn: () => trailApi.get(projectId!).then(res => res.data),
  });

  const createNodeMutation = useMutation({
    mutationFn: (data: Partial<TrailNode>) => trailApi.createNode(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      toast.success('Node created!');
    },
  });

  const updatePositionsMutation = useMutation({
    mutationFn: (nodes: { id: string; position_x: number; position_y: number }[]) =>
      trailApi.updatePositions(projectId!, nodes),
  });

  const createConnectionMutation = useMutation({
    mutationFn: (data: { from_node_id: string; to_node_id: string }) =>
      trailApi.createConnection(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trail', projectId] });
      toast.success('Connection created!');
    },
  });

  useEffect(() => {
    if (trailData) {
      const flowNodes: Node[] = trailData.nodes.map((node: TrailNode) => ({
        id: node.id,
        position: { x: node.position_x, y: node.position_y },
        data: { label: node.name, type: node.node_type },
        type: 'default',
        style: {
          background: node.node_type === 'entry_point' ? '#22c55e' :
                      node.node_type === 'finale' ? '#ef4444' :
                      node.node_type === 'secret' ? '#a855f7' : '#374151',
          color: 'white',
          border: '1px solid #4b5563',
          borderRadius: '8px',
          padding: '10px 15px',
        },
      }));

      const flowEdges: Edge[] = trailData.connections.map((conn: TrailConnection) => ({
        id: conn.id,
        source: conn.from_node_id,
        target: conn.to_node_id,
        animated: conn.connection_type === 'secret',
        style: {
          stroke: conn.connection_type === 'secret' ? '#a855f7' :
                  conn.connection_type === 'optional' ? '#eab308' : '#6b7280',
        },
      }));

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
    const name = prompt('Enter node name:');
    if (name) {
      createNodeMutation.mutate({
        name,
        node_type: 'waypoint',
        position_x: Math.random() * 400 + 100,
        position_y: Math.random() * 400 + 100,
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
    </div>
  );
}
