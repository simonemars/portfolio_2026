import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlGkuW8Je7O9v9UbiKPIocMo3XQsspx2k",
  authDomain: "municipalitysoftware.firebaseapp.com",
  projectId: "municipalitysoftware",
  storageBucket: "municipalitysoftware.firebasestorage.app",
  messagingSenderId: "410920607069",
  appId: "1:410920607069:web:c5643f2db09fac18f05cb4",
  measurementId: "G-0Q7T4QQ1M3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app; 