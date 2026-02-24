import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

console.log('--- IRONLOGIC HEARTBEAT: v1.9.0 (Feb 24, 12:56) ---');

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-28F6H5KY12"
};

// Diagnostics for UI
export const SDK_AUTO_DIAGNOSTIC = {
    env_keys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_FIREBASE_')).length,
    fallback_active: !import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    protocol: 'FORCED_LONG_POLLING_V2'
};

// Initialize App (Safe Singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
let db;
try {
    if (!firebaseConfig.apiKey) {
        throw new Error("API Key Missing");
    }

    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false,
        useFetchStreams: false,
        ignoreUndefinedProperties: true
    });
    console.log("Firestore v1.9.0: Connection established with Protocol Lock.");
} catch (e) {
    db = getFirestore(app);
}

export { auth, db };
export default app;
