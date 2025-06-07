import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login, logout } from '@/store/slices/authSlice';
import { RootState } from '@/types';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, token, loading, error } = useAppSelector((state: RootState) => state.auth);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
    }
  }, [dispatch, navigate]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: Boolean(token),
    login: handleLogin,
    logout: handleLogout,
  };
}; 