import { create } from 'zustand';
import { UserProfile, getUserProfile } from '../services/auth';

interface UserStore {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchUserProfile: (uid: string) => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  
  setUser: (user) => set({ user, error: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error, loading: false }),
  
  fetchUserProfile: async (uid: string) => {
    set({ loading: true, error: null });
    try {
      const userProfile = await getUserProfile(uid);
      if (userProfile) {
        set({ user: userProfile, loading: false });
      } else {
        set({ error: 'User profile not found', loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch user profile', loading: false });
    }
  },
  
  clearUser: () => set({ user: null, error: null, loading: false }),
})); 