import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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
