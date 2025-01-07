import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
// TODO: Replace with your Firebase config values
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyCjW6x6MH0X9Xb-FhY0B18945Ddu8KC4SM",
  authDomain: "soulscri.firebaseapp.com",
  projectId: "soulscri",
  storageBucket: "soulscri.firebasestorage.app",
  messagingSenderId: "621669607026",
  appId: "1:621669607026:web:d26c9511e96cca4d2184eb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; 

