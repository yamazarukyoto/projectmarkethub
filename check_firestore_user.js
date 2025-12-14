const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, setDoc, Timestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyD6uAWaLZ6hHgYZpvRrcCKGOZRGWi3ruNU",
  authDomain: "projectmarkethub-db904.firebaseapp.com",
  projectId: "projectmarkethub-db904",
  storageBucket: "projectmarkethub-db904.firebasestorage.app",
  messagingSenderId: "173689610587",
  appId: "1:173689610587:web:ea5e28f0e2e65e6cb43a7e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUser() {
  const uid = "QsDYvX60TOaeBQQxPnrPrXDPvqW2"; // UID from check_login.js
  try {
    console.log(`Checking user document for UID: ${uid}...`);
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("User document exists:", docSnap.data());
    } else {
      console.log("User document does NOT exist.");
      // Try creating it to simulate login flow
      console.log("Attempting to create user document...");
      const userData = {
        uid: uid,
        email: "kenta.yamamoto.mobile@gmail.com",
        displayName: "No Name",
        photoURL: "",
        userType: "both",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        verificationStatus: "unsubmitted",
        stripeOnboardingComplete: false,
        rating: 0,
        reviewCount: 0,
        jobsCompleted: 0,
      };
      // Note: This might fail if rules require authentication, which we don't have here easily without signing in first.
      // But let's see if we can read at least.
    }
  } catch (error) {
    console.error("Firestore operation failed:", error.code, error.message);
  }
}

checkUser();
