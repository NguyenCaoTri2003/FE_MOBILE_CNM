import axios from 'axios';
import { API_URL } from '../config/constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SearchUserResponse {
  success: boolean;
  data: {
    fullName: string;
    avatar: string;
    phoneNumber: string;
    email: string;
  }[];
}

export const searchUsers = async (query: string): Promise<SearchUserResponse> => {
  try {
    const response = await api.get('/api/users/search', {
      params: { query }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}; 