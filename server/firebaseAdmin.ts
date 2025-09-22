import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin with development-friendly config
let adminApp;
if (getApps().length === 0) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  if (isDevelopment && projectId) {
    // For development in Replit/local environments without service account
    adminApp = initializeApp({
      projectId: projectId,
      // Use emulator settings for development
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`
    });
    
    // Configure Firestore to use emulator if available
    const db = getFirestore(adminApp);
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    if (emulatorHost) {
      // Connect to local emulator
      const [host, port] = emulatorHost.split(':');
      db.settings({
        host: `${host}:${port}`,
        ssl: false
      });
      console.log(`🔥 Firestore connected to emulator at ${emulatorHost}`);
    } else {
      console.log('🔥 Firestore connecting to production (no emulator detected)');
    }
  } else {
    // Production or when proper credentials are available
    adminApp = initializeApp({
      projectId: projectId,
    });
  }
} else {
  adminApp = getApps()[0];
}

export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);
export { adminApp };