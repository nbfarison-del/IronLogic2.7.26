import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';

// Firebase configuration from environment variables
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: env.VITE_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: env.VITE_FIREBASE_APP_ID?.trim(),
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID?.trim()
};

// Initialize Firebase variables
let app;
let auth;
let db;

try {
    // CRITICAL: Check for missing keys to prevent "Blank Screen" crash
    if (!firebaseConfig.apiKey) {
        throw new Error("FIREBASE CONFIG MISSING! Check your Vercel Environment Variables.");
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Modern Firestore Persistence (Replacement for enableMultiTabIndexedDbPersistence)
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });

} catch (error) {
    console.error("FIREBASE INITIALIZATION ERROR:", error);
    // We swallow the error here so the app doesn't crash at the top level.
    // The ErrorBoundary will catch the inevitable failure when components try to use 'auth' or 'db'.
}

export { auth, db };
export default app;
