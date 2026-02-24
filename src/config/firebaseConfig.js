import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

console.log('--- IRONLOGIC HEARTBEAT: v1.7.0 (Feb 24, 09:23) ---');

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-28F6H5KY12" // Emergency Hard-Fallback
};

// Initialize App (Safe Singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore (v1.6.0 Protocol Lock: NO WebSockets)
let db;
try {
    if (!firebaseConfig.apiKey) {
        throw new Error("Missing Firebase API Key");
    }

    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false, // LOCK: Never try to "Upgrade" to WebSockets
        useFetchStreams: false,
        ignoreUndefinedProperties: true // Stability 🦾
    });
    console.log("Firestore: Protocol Lock Active (HTTPS Only)");
} catch (e) {
    // Fallback
    db = getFirestore(app);
    console.warn("Firestore: Fallback instance active", e.message);
}

// Final safety check
if (!db) {
    console.error("CRITICAL: Firestore instance (db) is undefined!");
}

export { auth, db };
export default app;
