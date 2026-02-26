import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

console.log('--- IRONLOGIC HEARTBEAT: v2.2.0 (Feb 26, 04:40) ---');

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
    protocol: 'DYNAMIC_SWITCHER_V2.2',
    // Key X-Ray: Show first 4 chars to confirm they aren't blank or mangled
    xray: {
        apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 4)}...` : 'MISSING',
        projectId: firebaseConfig.projectId ? `${firebaseConfig.projectId.substring(0, 4)}...` : 'MISSING'
    }
};

// Initialize App (Safe Singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore with Dynamic Protocol
let db;
export const initFirestoreWithProtocol = (useWebSockets = false) => {
    try {
        const settings = {
            ignoreUndefinedProperties: true
        };

        if (useWebSockets) {
            console.log("Firestore: Using WebSockets (Default)");
        } else {
            console.log("Firestore: Forcing Long-Polling");
            settings.experimentalForceLongPolling = true;
            settings.experimentalAutoDetectLongPolling = false;
            settings.useFetchStreams = false;
        }

        db = initializeFirestore(app, settings);
        return db;
    } catch (e) {
        console.warn("Firestore Init Error:", e);
        return getFirestore(app);
    }
};

// Default Init (Long Polling)
db = initFirestoreWithProtocol(false);

export { auth, db };
export default app;
