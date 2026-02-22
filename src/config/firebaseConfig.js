import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize App (Safe Singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore (Aggressive Long-Polling + Fallback)
let db;
try {
    if (!firebaseConfig.apiKey) {
        throw new Error("Missing Firebase API Key");
    }

    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        useFetchStreams: false
    });
    console.log("Firestore: Forced Long-Polling Active");
} catch (e) {
    // If initializeFirestore fails (e.g. already initialized), get existing instance
    db = getFirestore(app);
    console.warn("Firestore: Falling back to default instance", e.message);
}

// Final safety check
if (!db) {
    console.error("CRITICAL: Firestore instance (db) is undefined!");
}

export { auth, db };
export default app;
