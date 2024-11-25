import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from 'firebase/functions';
import { getMessaging, getToken } from "firebase/messaging";
import { firebaseConfig } from "./config";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app);
const messaging = getMessaging(app);

export { db, storage, auth, functions, messaging };