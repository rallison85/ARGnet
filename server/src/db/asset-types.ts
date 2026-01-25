/**
 * TypeScript types for enhanced assets
 */

export type AssetType =
  | 'image_prop'
  | 'image_digital'
  | 'image_reference'
  | 'video_diegetic'
  | 'video_production'
  | 'audio_diegetic'
  | 'audio_production'
  | 'document_diegetic'
  | 'document_production'
  | 'model_3d'
  | 'code_technical'
  | 'print_ready'
  // Legacy types
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'code'
  | '3d_model'
  | 'font'
  | 'archive'
  | 'other';

export type AssetStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

// Dimension types for different asset types
export interface ImageDimensions {
  width: number;
  height: number;
}

export interface VideoDimensions {
  width: number;
  height: number;
  duration_seconds: number;
}

export interface AudioDimensions {
  duration_seconds: number;
}

export type AssetDimensions = ImageDimensions | VideoDimensions | AudioDimensions;

export interface Asset {
  id: string;
  project_id: string;
  name: string;
  asset_type: AssetType;

  // File info
  file_path: string;
  file_size: number | null; // Legacy field
  file_size_bytes: number | null; // New precise field
  mime_type: string | null;

  // Metadata
  description: string | null;
  tags: string | null; // JSON array
  category: string | null;

  // Versioning
  version: number; // Legacy field
  version_number: string | null; // New field: "1.0", "2.1", etc.
  parent_asset_id: string | null;

  // Dimensions
  dimensions: string | null; // JSON object

  // Usage
  usage_rights: string | null;
  production_notes: string | null;
  is_diegetic: number; // SQLite boolean (0 or 1)
  used_in: string | null; // JSON array

  // Status and workflow
  status: AssetStatus;
  created_by_user_id: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null; // ISO datetime

  created_at: string;
  updated_at: string;
}

// Parsed version with JSON fields as objects/arrays
export interface AssetParsed extends Omit<Asset, 'tags' | 'dimensions' | 'used_in'> {
  tags: string[] | null;
  dimensions: AssetDimensions | null;
  used_in: Array<{
    entity_type: string;
    entity_id: string;
    entity_name?: string;
  }> | null;
}

// Helper type for creating assets (without id and timestamps)
export type CreateAsset = Omit<Asset, 'id' | 'created_at' | 'updated_at'>;

// Helper type for updating assets
export type UpdateAsset = Partial<Omit<Asset, 'id' | 'project_id' | 'created_at'>>;

// Extended type with related data for display
export interface AssetWithRelations extends AssetParsed {
  created_by_username?: string;
  created_by_name?: string;
  approved_by_username?: string;
  approved_by_name?: string;
  parent_asset_name?: string;
  child_assets?: Array<{
    id: string;
    name: string;
    version_number: string | null;
    status: AssetStatus;
  }>;
  file_size_formatted?: string; // e.g., "2.5 MB"
  duration_formatted?: string; // e.g., "3:45" for audio/video
}

// Helper functions for working with asset data
export const AssetHelpers = {
  /**
   * Parse JSON fields from database asset record
   */
  parse(asset: Asset): AssetParsed {
    return {
      ...asset,
      tags: asset.tags ? JSON.parse(asset.tags) : null,
      dimensions: asset.dimensions ? JSON.parse(asset.dimensions) : null,
      used_in: asset.used_in ? JSON.parse(asset.used_in) : null,
    };
  },

  /**
   * Stringify parsed asset for database storage
   */
  stringify(asset: Partial<AssetParsed>): Partial<Asset> {
    const result: Partial<Asset> = { ...asset } as any;

    if (asset.tags !== undefined) {
      result.tags = asset.tags ? JSON.stringify(asset.tags) : null;
    }
    if (asset.dimensions !== undefined) {
      result.dimensions = asset.dimensions ? JSON.stringify(asset.dimensions) : null;
    }
    if (asset.used_in !== undefined) {
      result.used_in = asset.used_in ? JSON.stringify(asset.used_in) : null;
    }

    return result;
  },

  /**
   * Check if asset is diegetic (in-world)
   */
  isDiegetic(asset: Asset | AssetParsed): boolean {
    return asset.is_diegetic === 1;
  },

  /**
   * Check if asset is approved
   */
  isApproved(asset: Asset | AssetParsed): boolean {
    return asset.status === 'approved' || asset.status === 'published';
  },

  /**
   * Check if asset is a legacy type
   */
  isLegacyType(asset: Asset | AssetParsed): boolean {
    const legacyTypes: AssetType[] = [
      'image', 'video', 'audio', 'document', 'code', '3d_model', 'font', 'archive', 'other'
    ];
    return legacyTypes.includes(asset.asset_type);
  },

  /**
   * Get the base type from a specific type (e.g., 'image_prop' -> 'image')
   */
  getBaseType(assetType: AssetType): string {
    if (assetType.startsWith('image')) return 'image';
    if (assetType.startsWith('video')) return 'video';
    if (assetType.startsWith('audio')) return 'audio';
    if (assetType.startsWith('document')) return 'document';
    if (assetType === 'model_3d' || assetType === '3d_model') return '3d_model';
    if (assetType === 'code_technical') return 'code';
    return assetType;
  },

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number | null): string {
    if (bytes === null) return 'Unknown';
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  },

  /**
   * Format duration in MM:SS or HH:MM:SS format
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Get duration from dimensions
   */
  getDuration(asset: AssetParsed): number | null {
    if (!asset.dimensions) return null;

    if ('duration_seconds' in asset.dimensions) {
      return asset.dimensions.duration_seconds;
    }

    return null;
  },

  /**
   * Get dimensions as string
   */
  getDimensionsString(asset: AssetParsed): string | null {
    if (!asset.dimensions) return null;

    if ('width' in asset.dimensions && 'height' in asset.dimensions) {
      const dims = asset.dimensions as ImageDimensions | VideoDimensions;
      let result = `${dims.width}×${dims.height}`;

      if ('duration_seconds' in dims) {
        result += ` (${this.formatDuration(dims.duration_seconds)})`;
      }

      return result;
    }

    if ('duration_seconds' in asset.dimensions) {
      return this.formatDuration(asset.dimensions.duration_seconds);
    }

    return null;
  },

  /**
   * Check if asset needs approval
   */
  needsApproval(asset: Asset | AssetParsed): boolean {
    return asset.status === 'review';
  },

  /**
   * Get the current version from version_number or fall back to version
   */
  getCurrentVersion(asset: Asset | AssetParsed): string {
    return asset.version_number || `${asset.version}.0`;
  },

  /**
   * Parse version number into major and minor components
   */
  parseVersion(versionNumber: string): { major: number; minor: number } | null {
    const match = versionNumber.match(/^(\d+)\.(\d+)$/);
    if (!match) return null;

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
    };
  },

  /**
   * Increment version number
   */
  incrementVersion(currentVersion: string, type: 'major' | 'minor' = 'minor'): string {
    const parsed = this.parseVersion(currentVersion);
    if (!parsed) return '1.0';

    if (type === 'major') {
      return `${parsed.major + 1}.0`;
    }
    return `${parsed.major}.${parsed.minor + 1}`;
  },

  /**
   * Sort assets by name
   */
  sortByName(assets: (Asset | AssetParsed)[]): typeof assets {
    return [...assets].sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Sort assets by creation date (most recent first)
   */
  sortByDate(assets: (Asset | AssetParsed)[]): typeof assets {
    return [...assets].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  /**
   * Sort assets by file size (largest first)
   */
  sortBySize(assets: (Asset | AssetParsed)[]): typeof assets {
    return [...assets].sort((a, b) => {
      const aSize = a.file_size_bytes || a.file_size || 0;
      const bSize = b.file_size_bytes || b.file_size || 0;
      return bSize - aSize;
    });
  },

  /**
   * Filter assets by type
   */
  filterByType(
    assets: (Asset | AssetParsed)[],
    type: AssetType | AssetType[]
  ): typeof assets {
    const types = Array.isArray(type) ? type : [type];
    return assets.filter(a => types.includes(a.asset_type));
  },

  /**
   * Filter assets by base type
   */
  filterByBaseType(
    assets: (Asset | AssetParsed)[],
    baseType: string
  ): typeof assets {
    return assets.filter(a => this.getBaseType(a.asset_type) === baseType);
  },

  /**
   * Filter assets by status
   */
  filterByStatus(
    assets: (Asset | AssetParsed)[],
    status: AssetStatus | AssetStatus[]
  ): typeof assets {
    const statuses = Array.isArray(status) ? status : [status];
    return assets.filter(a => statuses.includes(a.status));
  },

  /**
   * Filter diegetic assets
   */
  filterDiegetic(assets: (Asset | AssetParsed)[]): typeof assets {
    return assets.filter(a => this.isDiegetic(a));
  },

  /**
   * Filter production assets (non-diegetic)
   */
  filterProduction(assets: (Asset | AssetParsed)[]): typeof assets {
    return assets.filter(a => !this.isDiegetic(a));
  },

  /**
   * Filter assets by tag
   */
  filterByTag(assets: AssetParsed[], tag: string): AssetParsed[] {
    return assets.filter(a => a.tags && a.tags.includes(tag));
  },

  /**
   * Get all unique tags from assets
   */
  getAllTags(assets: AssetParsed[]): string[] {
    const tagSet = new Set<string>();
    assets.forEach(asset => {
      if (asset.tags) {
        asset.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  },

  /**
   * Get all unique categories from assets
   */
  getAllCategories(assets: (Asset | AssetParsed)[]): string[] {
    const categories = new Set<string>();
    assets.forEach(asset => {
      if (asset.category) {
        categories.add(asset.category);
      }
    });
    return Array.from(categories).sort();
  },

  /**
   * Check if asset has a parent (is a version of another asset)
   */
  hasParent(asset: Asset | AssetParsed): boolean {
    return asset.parent_asset_id !== null;
  },

  /**
   * Get assets by creator
   */
  getByCreator(
    assets: (Asset | AssetParsed)[],
    userId: string
  ): typeof assets {
    return assets.filter(a => a.created_by_user_id === userId);
  },

  /**
   * Get recently uploaded assets
   */
  getRecent(
    assets: (Asset | AssetParsed)[],
    days: number = 7
  ): typeof assets {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return assets.filter(a => {
      return new Date(a.created_at) > cutoff;
    });
  },

  /**
   * Calculate total size of assets
   */
  getTotalSize(assets: (Asset | AssetParsed)[]): number {
    return assets.reduce((sum, asset) => {
      const size = asset.file_size_bytes || asset.file_size || 0;
      return sum + size;
    }, 0);
  }
};
