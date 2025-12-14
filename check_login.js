const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyD6uAWaLZ6hHgYZpvRrcCKGOZRGWi3ruNU",
  authDomain: "projectmarkethub-db904.firebaseapp.com",
  projectId: "projectmarkethub-db904",
  storageBucket: "projectmarkethub-db904.firebasestorage.app",
  messagingSenderId: "173689610587",
  appId: "1:173689610587:web:ea5e28f0e2e65e6cb43a7e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testLogin() {
  try {
    console.log("Attempting login...");
    const userCredential = await signInWithEmailAndPassword(auth, "kenta.yamamoto.mobile@gmail.com", "aaaaaa");
    console.log("Login successful:", userCredential.user.uid);
  } catch (error) {
    console.error("Login failed:", error.code, error.message);
  }
}

testLogin();
