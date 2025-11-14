/**
 * Test connection to backend API
 * Use this to verify the backend is accessible
 */

import { API_BASE_URL } from '../config/api';
import axios from 'axios';

export const testBackendConnection = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    console.log('🧪 Testing backend connection...');
    console.log('📍 Testing URL:', `${API_BASE_URL}/test`);
    
    const response = await axios.get(`${API_BASE_URL}/test`, {
      timeout: 5000,
    });
    
    console.log('✅ Backend connection successful!');
    console.log('📦 Response:', response.data);
    
    return {
      success: true,
      message: 'Backend is accessible',
      data: response.data,
    };
  } catch (error: any) {
    console.error('❌ Backend connection failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Response:', error.response?.data);
    
    let message = 'Cannot connect to backend';
    if (error.code === 'ECONNREFUSED') {
      message = 'Connection refused - backend may not be running or not accessible';
    } else if (error.message?.includes('timeout')) {
      message = 'Connection timeout - backend may be slow or unreachable';
    } else if (error.message?.includes('Network')) {
      message = 'Network error - check WiFi connection and IP address';
    }
    
    return {
      success: false,
      message,
    };
  }
};

