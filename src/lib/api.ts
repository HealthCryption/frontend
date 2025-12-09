import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we have a refresh token, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export interface LoginRequest {
  username: string;
  password: string;
  totp_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  master_key?: string; // Base64 encoded master key (patients)
  doctor_private_key?: string; // Base64 encoded private key (doctors)
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: 'patient' | 'doctor';
  is_active: boolean;
  is_verified: boolean;
  totp_enabled: boolean;
  created_at: string;
  updated_at: string;
  encrypted_master_key?: string; // Base64 encoded
  key_salt?: string; // Base64 encoded
  key_nonce?: string; // Base64 encoded
  public_key_x25519?: string; // Base64 encoded (for doctors)
}

export interface RegisterRequest {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role: 'patient' | 'doctor';
}

export interface RegisterResponse {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  totp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: { full_name?: string; email?: string }) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  logout: async () => {
    // Clear master key from memory
    const { clearMasterKey, clearDoctorPassword } = await import('./crypto');
    clearMasterKey();
    clearDoctorPassword();
    
    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Medical Images API
export const medicalImagesApi = {
  uploadImage: async (encryptedFile: Blob, imageType: string, encryptedDescription?: string | null) => {
    const formData = new FormData();
    formData.append('file', encryptedFile, 'encrypted_image.bin');
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('image_type', imageType);
    
    if (encryptedDescription) {
      console.log('Uploading with encrypted description:', encryptedDescription.substring(0, 50) + '...');
      params.append('description_encrypted', encryptedDescription);
    } else {
      console.log('Uploading without description');
    }

    // Log FormData contents
    console.log('FormData entries:');
    for (const [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(`  ${key}: [Blob, ${(value as Blob).size} bytes]`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    console.log('Query parameters:', params.toString());

    const response = await api.post(`/images/upload?${params.toString()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Backend response:', JSON.stringify(response.data, null, 2));
    return response.data;
  },

  listImages: async () => {
    const response = await api.get('/patients/images');
    return response.data;
  },

  getImage: async (imageId: number): Promise<Blob> => {
    const response = await api.get(`/images/${imageId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteImage: async (imageId: number) => {
    const response = await api.delete(`/images/${imageId}`);
    return response.data;
  },
};

// Doctors API
export const doctorsApi = {
  getPatients: async () => {
    const response = await api.get('/doctors/my-patients');
    return response;
  },

  getPatientImages: async (patientId: number) => {
    const response = await api.get(`/doctors/patient/${patientId}/images`);
    return response;
  },

  getMyPatients: async () => {
    const response = await api.get('/doctors/my-patients');
    return response.data;
  },

  getPatientData: async (patientId: number, password: string) => {
    const response = await api.get(`/doctors/patient/${patientId}/data`, {
      params: { password }
    });
    return response.data;
  },

  getPatientMasterKey: async (patientId: number, password: string): Promise<{ master_key: string; patient_id: number }> => {
    const response = await api.get(`/doctors/patient/${patientId}/master-key`, {
      params: { password }
    });
    return response.data;
  },

  grantAccess: async (doctorId: number, password: string) => {
    const response = await api.post(`/doctors/grant-access/${doctorId}`, null, {
      params: { password }
    });
    return response.data;
  },

  revokeAccess: async (doctorId: number) => {
    const response = await api.delete(`/doctors/revoke-access/${doctorId}`);
    return response.data;
  },
};
