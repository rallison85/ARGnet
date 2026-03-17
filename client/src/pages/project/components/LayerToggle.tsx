import { cn } from '../../../lib/utils';

export type LayerOption = 'narrative' | 'physical' | 'both' | 'validation';

interface LayerToggleProps {
  selectedLayer: LayerOption;
  onLayerChange: (layer: LayerOption) => void;
  hasValidationIssues?: boolean;
}

const layers: { value: LayerOption; label: string }[] = [
  { value: 'both', label: 'All' },
  { value: 'narrative', label: 'Narrative' },
  { value: 'physical', label: 'Physical' },
  { value: 'validation', label: 'Validation' },
];

export default function LayerToggle({ selectedLayer, onLayerChange, hasValidationIssues }: LayerToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-gray-800 p-1">
      {layers.map((layer) => (
        <button
          key={layer.value}
          onClick={() => onLayerChange(layer.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 relative',
            selectedLayer === layer.value
              ? layer.value === 'validation'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-arg-purple-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          {layer.label}
          {layer.value === 'validation' && hasValidationIssues && selectedLayer !== 'validation' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      ))}
    </div>
  );
}
