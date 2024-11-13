// firebaseService.js
import { ref as dbRef, get } from 'firebase/database';
import { db } from '../firebase/init';

export async function getUserData(uid) {
  const ref = dbRef(db, `Users/${uid}`);
  return await get(ref);
}
