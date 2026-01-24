import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    display_name: string | null;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

export function setupSocketAuth(io: SocketIOServer): void {
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      // Allow unauthenticated connections but mark them
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      const user = db.prepare(`
        SELECT id, email, username, display_name
        FROM users
        WHERE id = ?
      `).get(decoded.userId) as { id: string; email: string; username: string; display_name: string | null } | undefined;

      if (user) {
        socket.userId = user.id;
        socket.user = user;
      }

      next();
    } catch {
      // Invalid token, allow connection but don't authenticate
      next();
    }
  });
}

export function requireSocketAuth(socket: AuthenticatedSocket): boolean {
  return !!socket.userId;
}
