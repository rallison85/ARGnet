import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const storedData = localStorage.getItem('arg-studio-auth');
  if (storedData) {
    try {
      const { state } = JSON.parse(storedData);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {
      // Invalid stored data
    }
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on unauthorized
      localStorage.removeItem('arg-studio-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const projectApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: unknown) => api.post('/projects', data),
  update: (id: string, data: unknown) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getMembers: (id: string) => api.get(`/projects/${id}/members`),
  addMember: (id: string, data: unknown) => api.post(`/projects/${id}/members`, data),
  updateMember: (projectId: string, memberId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/members/${memberId}`, data),
  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}`),
};

export const storyApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/stories`),
  getTree: (projectId: string) => api.get(`/projects/${projectId}/stories/tree`),
  get: (projectId: string, beatId: string) => api.get(`/projects/${projectId}/stories/${beatId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/stories`, data),
  update: (projectId: string, beatId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/stories/${beatId}`, data),
  delete: (projectId: string, beatId: string) => api.delete(`/projects/${projectId}/stories/${beatId}`),
  reorder: (projectId: string, beats: { id: string; sequence_order: number }[]) =>
    api.post(`/projects/${projectId}/stories/reorder`, { beats }),
};

export const characterApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/characters`),
  get: (projectId: string, characterId: string) =>
    api.get(`/projects/${projectId}/characters/${characterId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/characters`, data),
  update: (projectId: string, characterId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/characters/${characterId}`, data),
  delete: (projectId: string, characterId: string) =>
    api.delete(`/projects/${projectId}/characters/${characterId}`),
  addRelationship: (projectId: string, characterId: string, data: unknown) =>
    api.post(`/projects/${projectId}/characters/${characterId}/relationships`, data),
  removeRelationship: (projectId: string, characterId: string, relationshipId: string) =>
    api.delete(`/projects/${projectId}/characters/${characterId}/relationships/${relationshipId}`),
};

export const puzzleApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/puzzles`, { params }),
  get: (projectId: string, puzzleId: string) => api.get(`/projects/${projectId}/puzzles/${puzzleId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/puzzles`, data),
  update: (projectId: string, puzzleId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/puzzles/${puzzleId}`, data),
  delete: (projectId: string, puzzleId: string) =>
    api.delete(`/projects/${projectId}/puzzles/${puzzleId}`),
  getClues: (projectId: string, puzzleId: string) =>
    api.get(`/projects/${projectId}/puzzles/${puzzleId}/clues`),
  addClue: (projectId: string, puzzleId: string, data: unknown) =>
    api.post(`/projects/${projectId}/puzzles/${puzzleId}/clues`, data),
  updateClue: (projectId: string, puzzleId: string, clueId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/puzzles/${puzzleId}/clues/${clueId}`, data),
  deleteClue: (projectId: string, puzzleId: string, clueId: string) =>
    api.delete(`/projects/${projectId}/puzzles/${puzzleId}/clues/${clueId}`),
  recordTest: (projectId: string, puzzleId: string, data: unknown) =>
    api.post(`/projects/${projectId}/puzzles/${puzzleId}/test`, data),
};

export const trailApi = {
  get: (projectId: string, layer?: string) =>
    api.get(`/projects/${projectId}/trails`, { params: layer ? { layer } : undefined }),
  validate: (projectId: string) => api.get(`/projects/${projectId}/trails/validate`),
  createNode: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/trails/nodes`, data),
  updateNode: (projectId: string, nodeId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/trails/nodes/${nodeId}`, data),
  deleteNode: (projectId: string, nodeId: string) =>
    api.delete(`/projects/${projectId}/trails/nodes/${nodeId}`),
  updatePositions: (projectId: string, nodes: { id: string; position_x: number; position_y: number }[]) =>
    api.patch(`/projects/${projectId}/trails/nodes/positions`, { nodes }),
  createConnection: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/trails/connections`, data),
  updateConnection: (projectId: string, connectionId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/trails/connections/${connectionId}`, data),
  deleteConnection: (projectId: string, connectionId: string) =>
    api.delete(`/projects/${projectId}/trails/connections/${connectionId}`),
  // Edge CRUD methods
  createEdge: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/trails/edges`, data),
  updateEdge: (projectId: string, edgeId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/trails/edges/${edgeId}`, data),
  deleteEdge: (projectId: string, edgeId: string) =>
    api.delete(`/projects/${projectId}/trails/edges/${edgeId}`),
};

export const eventApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/events`, { params }),
  get: (projectId: string, eventId: string) => api.get(`/projects/${projectId}/events/${eventId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/events`, data),
  update: (projectId: string, eventId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/events/${eventId}`, data),
  delete: (projectId: string, eventId: string) => api.delete(`/projects/${projectId}/events/${eventId}`),
  addStaff: (projectId: string, eventId: string, data: unknown) =>
    api.post(`/projects/${projectId}/events/${eventId}/staff`, data),
  updateStaff: (projectId: string, eventId: string, staffId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/events/${eventId}/staff/${staffId}`, data),
  removeStaff: (projectId: string, eventId: string, staffId: string) =>
    api.delete(`/projects/${projectId}/events/${eventId}/staff/${staffId}`),
  confirmAttendance: (projectId: string, eventId: string) =>
    api.post(`/projects/${projectId}/events/${eventId}/confirm`),
};

export const assetApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/assets`, { params }),
  get: (projectId: string, assetId: string) => api.get(`/projects/${projectId}/assets/${assetId}`),
  upload: (projectId: string, formData: FormData) =>
    api.post(`/projects/${projectId}/assets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (projectId: string, assetId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/assets/${assetId}`, data),
  uploadVersion: (projectId: string, assetId: string, formData: FormData) =>
    api.post(`/projects/${projectId}/assets/${assetId}/version`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (projectId: string, assetId: string) => api.delete(`/projects/${projectId}/assets/${assetId}`),
};

export const taskApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/tasks`, { params }),
  getMine: (projectId: string) => api.get(`/projects/${projectId}/tasks/mine`),
  getBoard: (projectId: string) => api.get(`/projects/${projectId}/tasks/board`),
  get: (projectId: string, taskId: string) => api.get(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/tasks`, data),
  update: (projectId: string, taskId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/tasks/${taskId}`, data),
  bulkUpdateStatus: (projectId: string, tasks: { id: string; status: string }[]) =>
    api.patch(`/projects/${projectId}/tasks/bulk/status`, { tasks }),
  delete: (projectId: string, taskId: string) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
};

export const loreApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/lore`, { params }),
  getTree: (projectId: string) => api.get(`/projects/${projectId}/lore/tree`),
  get: (projectId: string, entryId: string) => api.get(`/projects/${projectId}/lore/${entryId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/lore`, data),
  update: (projectId: string, entryId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/lore/${entryId}`, data),
  delete: (projectId: string, entryId: string) => api.delete(`/projects/${projectId}/lore/${entryId}`),
};

export const timelineApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/timeline`, { params }),
  get: (projectId: string, eventId: string) => api.get(`/projects/${projectId}/timeline/${eventId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/timeline`, data),
  update: (projectId: string, eventId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/timeline/${eventId}`, data),
  delete: (projectId: string, eventId: string) =>
    api.delete(`/projects/${projectId}/timeline/${eventId}`),
};

export const locationApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/locations`, { params }),
  get: (projectId: string, locationId: string) =>
    api.get(`/projects/${projectId}/locations/${locationId}`),
  create: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/locations`, data),
  update: (projectId: string, locationId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/locations/${locationId}`, data),
  delete: (projectId: string, locationId: string) =>
    api.delete(`/projects/${projectId}/locations/${locationId}`),
};

export const digitalPropertyApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/digital-properties`, { params }),
  get: (projectId: string, propertyId: string) =>
    api.get(`/projects/${projectId}/digital-properties/${propertyId}`),
  create: (projectId: string, data: unknown) =>
    api.post(`/projects/${projectId}/digital-properties`, data),
  update: (projectId: string, propertyId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/digital-properties/${propertyId}`, data),
  delete: (projectId: string, propertyId: string) =>
    api.delete(`/projects/${projectId}/digital-properties/${propertyId}`),
};

export const commentApi = {
  list: (projectId: string, entityType: string, entityId: string) =>
    api.get(`/projects/${projectId}/comments/${entityType}/${entityId}`),
  create: (projectId: string, entityType: string, entityId: string, data: unknown) =>
    api.post(`/projects/${projectId}/comments/${entityType}/${entityId}`, data),
  update: (projectId: string, entityType: string, entityId: string, commentId: string, data: unknown) =>
    api.patch(`/projects/${projectId}/comments/${entityType}/${entityId}/${commentId}`, data),
  delete: (projectId: string, entityType: string, entityId: string, commentId: string) =>
    api.delete(`/projects/${projectId}/comments/${entityType}/${entityId}/${commentId}`),
};

export const activityApi = {
  list: (projectId: string, params?: Record<string, string | number>) =>
    api.get(`/projects/${projectId}/activity`, { params }),
  getSummary: (projectId: string, days?: number) =>
    api.get(`/projects/${projectId}/activity/summary`, { params: { days } }),
};
