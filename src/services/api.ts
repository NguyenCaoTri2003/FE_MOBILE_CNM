import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use your computer's IP address instead of localhost
// You can find your IP address by running 'ipconfig' in Command Prompt
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
      console.error('Response Error:', error.response.data);
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request Error:', error.request);
      return Promise.reject({ message: 'No response from server. Please check your internet connection.' });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
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
    
    console.log('Register request data:', userData);
    
    const response = await api.post('/register', userData);
    console.log('Register response:', response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('Register error:', error.response?.data || error);
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

export const resetPassword = async (token: string, password: string) => {
  try {
    const response = await api.post('/reset-password', { token, password });
    return response.data;
  } catch (error) {
    throw error;
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
    console.error('Error updating profile:', error.response?.data || error);
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
    console.error('Error uploading avatar:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw { message: 'Kết nối quá lâu. Vui lòng thử lại.' };
    } else if (error.response) {
      console.error('Response Error:', error.response.data);
      throw error.response.data;
    } else if (error.request) {
      console.error('Request Error:', error.request);
      throw { message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.' };
    } else {
      console.error('Error:', error.message);
      throw { message: 'Có lỗi xảy ra khi tải lên ảnh đại diện.' };
    }
  }
}; 