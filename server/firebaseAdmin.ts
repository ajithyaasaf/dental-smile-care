import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin with project-only config for development
let adminApp;
if (getApps().length === 0) {
  // Use project ID from environment - avoid service account for development
  adminApp = initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
} else {
  adminApp = getApps()[0];
}

export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);
export { adminApp };