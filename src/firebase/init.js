import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Import the Realtime Database service
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./config";
import { getAuth } from "firebase/auth";
import { getFunctions } from 'firebase/functions';

const app = initializeApp(firebaseConfig);

// Initialize the Realtime Database and export it
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app);

export { db, storage, auth, functions };