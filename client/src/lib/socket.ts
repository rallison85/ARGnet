import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const storedData = localStorage.getItem('argnet-auth');
    let token: string | undefined;

    if (storedData) {
      try {
        const { state } = JSON.parse(storedData);
        token = state?.token;
      } catch {
        // Invalid stored data
      }
    }

    socket = io({
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const sock = getSocket();
  if (!sock.connected) {
    sock.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinProject(projectId: string): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('join-project', projectId);
  }
}

export function leaveProject(projectId: string): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('leave-project', projectId);
  }
}

export function emitEntityUpdate(
  projectId: string,
  entityType: string,
  entityId: string,
  changes: unknown
): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('entity-update', { projectId, entityType, entityId, changes });
  }
}

export function emitCursorMove(
  projectId: string,
  entityType: string,
  entityId: string,
  position: unknown,
  user: unknown
): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('cursor-move', { projectId, entityType, entityId, position, user });
  }
}
