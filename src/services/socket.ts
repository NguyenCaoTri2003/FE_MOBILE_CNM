import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@env';

const SOCKET_URL = API_BASE_URL; // Using environment variable instead of hardcoded URL

// Định nghĩa các interface cho group chat
interface Group {
  id: string;
  name: string;
  avatar: string;
  members: string[];
  creator: string;
  lastMessage?: {
    content: string;
    sender: string;
    timestamp: Date;
  };
  unreadCount?: number;
}

interface GroupMessage {
  id: string;
  content: string;
  type: string;
  sender: string;
  timestamp: Date;
}

interface SocketService {
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;
  disconnect(): void;
  connect(token: string): void;
  onProfileUpdate(callback: (data: { fullName: string; avatar: string; email: string }) => void): void;
  emitProfileUpdate(data: { fullName: string; avatar: string; email: string }): void;
  
  // Group chat methods
  joinGroups(): void;
  onCreateGroup(callback: (data: { group: Group }) => void): void;
  onGroupList(callback: (data: { groups: Group[] }) => void): void;
  onNewGroupMessage(callback: (data: { groupId: string; message: GroupMessage }) => void): void;
  onGroupJoined(callback: (data: { group: Group }) => void): void;
  onGroupMembersUpdated(callback: (data: { groupId: string; newMembers: string[] }) => void): void;
  onGroupError(callback: (data: { error: string }) => void): void;
  
  emitCreateGroup(name: string, members: string[]): void;
  emitGroupMessage(groupId: string, content: string, type?: string): void;
  emitAddGroupMembers(groupId: string, newMembers: string[]): void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
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
      console.log('Socket connected successfully');
      // Tự động join groups khi kết nối
      this.joinGroups();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Lắng nghe các sự kiện từ server
    this.socket.on('friendRequestUpdate', (data) => {
      console.log('Received friendRequestUpdate:', data);
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

    // Group chat events
    this.socket.on('groupList', (data) => {
      console.log('Received groupList:', data);
      this.notifyListeners('groupList', data);
    });

    this.socket.on('groupCreated', (data) => {
      console.log('Received groupCreated:', data);
      this.notifyListeners('groupCreated', data);
    });

    this.socket.on('newGroupMessage', (data) => {
      console.log('Received newGroupMessage:', data);
      this.notifyListeners('newGroupMessage', data);
    });

    this.socket.on('groupJoined', (data) => {
      console.log('Received groupJoined:', data);
      this.notifyListeners('groupJoined', data);
    });

    this.socket.on('groupMembersUpdated', (data) => {
      console.log('Received groupMembersUpdated:', data);
      this.notifyListeners('groupMembersUpdated', data);
    });

    this.socket.on('groupError', (data) => {
      console.error('Received groupError:', data);
      this.notifyListeners('groupError', data);
    });
  }

  // Group chat methods
  joinGroups(): void {
    console.log('Joining groups...');
    if (this.socket) {
      this.socket.emit('joinGroups');
    }
  }

  onCreateGroup(callback: (data: { group: Group }) => void): void {
    this.on('groupCreated', callback);
  }

  onGroupList(callback: (data: { groups: Group[] }) => void): void {
    this.on('groupList', callback);
  }

  onNewGroupMessage(callback: (data: { groupId: string; message: GroupMessage }) => void): void {
    this.on('newGroupMessage', callback);
  }

  onGroupJoined(callback: (data: { group: Group }) => void): void {
    this.on('groupJoined', callback);
  }

  onGroupMembersUpdated(callback: (data: { groupId: string; newMembers: string[] }) => void): void {
    this.on('groupMembersUpdated', callback);
  }

  onGroupError(callback: (data: { error: string }) => void): void {
    this.on('groupError', callback);
  }

  emitCreateGroup(name: string, members: string[]): void {
    this.emit('createGroup', { name, members });
  }

  emitGroupMessage(groupId: string, content: string, type: string = 'text'): void {
    this.emit('groupMessage', {
      groupId,
      message: {
        content,
        type,
        timestamp: new Date()
      }
    });
  }

  emitAddGroupMembers(groupId: string, newMembers: string[]): void {
    this.emit('addGroupMembers', { groupId, newMembers });
  }

  onProfileUpdate(callback: (data: { fullName: string; avatar: string; email: string }) => void): void {
    this.on('profileUpdate', callback);
  }

  emitProfileUpdate(data: { fullName: string; avatar: string; email: string }): void {
    this.emit('profileUpdate', data);
  }

  on(event: string, callback: (data: any) => void): void {
    console.log(`Registering listener for event ${event}`);
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    console.log(`Removing listener for event ${event}`);
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any): void {
    console.log(`Notifying listeners for event ${event}:`, data);
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in listener for event ${event}:`, error);
      }
    });
  }

  emit(event: string, data: any): void {
    console.log(`Emitting event ${event}:`, data);
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

  joinGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('joinGroup', { groupId });
    }
  }

  leaveGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('leaveGroup', { groupId });
    }
  }
}

export const socketService = SocketServiceImpl.getInstance(); 