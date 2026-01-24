import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import storyRoutes from './routes/stories.js';
import characterRoutes from './routes/characters.js';
import puzzleRoutes from './routes/puzzles.js';
import trailRoutes from './routes/trails.js';
import eventRoutes from './routes/events.js';
import assetRoutes from './routes/assets.js';
import taskRoutes from './routes/tasks.js';
import loreRoutes from './routes/lore.js';
import timelineRoutes from './routes/timeline.js';
import commentRoutes from './routes/comments.js';
import activityRoutes from './routes/activity.js';
import locationRoutes from './routes/locations.js';
import digitalPropertyRoutes from './routes/digitalProperties.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocketAuth } from './middleware/socketAuth.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup socket authentication
setupSocketAuth(io);

// Make io available to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(uploadDir)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/stories', storyRoutes);
app.use('/api/projects/:projectId/characters', characterRoutes);
app.use('/api/projects/:projectId/puzzles', puzzleRoutes);
app.use('/api/projects/:projectId/trails', trailRoutes);
app.use('/api/projects/:projectId/events', eventRoutes);
app.use('/api/projects/:projectId/assets', assetRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/lore', loreRoutes);
app.use('/api/projects/:projectId/timeline', timelineRoutes);
app.use('/api/projects/:projectId/comments', commentRoutes);
app.use('/api/projects/:projectId/activity', activityRoutes);
app.use('/api/projects/:projectId/locations', locationRoutes);
app.use('/api/projects/:projectId/digital-properties', digitalPropertyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join project room
  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`Socket ${socket.id} joined project:${projectId}`);
  });

  // Leave project room
  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    console.log(`Socket ${socket.id} left project:${projectId}`);
  });

  // Real-time collaboration events
  socket.on('entity-update', (data: { projectId: string; entityType: string; entityId: string; changes: unknown }) => {
    socket.to(`project:${data.projectId}`).emit('entity-updated', data);
  });

  socket.on('cursor-move', (data: { projectId: string; entityType: string; entityId: string; position: unknown; user: unknown }) => {
    socket.to(`project:${data.projectId}`).emit('cursor-moved', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║     █████╗ ██████╗  ██████╗ ███╗   ██╗███████╗████████╗   ║
  ║    ██╔══██╗██╔══██╗██╔════╝ ████╗  ██║██╔════╝╚══██╔══╝   ║
  ║    ███████║██████╔╝██║  ███╗██╔██╗ ██║█████╗     ██║      ║
  ║    ██╔══██║██╔══██╗██║   ██║██║╚██╗██║██╔══╝     ██║      ║
  ║    ██║  ██║██║  ██║╚██████╔╝██║ ╚████║███████╗   ██║      ║
  ║    ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝      ║
  ║                                                           ║
  ║     ARG Collaboration Platform                            ║
  ║     Server running on port ${PORT}                          ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

export { io };
