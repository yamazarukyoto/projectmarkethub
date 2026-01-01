import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD6uAWaLZ6hHgYZpvRrcCKGOZRGWi3ruNU",
  authDomain: "projectmarkethub-db904.firebaseapp.com",
  projectId: "projectmarkethub-db904",
  storageBucket: "projectmarkethub-db904.firebasestorage.app",
  messagingSenderId: "173689610587",
  appId: "1:173689610587:web:ea5e28f0e2e65e6cb43a7e",
};

console.log("Firebase Config:", {
  apiKey: firebaseConfig.apiKey ? "Set" : "Not Set",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
});

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { app, auth, db, storage, functions, googleProvider };
