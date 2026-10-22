import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import {
  getFunctions,
  connectFunctionsEmulator,
} from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAollOMm9B6-QPzBMIKpgRh0W6nfvTh4_o',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'four-us-22915.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'four-us-22915',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'four-us-22915.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '544446540844',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:544446540844:web:02f0d83adb9421f9aaf589',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Anonymous auth helper
export async function ensureAuth(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        try {
          const result = await signInAnonymously(auth);
          resolve(result.user);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

export default app;
