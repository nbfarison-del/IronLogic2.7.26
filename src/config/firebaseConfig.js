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
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-28F6H5KY12"
};

// Initialize App (Safe Singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore with Protocol Safety
export const initFirestoreWithProtocol = (useWebSockets = false) => {
    try {
        const settings = {
            ignoreUndefinedProperties: true
        };

        if (useWebSockets) {
            // Default WebSockets (Standard)
        } else {
            // Long-Polling fallback for restricted networks
            settings.experimentalForceLongPolling = true;
            settings.experimentalAutoDetectLongPolling = false;
            settings.useFetchStreams = false;
        }

        return initializeFirestore(app, settings);
    } catch (e) {
        return getFirestore(app);
    }
};

// Default to Long-Polling as it proved most robust for the user's network
const db = initFirestoreWithProtocol(false);

export { auth, db };
export default app;
