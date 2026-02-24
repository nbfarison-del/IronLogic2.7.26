import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

console.log('--- IRONLOGIC HEARTBEAT: v1.8.0 (Feb 24, 12:45) ---');

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-28F6H5KY12"
};

// Export for diagnostic visibility
export const resolvedConfig = { ...firebaseConfig };

// Initialize App (Safe Singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore (v1.8.0 Protocol Lock: NO WebSockets)
let db;
try {
    if (!firebaseConfig.apiKey) {
        throw new Error("Missing Firebase API Key");
    }

    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false,
        useFetchStreams: false,
        ignoreUndefinedProperties: true
    });
    console.log("Firestore: Protocol Lock v1.8.0 (Forced HTTPS)");
} catch (e) {
    db = getFirestore(app);
    console.warn("Firestore: Default instance activated", e.message);
}

// Final safety check
if (!db) {
    console.error("CRITICAL: Firestore instance (db) is undefined!");
}

export { auth, db };
export default app;
