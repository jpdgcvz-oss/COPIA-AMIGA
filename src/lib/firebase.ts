import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWF46ykUtdX3f_6Qc96C8kaki-yuCUhxQ",
  authDomain: "iconic-node-mwjkk.firebaseapp.com",
  projectId: "iconic-node-mwjkk",
  storageBucket: "iconic-node-mwjkk.firebasestorage.app",
  messagingSenderId: "987477390169",
  appId: "1:987477390169:web:505f42362fc4da4e92d248"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific database ID
const db = initializeFirestore(app, {}, "ai-studio-cpiaamiga-cfe040e8-638a-477b-8b61-1e3eee3b46dd");

// Initialize Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider, signInWithPopup, signOut };
