import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  createdAt: Date;
}

// Mock user data for offline testing
const mockUsers = new Map<string, UserProfile>([
  ['test-user', {
    uid: 'test-user',
    email: 'user@test.com',
    displayName: 'Test User',
    role: 'user',
    createdAt: new Date()
  }],
  ['test-admin', {
    uid: 'test-admin',
    email: 'admin@test.com',
    displayName: 'Test Admin',
    role: 'admin',
    createdAt: new Date()
  }]
]);

// Mock authentication state
let currentUser: UserProfile | null = null;
let authListeners: ((user: UserProfile | null) => void)[] = [];

export const signUp = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> => {
  try {
    // For testing, create a mock user
    const mockUser: UserProfile = {
      uid: `user-${Date.now()}`,
      email,
      displayName: displayName || null,
      role: "user",
      createdAt: new Date()
    };
    
    mockUsers.set(mockUser.uid, mockUser);
    currentUser = mockUser;
    
    // Notify listeners
    authListeners.forEach(listener => listener(currentUser));
    
    // Return a mock UserCredential
    return {
      user: {
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
      } as User,
      providerId: null,
      operationType: 'signIn'
    } as UserCredential;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  try {
    // For testing, check if it's a known test user
    if (email === 'user@test.com' && password === 'password') {
      const user = mockUsers.get('test-user')!;
      currentUser = user;
      authListeners.forEach(listener => listener(currentUser));
      
      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        } as User,
        providerId: null,
        operationType: 'signIn'
      } as UserCredential;
    } else if (email === 'admin@test.com' && password === 'password') {
      const user = mockUsers.get('test-admin')!;
      currentUser = user;
      authListeners.forEach(listener => listener(currentUser));
      
      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        } as User,
        providerId: null,
        operationType: 'signIn'
      } as UserCredential;
    } else {
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    currentUser = null;
    authListeners.forEach(listener => listener(null));
  } catch (error) {
    throw error;
  }
};

export const onAuthStateChange = (callback: (user: UserProfile | null) => void) => {
  authListeners.push(callback);
  // Immediately call with current state
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    const index = authListeners.indexOf(callback);
    if (index > -1) {
      authListeners.splice(index, 1);
    }
  };
};

export const getCurrentUser = (): UserProfile | null => {
  return currentUser;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    // Return mock user if exists
    return mockUsers.get(uid) || null;
  } catch (error) {
    throw error;
  }
}; 