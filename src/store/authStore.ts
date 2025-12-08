import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: 'patient' | 'doctor' | 'admin';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: (token: string, user: User) => {
    localStorage.setItem('access_token', token);
    set({ accessToken: token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ accessToken: null, user: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    set({ user });
  },
}));
