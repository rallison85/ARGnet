import { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';

export type TrailMapEdgeType =
  | 'automatic'
  | 'choice'
  | 'puzzle'
  | 'time'
  | 'manual'
  | 'conditional';

export interface CustomEdgeData {
  edge_type: TrailMapEdgeType;
  is_bidirectional: number;
  label: string | null;
  is_active: number;
}

// Line style patterns for each edge type
const EDGE_DASH_PATTERNS: Record<TrailMapEdgeType, string | undefined> = {
  automatic: undefined,           // solid
  choice: '8,4',                  // dashed
  puzzle: '2,4',                  // dotted
  time: '12,6',                   // long dash
  manual: '8,4,2,4',              // dash-dot
  conditional: '4,2,4,8',         // double dash
};

// Colors for each edge type
const EDGE_COLORS: Record<TrailMapEdgeType, string> = {
  automatic: '#6b7280',   // gray
  choice: '#eab308',      // yellow
  puzzle: '#a855f7',      // purple
  time: '#3b82f6',        // blue
  manual: '#22c55e',      // green
  conditional: '#f97316', // orange
};

const CustomTrailEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CustomEdgeData>) => {
  const edgeType = data?.edge_type || 'automatic';
  const isBidirectional = data?.is_bidirectional === 1;
  const label = data?.label;
  const isActive = data?.is_active !== 0;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = EDGE_COLORS[edgeType];
  const strokeDasharray = EDGE_DASH_PATTERNS[edgeType];

  // Selected or inactive styling
  const opacity = isActive ? 1 : 0.4;
  const strokeWidth = selected ? 3 : 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          opacity,
        }}
        markerEnd={markerEnd}
        markerStart={isBidirectional ? markerEnd : undefined}
      />

      {/* Selection highlight */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeOpacity={0.2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute pointer-events-auto"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <div
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: '#1f2937',
                color: '#e5e7eb',
                border: `1px solid ${strokeColor}`,
                opacity,
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

CustomTrailEdge.displayName = 'CustomTrailEdge';

export default CustomTrailEdge;
