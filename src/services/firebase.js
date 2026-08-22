import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const STORAGE_KEY = 'gst-invoice-app-firebase-config';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBmAIFI2jgVTpkBpRdoAHBAzx-B-1M9xuU',
  authDomain: 'tread-8f7a2.firebaseapp.com',
  projectId: 'tread-8f7a2',
  storageBucket: 'tread-8f7a2.firebasestorage.app',
  messagingSenderId: '673032645385',
  appId: '1:673032645385:web:4e5144698246ec06fbc1d8',
  measurementId: 'G-QNR558LZXJ',
};

// Retrieve Firebase credentials from env variables, saved app settings, or project defaults
export function getFirebaseConfig() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    measurementId:
      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
  };
}

export function saveFirebaseConfig(config) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

export function getFirebaseAppInstance() {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(config);
}

export function getFirestoreDb() {
  const app = getFirebaseAppInstance();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAuth() {
  const app = getFirebaseAppInstance();
  return app ? getAuth(app) : null;
}

// Test Firebase API connection
export async function testFirebaseConnection() {
  try {
    const db = getFirestoreDb();
    if (!db) {
      return { success: false, message: 'Firebase API key or Project ID is missing.' };
    }

    const testRef = doc(db, 'system_health', 'connection_test');
    await setDoc(testRef, {
      lastChecked: new Date().toISOString(),
      app: 'Tread ERP',
      status: 'active',
    });

    return {
      success: true,
      message: '✓ Successfully connected to Firebase Firestore Cloud API!',
    };
  } catch (error) {
    return {
      success: false,
      message: `Firebase connection failed: ${error.message}`,
    };
  }
}

// Sync user's complete data to Firebase Cloud Firestore
export async function syncUserDataToCloud(username, payload) {
  try {
    const db = getFirestoreDb();
    if (!db) {
      return { success: false, message: 'Firebase is not configured.' };
    }

    const userDocRef = doc(db, 'users_data', username || 'default_user');
    await setDoc(
      userDocRef,
      {
        username,
        updatedAt: new Date().toISOString(),
        invoices: payload.invoices || [],
        customers: payload.customers || [],
        stockItems: payload.stockItems || [],
        purchaseBills: payload.purchaseBills || [],
        company: payload.company || {},
        settings: payload.settings || {},
      },
      { merge: true }
    );

    return {
      success: true,
      message: `✓ Cloud sync complete! Backed up to Firebase for user: ${username}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Cloud sync error: ${error.message}`,
    };
  }
}

// Pull / restore user's data from Firebase Cloud Firestore
export async function fetchUserDataFromCloud(username) {
  try {
    const db = getFirestoreDb();
    if (!db) {
      return { success: false, message: 'Firebase is not configured.' };
    }

    const userDocRef = doc(db, 'users_data', username || 'default_user');
    const snapshot = await getDoc(userDocRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: `No cloud backup found for user "${username}".`,
      };
    }

    return {
      success: true,
      data: snapshot.data(),
      message: `✓ Successfully retrieved data from Firebase Cloud.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch cloud data: ${error.message}`,
    };
  }
}
