import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@env';

const SOCKET_URL = API_BASE_URL; // Using environment variable instead of hardcoded URL

interface SocketService {
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;
  disconnect(): void;
  connect(token: string): void;
  onProfileUpdate(callback: (data: { fullName: string; avatar: string; email: string }) => void): void;
  emitProfileUpdate(data: { fullName: string; avatar: string; email: string }): void;
}

class SocketServiceImpl implements SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private static instance: SocketServiceImpl;

  private constructor() {}

  static getInstance(): SocketServiceImpl {
    if (!SocketServiceImpl.instance) {
      SocketServiceImpl.instance = new SocketServiceImpl();
    }
    return SocketServiceImpl.instance;
  }

  connect(token: string): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Lắng nghe các sự kiện từ server
    this.socket.on('friendRequestUpdate', (data) => {
      this.notifyListeners('friendRequestUpdate', data);
    });

    this.socket.on('friendRequestWithdrawn', (data) => {
      this.notifyListeners('friendRequestWithdrawn', data);
    });

    this.socket.on('friendRequestResponded', (data) => {
      this.notifyListeners('friendRequestResponded', data);
    });

    this.socket.on('profileUpdate', (data) => {
      this.notifyListeners('profileUpdate', data);
    });
  }

  onProfileUpdate(callback: (data: { fullName: string; avatar: string; email: string }) => void): void {
    this.on('profileUpdate', callback);
  }

  emitProfileUpdate(data: { fullName: string; avatar: string; email: string }): void {
    this.emit('profileUpdate', data);
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = SocketServiceImpl.getInstance(); 