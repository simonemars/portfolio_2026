import { useEffect } from 'react';
import { onAuthStateChange, signIn, signUp, signOutUser, getCurrentUser } from '../services/auth';
import { useUserStore } from '../store/userStore';

export const useAuth = () => {
  const { user, loading, error, setUser, setLoading, setError, fetchUserProfile, clearUser } = useUserStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (userProfile) => {
      if (userProfile) {
        // User is signed in
        try {
          setUser(userProfile);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to fetch user profile');
        }
      } else {
        // User is signed out
        clearUser();
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, displayName);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated: !!user,
  };
}; 