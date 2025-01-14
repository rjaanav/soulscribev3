import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  type User,
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FIREBASE_API_KEY, 
  FIREBASE_AUTH_DOMAIN, 
  FIREBASE_PROJECT_ID, 
  FIREBASE_STORAGE_BUCKET, 
  FIREBASE_MESSAGING_SENDER_ID, 
  FIREBASE_APP_ID 
} from '@env';

// Storage keys
export const STORAGE_KEYS = {
  USER_AUTH: '@user_auth',
  USER_PROFILE: '@user_profile',
  JOURNAL_ENTRIES: '@journal_entries',
};

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Initialize Firebase configuration
const firebaseConfig: FirebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with in-memory persistence
export const auth = getAuth(app);
setPersistence(auth, inMemoryPersistence);

// Initialize Firestore with settings optimized for React Native
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceLongPolling: true // This ensures better compatibility with React Native
});

export const storage = getStorage(app);

// Initialize auth state persistence with AsyncStorage
onAuthStateChanged(auth, async (user: User | null) => {
  if (user) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_AUTH, JSON.stringify({
      uid: user.uid,
      email: user.email,
    }));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_AUTH);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }
});

// Helper functions for AsyncStorage
export const storage_helpers = {
  // Get stored auth state
  getStoredAuthState: async () => {
    try {
      const authData = await AsyncStorage.getItem(STORAGE_KEYS.USER_AUTH);
      return authData ? JSON.parse(authData) : null;
    } catch (error) {
      console.error('Error getting stored auth state:', error);
      return null;
    }
  },

  // Save user profile to AsyncStorage
  saveUserProfile: async (profile: any) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile to AsyncStorage:', error);
    }
  },

  // Get user profile from AsyncStorage
  getUserProfile: async () => {
    try {
      const profile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error getting user profile from AsyncStorage:', error);
      return null;
    }
  },

  // Cache journal entries
  cacheJournalEntries: async (entries: any[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(entries));
    } catch (error) {
      console.error('Error caching journal entries:', error);
    }
  },

  // Get cached journal entries
  getCachedJournalEntries: async () => {
    try {
      const entries = await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES);
      return entries ? JSON.parse(entries) : [];
    } catch (error) {
      console.error('Error getting cached journal entries:', error);
      return [];
    }
  },

  // Clear all stored data
  clearStorage: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_AUTH,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.JOURNAL_ENTRIES,
      ]);
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  }
};

export default app; 

