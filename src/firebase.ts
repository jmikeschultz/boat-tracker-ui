// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


// Firebase configuration from your Firebase web app setup
const firebaseConfig = {
  apiKey: "AIzaSyD7C1yznZjsOz2fg7D2voLVOIQfzaCLP1w",
  authDomain: "boat-crumbs.firebaseapp.com",
  projectId: "boat-crumbs",
  storageBucket: "boat-crumbs.firebasestorage.app",
  messagingSenderId: "954943255016",
  appId: "1:954943255016:web:6528c8968e70cc8e83745d",
  measurementId: "G-QE8P605T5V" // Optional if using Google Analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

const auth = getAuth(app);

export { db, auth };
