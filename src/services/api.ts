import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data: {
    email: string;
    username: string;
    password: string;
    full_name: string;
    role: 'patient' | 'doctor' | 'admin';
  }) => api.post('/auth/register', data),

  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),

  getCurrentUser: () => api.get('/auth/me'),
};

// Patient API
export const patientAPI = {
  getData: (password: string) =>
    api.get(`/patients/data?password=${encodeURIComponent(password)}`),

  updateData: (password: string, data: {
    age?: number;
    birads?: string;
    breast_density?: string;
    findings?: string;
    medical_history?: string;
  }) => api.put(`/patients/data?password=${encodeURIComponent(password)}`, data),

  deleteData: (password: string) =>
    api.delete(`/patients/data?password=${encodeURIComponent(password)}`),
};

// Doctor API
export const doctorAPI = {
  // List all doctors in the system
  listDoctors: () => api.get('/doctors/list'),

  // Doctor accesses their patients
  getMyPatients: () => api.get('/doctors/my-patients'),

  getPatientData: (patientId: number, password: string) =>
    api.get(`/doctors/patient/${patientId}/data?password=${encodeURIComponent(password)}`),

  getPatientImages: (patientId: number) =>
    api.get(`/doctors/patient/${patientId}/images`),

  downloadPatientImage: (patientId: number, imageId: number) =>
    api.get(`/doctors/patient/${patientId}/images/${imageId}`, { responseType: 'arraybuffer' }),

  // Patient manages doctor access
  grantAccess: (doctorId: number, password: string) =>
    api.post(`/doctors/grant-access/${doctorId}?password=${encodeURIComponent(password)}`),

  revokeAccess: (doctorId: number) =>
    api.delete(`/doctors/revoke-access/${doctorId}`),
};

// Image API
export const imageAPI = {
  upload: (file: File, data: {
    image_type: string;
    view?: string;
    laterality?: string;
    text_data_encrypted?: string;
    text_data_nonce?: string;
    text_data_salt?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    return api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: () => api.get('/patients/images'),

  download: (imageId: number) =>
    api.get(`/images/${imageId}`, { responseType: 'arraybuffer' }),  // Returns binary encrypted image

  delete: (imageId: number) => api.delete(`/images/${imageId}`),
};

// Audit API
export const auditAPI = {
  getMyLogs: (limit = 20, offset = 0) =>
    api.get(`/audit/my-logs?limit=${limit}&offset=${offset}`),

  verifyChain: () => api.get('/audit/verify-chain'),
};

export default api;
