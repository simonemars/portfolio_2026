import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// For now, use placeholder config - user can add real creds later
const cfg = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  appId: process.env.FIREBASE_APP_ID || '',
};

// Only initialize if we have required config
const hasConfig = cfg.apiKey && cfg.projectId && cfg.appId;

let app = null;
if (hasConfig) {
  app = getApps().length ? getApps()[0] : initializeApp(cfg);
}

export const db = hasConfig ? getFirestore(app) : null;
export const hasFirebase = hasConfig;


