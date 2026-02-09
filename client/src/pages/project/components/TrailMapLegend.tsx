export default function TrailMapLegend() {
  return (
    <div className="text-sm text-gray-400 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-gray-300 text-xs uppercase tracking-wider">Nodes</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-green-500 rounded" /> Entry
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-gray-600 rounded" /> Waypoint
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded" /> Branch
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-yellow-500 rounded" /> Gate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-cyan-500 rounded" /> Merge
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-purple-500 rounded" /> Secret
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-pink-500 rounded" /> Bonus
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-red-500 rounded" /> Finale
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-gray-700 rounded" /> Dead End
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-cyan-400 rounded" /> Hub
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-gray-300 text-xs uppercase tracking-wider">Edges</span>
        <span className="flex items-center gap-2">
          <span className="w-5 h-0.5 bg-gray-500" /> Auto
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #eab308 0, #eab308 4px, transparent 4px, transparent 6px)' }} /> Choice
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #a855f7 0, #a855f7 2px, transparent 2px, transparent 4px)' }} /> Puzzle
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #3b82f6 0, #3b82f6 6px, transparent 6px, transparent 9px)' }} /> Time
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #22c55e 0, #22c55e 4px, transparent 4px, transparent 6px, #22c55e 6px, #22c55e 7px, transparent 7px, transparent 9px)' }} /> Manual
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 2px, transparent 2px, transparent 4px, #f97316 4px, #f97316 6px, transparent 6px, transparent 10px)' }} /> Cond
        </span>
      </div>
    </div>
  );
}
