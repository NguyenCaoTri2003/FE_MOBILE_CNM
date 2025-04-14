import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use your computer's IP address instead of localhost
// You can find your IP address by running 'ipconfig' in Command Prompt
const BASE_URL = 'http://192.168.110.33:5000/api';

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

export const uploadAvatar = async (uri: string) => {
  try {
    const formData = new FormData();
    const file = {
      uri: uri,
      type: 'image/jpeg',
      name: 'avatar.jpg'
    };
    formData.append('avatar', file as any);

    const response = await api.post('/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      transformRequest: (data) => {
        return data;
      },
      timeout: 60000, // Increase timeout to 60 seconds
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (!response.data) {
      throw new Error('No response data received');
    }

    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw { message: 'Kết nối quá lâu. Vui lòng thử lại.' };
    } else if (error.response) {
      throw error.response.data;
    } else if (error.request) {
      throw { message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.' };
    } else {
      throw { message: 'Có lỗi xảy ra khi tải lên ảnh đại diện.' };
    }
  }
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const response = await api.put('/change-password', {
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

export interface FriendsResponse {
  success: boolean;
  data: FriendRequest[];
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