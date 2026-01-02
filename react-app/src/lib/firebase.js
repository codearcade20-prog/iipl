import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8oucUvmwh4IjyqkmFFFyE2HGq8izpYjo",
  authDomain: "iipl-4308b.firebaseapp.com",
  projectId: "iipl-4308b",
  storageBucket: "iipl-4308b.firebasestorage.app",
  messagingSenderId: "755804953396",
  appId: "1:755804953396:web:981d46444bc896a8efe361"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to bypass network restrictions
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { db };
