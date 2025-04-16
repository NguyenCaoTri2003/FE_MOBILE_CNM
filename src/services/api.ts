import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  userId: string;
  [key: string]: any;
}

const BASE_URL = 'http://192.168.110.77:5000/api';

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
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({ message: 'No response from server. Please check your internet connection.' });
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject({ message: 'An unexpected error occurred.' });
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
      avatar: 'https://res.cloudinary.com/ds4v3awds/image/upload/v1743944990/l2eq6atjnmzpppjqkk1j.jpg'
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
      avatar: 'https://res.cloudinary.com/ds4v3awds/image/upload/v1743944990/l2eq6atjnmzpppjqkk1j.jpg'
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
  type?: 'text' | 'image' | 'file';
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
    console.log('Getting messages for:', receiverEmail);
    console.log('API URL:', `${BASE_URL}/messages/conversation/${receiverEmail}`);
    
    const response = await api.get(`/messages/conversation/${receiverEmail}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get messages');
    }
    
    console.log('Messages retrieved successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error getting messages:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
      throw error.response.data;
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw { message: 'No response from server' };
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
};

export const sendMessage = async (
  receiverEmail: string,
  content: string,
  type: 'text' | 'image' | 'file' = 'text',
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
  }
): Promise<SendMessageResponse> => {
  try {
    console.log('Sending message to:', receiverEmail);
    console.log('Message content:', content);
    console.log('API URL:', `${BASE_URL}/messages/send`);
    
    const response = await api.post('/messages/send', {
      receiverEmail,
      content,
      type,
      metadata
    });
    
    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error sending message:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
      throw error.response.data;
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw { message: 'No response from server' };
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    await api.put(`/messages/read/${messageId}`);
  } catch (error: any) {
    console.error('Error marking message as read:', error);
    throw error.response?.data || error;
  }
};

export const uploadFile = async (formData: FormData) => {
  try {
    console.log('Starting file upload...');
    console.log('FormData contents:', formData);
    
    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem('token');
    
    // Use axios directly
    const response = await axios.post(`${BASE_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      timeout: 60000, // 60 seconds timeout
      maxContentLength: 50 * 1024 * 1024, // 50MB max file size
      maxBodyLength: 50 * 1024 * 1024, // 50MB max file size
    });
    
    console.log('Upload response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Upload file error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });
    
    if (error.response) {
      // Server responded with an error
      throw error.response.data;
    } else if (error.request) {
      // Request was made but no response received
      throw {
        success: false,
        message: 'Không nhận được phản hồi từ server',
        error: 'NO_RESPONSE'
      };
    } else {
      // Error setting up the request
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

export const sendReaction = async (messageId: string, reaction: string): Promise<ReactionResponse> => {
  try {
    const response = await api.post('/messages/reaction', {
      messageId,
      reaction
    });
    return response.data;
  } catch (error: any) {
    console.error('Error sending reaction:', error);
    throw error.response?.data || error;
  }
};

export const recallMessage = async (messageId: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.put(
      `${BASE_URL}/messages/recall/${messageId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error recalling message:', error);
    throw error;
  }
};

export const deleteMessage = async (messageId: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.delete(
      `${BASE_URL}/messages/delete/${messageId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}; 