import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, DEFAULT_AVATAR_URL } from '@env';
import { Platform } from 'react-native';

const BASE_URL = `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: true
});

// Add token to requests if it exists
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject(error.response.data);
    } else if (error.request) {
      return Promise.reject({ 
        success: false,
        message: 'Không nhận được phản hồi từ server',
        error: 'NO_RESPONSE'
      });
    } else {
      return Promise.reject({ 
        success: false,
        message: 'Lỗi kết nối: ' + error.message,
        error: 'REQUEST_ERROR'
      });
    }
  }
);

export const login = async (identifier: string, password: string) => {
  try {
    // Format identifier if it looks like a phone number without country code
    // Phone pattern: 9 digits starting with 3, 5, 7, 8, or 9
    const phonePattern = /^[3|5|7|8|9][0-9]{8}$/;
    let formattedIdentifier = identifier;
    
    if (phonePattern.test(identifier)) {
      // Add +84 prefix if it's a valid Vietnam phone number without country code
      formattedIdentifier = `+84${identifier}`;
    }
    
    const response = await api.post('/login', { 
      email: formattedIdentifier, // API uses email field for both email and phone
      password 
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const register = async (email: string, password: string, name: string, phone: string) => {
  try {
    // Include all possible fields that might be required by the database
    const userData = {
      email: email.trim(),
      password: password.trim(),
      fullName: name.trim(),
      phoneNumber: phone.trim(),
      createdAt: new Date().toISOString(),
      avatar: DEFAULT_AVATAR_URL
    };
    
    const response = await api.post('/register', userData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const response = await api.post('/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (email: string, code: string, password: string) => {
  try {
    const response = await api.post('/reset-password', { 
      email, 
      code, 
      newPassword: password 
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const getProfile = async () => {
  try {
    const response = await api.get('/profile');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProfile = async (data: any) => {
  try {
    const response = await api.put('/profile', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const uploadAvatar = async (formData: FormData) => {
  try {
    const response = await api.post('/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const response = await api.put('/update-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const registerSendVerification = async (email: string) => {
  try {
    const response = await api.post('/register/send-verification', { email });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const registerVerify = async (
  email: string,
  code: string,
  fullName: string,
  password: string,
  phoneNumber: string
) => {
  try {
    const userData = {
      email,
      code,
      fullName,
      password,
      phoneNumber,
      avatar: DEFAULT_AVATAR_URL
    };
    
    const response = await api.post('/register/verify', userData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
}; 

export interface SearchUserResponse {
  success: boolean;
  data: {
    fullName: string;
    avatar: string;
    phoneNumber: string;
    email: string;
  };
}

export const searchUsers = async (query: string): Promise<SearchUserResponse> => {
  try {
    // Check if query is email or phone number
    const isEmail = query.includes('@');
    let params;
    
    if (isEmail) {
      params = { email: query };
    } else {
      // Format phone number: convert 0xxx to +84xxx
      let formattedPhone = query.replace(/[\s-]/g, ''); // Remove spaces and dashes
      if (formattedPhone.startsWith('0')) {
        formattedPhone = `+84${formattedPhone.substring(1)}`;
      }
      params = { phoneNumber: formattedPhone };
    }
    
    const response = await api.get('/search', { params });
    return response.data;
  } catch (error) {
    // Just throw the error without logging
    throw error;
  }
}; 

export interface FriendRequest {
  email: string;
  fullName: string;
  avatar: string;
  timestamp: string;
  status: string;
}

export interface FriendRequestsResponse {
  success: boolean;
  data: {
    received: FriendRequest[];
    sent: FriendRequest[];
  };
}

export interface Friend {
  email: string;
  fullName: string;
  avatar: string;
  userId: string;
  phoneNumber?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
  };
  online?: boolean;
}

export interface FriendsResponse {
  success: boolean;
  data: Friend[];
}

export const sendFriendRequest = async (receiverEmail: string) => {
  try {
    const response = await api.post('/friend-request/send', { receiverEmail });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const respondToFriendRequest = async (senderEmail: string, accept: boolean) => {
  try {
    const response = await api.post('/friend-request/respond', { senderEmail, accept });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFriendRequests = async (): Promise<FriendRequestsResponse> => {
  try {
    const response = await api.get('/friend-requests');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFriends = async (): Promise<FriendsResponse> => {
  try {
    const response = await api.get('/friends');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const withdrawFriendRequest = async (receiverEmail: string) => {
  try {
    const response = await api.post('/friend-request/withdraw', { receiverEmail });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export type Message = {
  messageId: string;
  senderEmail: string;
  receiverEmail: string;
  content: string;
  createdAt: string;
  status: 'sent' | 'read';
  type?: 'text' | 'image' | 'file' | 'video';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
  reactions?: Reaction[];
  isRecalled?: boolean;
};

export interface Reaction {
  messageId: string;
  reaction: string;
  senderEmail: string;
}

export interface ReactionResponse {
  success: boolean;
  data: Reaction;
}

export interface ChatResponse {
  success: boolean;
  data: Message[];
}

export interface SendMessageResponse {
  success: boolean;
  data: Message;
}

export const getMessages = async (receiverEmail: string): Promise<ChatResponse> => {
  try {
    const response = await api.get(`/messages/conversation/${receiverEmail}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const sendMessage = async (
  receiverEmail: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'video' = 'text',
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
  }
): Promise<SendMessageResponse> => {
  try {
    const response = await api.post('/messages/send', {
      receiverEmail,
      content,
      type,
      metadata
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    await api.put(`/messages/read/${messageId}`);
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const addReaction = async (messageId: string, reaction: string): Promise<Message> => {
  try {
    const response = await api.post('/messages/reaction', {
      messageId,
      reaction
    });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const recallMessage = async (messageId: string): Promise<Message> => {
  try {
    const response = await api.put(`/messages/recall/${messageId}`);
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    await api.delete(`/messages/delete/${messageId}`);
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const uploadFile = async (formData: FormData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.post(`${BASE_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      timeout: 60000,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
    });
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error.response.data;
    } else if (error.request) {
      throw {
        success: false,
        message: 'Không nhận được phản hồi từ server',
        error: 'NO_RESPONSE'
      };
    } else {
      throw {
        success: false,
        message: 'Lỗi kết nối: ' + error.message,
        error: 'REQUEST_ERROR'
      };
    }
  }
};

export interface LastMessage {
  senderEmail: string;
  receiverEmail: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface ConversationsResponse {
  success: boolean;
  data: {
    email: string;
    fullName: string;
    avatar: string;
    lastMessage: LastMessage;
  }[];
}

export const getConversations = async (): Promise<ConversationsResponse> => {
  try {
    const response = await api.get('/messages/conversations');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const unfriend = async (friendEmail: string) => {
  try {
    const response = await api.post('/friends/unfriend', { friendEmail });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Group Interfaces
export interface GroupMember {
  userId: string;
  email: string;
  fullName: string;
  avatar: string;
  role: 'admin' | 'deputy' | 'member';
  joinedAt: string;
}

export interface Group {
  groupId: string;
  name: string;
  avatar?: string;
  members: GroupMember[];
  creator: string;
  lastMessage?: {
    content: string;
    senderEmail: string;
    timestamp: string;
    type?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GroupResponse {
  success: boolean;
  message?: string;
  data: Group;
}

export interface GroupsResponse {
  success: boolean;
  data: Group[];
}

// Group APIs
export const getGroups = async (): Promise<GroupsResponse> => {
  try {
    const response = await api.get('/groups');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getGroup = async (groupId: string): Promise<GroupResponse> => {
  try {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createGroup = async (
  name: string,
  description?: string,
  members: string[] = [],
  avatar?: string
): Promise<GroupResponse> => {
  try {
    const response = await api.post('/groups', {
      name,
      description,
      members,
      avatar
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateGroup = async (
  groupId: string,
  data: {
    name?: string;
    description?: string;
    avatar?: string;
  }
): Promise<GroupResponse> => {
  try {
    const response = await api.put(`/groups/${groupId}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    await api.delete(`/groups/${groupId}`);
  } catch (error) {
    throw error;
  }
};

// Thêm thành viên vào nhóm
export const addGroupMembers = async (
  groupId: string,
  memberIds: string[]
): Promise<GroupResponse> => {
  try {
    const response = await api.post(`/groups/${groupId}/members`, {
      memberIds
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Xóa thành viên khỏi nhóm
export const removeGroupMember = async (
  groupId: string,
  memberEmail: string
): Promise<GroupResponse> => {
  try {
    // Lấy danh sách thành viên để tìm userId
    const membersResponse = await getGroupMembers(groupId);
    const member = membersResponse.data.members.find(m => m.email === memberEmail);
    
    if (!member) {
      throw new Error('Không tìm thấy thành viên');
    }
    
    const response = await api.delete(`/groups/${groupId}/members/${member.userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateMemberRole = async (
  groupId: string,
  memberEmail: string,
  role: 'admin' | 'deputy' | 'member'
): Promise<GroupResponse> => {
  try {
    // Lấy danh sách thành viên để tìm userId
    const membersResponse = await getGroupMembers(groupId);
    const member = membersResponse.data.members.find(m => m.email === memberEmail);
    
    if (!member) {
      throw new Error('Không tìm thấy thành viên');
    }

    // Sử dụng endpoint /groups/{groupId}/members/{memberId}/role
    const response = await api.put(`/groups/${groupId}/members/${member.userId}/role`, {
      role: role
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const leaveGroup = async (groupId: string): Promise<void> => {
  try {
    await api.post(`/groups/${groupId}/leave`);
  } catch (error) {
    throw error;
  }
};

// Group Message Interfaces
export interface GroupMessage extends Message {
  groupId: string;
  deletedFor?: string[];
}

export interface GroupMessagesResponse {
  success: boolean;
  data: {
    messages: GroupMessage[];
    total?: number;
  };
}

// Group Message APIs
export const getGroupMessages = async (groupId: string): Promise<GroupMessagesResponse> => {
  try {
    const response = await api.get(`/groups/${groupId}/messages`);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const sendGroupMessage = async (
  groupId: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'video' = 'text',
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
  }
): Promise<SendMessageResponse> => {
  try {
    const response = await api.post(`/groups/${groupId}/messages`, {
      content,
      type,
      metadata
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const recallGroupMessage = async (groupId: string, messageId: string): Promise<Message> => {
  try {
    const response = await api.put(`/groups/${groupId}/messages/${messageId}/recall`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Không thể thu hồi tin nhắn');
    }
    return response.data.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Lỗi server');
    } else if (error.request) {
      throw new Error('Không thể kết nối đến server');
    } else {
      throw new Error(error.message || 'Đã có lỗi xảy ra');
    }
  }
};

export const deleteGroupMessage = async (
  groupId: string,
  messageId: string
): Promise<void> => {
  try {
    await api.delete(`/groups/${groupId}/messages/${messageId}`);
  } catch (error) {
    throw error;
  }
};

export const uploadGroupFile = async (groupId: string, formData: FormData) => {
  try {
    const response = await api.post(`/groups/${groupId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const getGroupFile = async (groupId: string, filename: string, type: 'image' | 'file') => {
  try {
    const response = await api.get(`/groups/${groupId}/files/${filename}`, {
      params: { type },
      responseType: 'blob'
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const addReactionToGroupMessage = async (groupId: string, messageId: string, reaction: string): Promise<Message> => {
  try {
    const response = await api.post(`/groups/${groupId}/messages/${messageId}/reactions`, { 
      reaction
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const getGroupMembers = async (groupId: string): Promise<{ success: boolean; data: { members: GroupMember[] } }> => {
  try {
    const response = await api.get(`/groups/${groupId}/members`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const forwardGroupMessage = async (
  sourceGroupId: string, 
  messageId: string, 
  targetGroupId?: string,
  targetEmail?: string
): Promise<{success: boolean; message?: string; data?: Message}> => {
  try {
    const response = await api.post(`/groups/${sourceGroupId}/messages/${messageId}/forward`, {
      targetGroupId,
      targetEmail
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

// Thêm interface cho file avatar
interface AvatarFile {
  uri: string;
  type?: string;
  name?: string;
}

// Thêm hàm mới để cập nhật thông tin nhóm với avatar
export const updateGroupInfo = async (
  groupId: string,
  data: {
    name?: string;
    avatar?: AvatarFile;
  }
): Promise<GroupResponse> => {
  try {
    const formData = new FormData();
    
    if (data.name) {
      formData.append('name', data.name);
    }
    
    if (data.avatar) {
      // Ensure the file object is properly formatted
      const file = {
        uri: Platform.OS === 'android' ? data.avatar.uri : data.avatar.uri.replace('file://', ''),
        type: data.avatar.type || 'image/jpeg',
        name: data.avatar.name || 'avatar.jpg',
      };
      
      formData.append('file', file as any);
    }
    
    const response = await api.put(`/groups/${groupId}/info`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
      transformRequest: (data, headers) => {
        return data; // Don't transform FormData
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating group info:', error);
    throw error;
  }
}; 