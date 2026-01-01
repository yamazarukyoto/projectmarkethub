// Test contract creation API
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testContractCreate() {
    try {
        console.log("Testing contract creation API...");
        
        // Login as test user
        const email = "kenta.yamamoto.mobile@gmail.com";
        const password = "aaaaaa";
        
        console.log("Logging in as:", email);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Logged in successfully. UID:", user.uid);
        
        // Get ID token
        const token = await user.getIdToken();
        console.log("Got ID token (first 50 chars):", token.substring(0, 50) + "...");
        
        // Test data - using the proposal with different worker
        const testData = {
            proposalId: "YVgAzJITR96HKdQ5Ayo6",  // Proposal from yamazarukyoto
            jobId: "GAK8dybqk0ahm7N4ApK0",
            clientId: user.uid,  // QsDYvX60TOaeBQQxPnrPrXDPvqW2
            workerId: "47JXWi71h1eCbjdUqubMMl0dgh53",  // yamazarukyoto
            price: 10000,
            title: "あ"
        };
        
        console.log("\nSending request to API with data:", JSON.stringify(testData, null, 2));
        
        // Call the API - Use Cloud Run direct URL to bypass domain issues
        const response = await fetch("https://projectmarkethub-ga4mbdxvtq-an.a.run.app/api/contracts/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(testData)
        });
        
        console.log("\nResponse status:", response.status);
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log("Response body:", responseText);
        
        try {
            const data = JSON.parse(responseText);
            if (data.error) {
                console.log("\nAPI returned error:", data.error);
            } else {
                console.log("\nContract created successfully!");
                console.log("Contract ID:", data.contractId);
            }
        } catch (e) {
            console.log("Could not parse response as JSON");
        }
        
    } catch (error) {
        console.error("Error:", error.message);
        if (error.code) {
            console.error("Error code:", error.code);
        }
    }
    
    process.exit(0);
}

testContractCreate();
